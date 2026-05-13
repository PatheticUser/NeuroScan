export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Prediction {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface ApiResponse {
  status: "success" | "error";
  tumor_detected: boolean;
  predictions: Prediction[];
}

export type AppState = "idle" | "loading" | "success" | "error";

export const CLASS_COLORS: Record<string, string> = {
  NO_tumor: "#22c55e",
  glioma: "#ef4444",
  meningioma: "#f59e0b",
  pituitary: "#3b82f6",
  "space-occupying lesion-": "#8b5cf6",
};

export const CLASS_COLORS_RGB: Record<string, [number, number, number]> = {
  NO_tumor: [34, 197, 94],
  glioma: [239, 68, 68],
  meningioma: [245, 158, 11],
  pituitary: [59, 130, 246],
  "space-occupying lesion-": [139, 92, 246],
};
