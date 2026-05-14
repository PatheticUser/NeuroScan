import cv2
import numpy as np
import onnxruntime as ort
from typing import Tuple, List, Dict, Any

class BrainTumorPipeline:
    CLASSES = ['NO_tumor', 'glioma', 'meningioma', 'pituitary', 'space-occupying lesion-']

    def __init__(self, model_path: str):
        self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape
        # Default YOLO/SAM shape fallback
        self.img_size = (self.input_shape[3], self.input_shape[2]) if isinstance(self.input_shape[2], int) else (640, 640)
        self.output_names = [o.name for o in self.session.get_outputs()]

    def load_image(self, image_bytes: bytes) -> np.ndarray:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image provided.")
        return img

    def resize(self, img: np.ndarray) -> Tuple[np.ndarray, float]:
        h, w = img.shape[:2]
        r = min(self.img_size[0] / w, self.img_size[1] / h)
        new_w, new_h = int(w * r), int(h * r)
        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        canvas = np.full((self.img_size[1], self.img_size[0], 3), 114, dtype=np.uint8)
        canvas[:new_h, :new_w, :] = resized
        return canvas, r

    def normalize(self, img: np.ndarray) -> np.ndarray:
        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))
        img = np.expand_dims(img, axis=0)
        return img

    def execute(self, tensor: np.ndarray) -> List[np.ndarray]:
        return self.session.run(self.output_names, {self.input_name: tensor})

    def postprocess(self, outputs: List[np.ndarray], ratio: float, conf_thresh: float = 0.5, iou_thresh: float = 0.45) -> np.ndarray:
        boxes_scores = outputs[0][0] if len(outputs) > 0 else np.array([])

        if boxes_scores.size > 0 and len(boxes_scores.shape) > 1:
            # Validate output shape: expect [x1, y1, x2, y2, confidence, class_id, ...]
            if boxes_scores.shape[1] < 6:
                raise ValueError(f"Unexpected model output shape: {boxes_scores.shape}. Expected at least 6 columns (x1, y1, x2, y2, confidence, class_id).")

            boxes_scores[:, :4] /= ratio
            confs = boxes_scores[:, 4]
            valid_idx = confs >= conf_thresh
            boxes_scores = boxes_scores[valid_idx]

            if len(boxes_scores) > 0:
                boxes = boxes_scores[:, :4]
                scores = boxes_scores[:, 4]
                cv_boxes = [[float(b[0]), float(b[1]), float(b[2] - b[0]), float(b[3] - b[1])] for b in boxes]
                indices = cv2.dnn.NMSBoxes(cv_boxes, scores.tolist(), conf_thresh, iou_thresh)
                if len(indices) > 0:
                    boxes_scores = boxes_scores[indices.flatten()]
                else:
                    boxes_scores = np.array([])

        return boxes_scores

    def format_output(self, img: np.ndarray, boxes_scores: np.ndarray) -> Dict[str, Any]:
        predictions = []
        if boxes_scores.size > 0 and len(boxes_scores.shape) > 1:
            for box_score in boxes_scores:
                x1, y1, x2, y2 = box_score[:4].tolist()
                conf = float(box_score[4])
                cls_id = int(box_score[5])
                cls_name = self.CLASSES[cls_id] if cls_id < len(self.CLASSES) else str(cls_id)
                predictions.append({
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": round(conf, 4),
                    "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)]
                })
                
        return {
            "status": "success",
            "tumor_detected": len(predictions) > 0,
            "predictions": predictions
        }

    def run(self, image_bytes: bytes) -> Dict[str, Any]:
        img = self.load_image(image_bytes)
        resized_img, ratio = self.resize(img)
        tensor = self.normalize(resized_img)
        outputs = self.execute(tensor)
        boxes_scores = self.postprocess(outputs, ratio)
        return self.format_output(img, boxes_scores)
