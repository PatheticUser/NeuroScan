import { useEffect, useRef, useState } from "react";
import type { Prediction } from "../types";
import { CLASS_COLORS, CLASS_COLORS_RGB } from "../types";

interface ResultDisplayProps {
  imageUrl: string;
  predictions: Prediction[];
  tumorDetected: boolean;
  onAnalyzeAnother?: () => void;
  onBackHome?: () => void;
}

function PredictionCard({ prediction, index }: { prediction: Prediction; index: number }) {
  const color = CLASS_COLORS[prediction.class_name] || "#8b5cf6";
  const confidencePercent = Math.round(prediction.confidence * 100);

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all duration-200 animate-slide-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-slate-800 text-sm">
            {prediction.class_name.replace(/_/g, " ").replace(/-/g, " ")}
          </span>
        </div>
        <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">Confidence</span>
          <span className="font-semibold" style={{ color }}>
            {confidencePercent}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${confidencePercent}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      {/* Bounding box coordinates */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 rounded-lg p-2">
          <span className="text-slate-400">X₁</span>
          <span className="ml-1 font-mono text-slate-700">{Math.round(prediction.bbox[0])}</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <span className="text-slate-400">Y₁</span>
          <span className="ml-1 font-mono text-slate-700">{Math.round(prediction.bbox[1])}</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <span className="text-slate-400">X₂</span>
          <span className="ml-1 font-mono text-slate-700">{Math.round(prediction.bbox[2])}</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <span className="text-slate-400">Y₂</span>
          <span className="ml-1 font-mono text-slate-700">{Math.round(prediction.bbox[3])}</span>
        </div>
      </div>
    </div>
  );
}

function AnnotatedImage({ imageUrl, predictions }: { imageUrl: string; predictions: Prediction[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    if (!imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear any previous drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas to match the rendered image size
    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Draw the image on canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Scale factor from original image to displayed size
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    // Draw bounding boxes and labels
    predictions.forEach((pred) => {
      const [x1, y1, x2, y2] = pred.bbox;
      const color = CLASS_COLORS_RGB[pred.class_name] || [139, 92, 246];
      const [r, g, b] = color;

      // Scaled coordinates
      const sx1 = x1 * scaleX;
      const sy1 = y1 * scaleY;
      const sx2 = x2 * scaleX;
      const sy2 = y2 * scaleY;
      const boxW = sx2 - sx1;
      const boxH = sy2 - sy1;

      // Draw bounding box
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(sx1, sy1, boxW, boxH);

      // Draw corner markers for a polished look
      const cornerLen = Math.min(15, Math.min(boxW, boxH) * 0.3);
      ctx.lineWidth = 4;

      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(sx1, sy1 + cornerLen);
      ctx.lineTo(sx1, sy1);
      ctx.lineTo(sx1 + cornerLen, sy1);
      ctx.stroke();

      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(sx2 - cornerLen, sy1);
      ctx.lineTo(sx2, sy1);
      ctx.lineTo(sx2, sy1 + cornerLen);
      ctx.stroke();

      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(sx1, sy2 - cornerLen);
      ctx.lineTo(sx1, sy2);
      ctx.lineTo(sx1 + cornerLen, sy2);
      ctx.stroke();

      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(sx2 - cornerLen, sy2);
      ctx.lineTo(sx2, sy2);
      ctx.lineTo(sx2, sy2 - cornerLen);
      ctx.stroke();

      // Label background
      const label = `${pred.class_name.replace(/_/g, " ")} ${Math.round(pred.confidence * 100)}%`;
      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      const textWidth = ctx.measureText(label).width;
      const labelHeight = 24;
      const labelY = sy1 > labelHeight + 4 ? sy1 - labelHeight - 4 : sy1 + 4;

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      ctx.beginPath();
      ctx.roundRect(sx1, labelY, textWidth + 12, labelHeight, 4);
      ctx.fill();

      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, sx1 + 6, labelY + 16);
    });
  }, [imageUrl, predictions, imageLoaded]);

  return (
    <div className="relative w-full">
      {/* Hidden image for loading */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="MRI Scan"
        className="w-full h-auto rounded-lg invisible"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(false)}
      />
      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full rounded-lg"
      />
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
          <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default function ResultDisplay({ imageUrl, predictions, tumorDetected, onAnalyzeAnother, onBackHome }: ResultDisplayProps) {
  return (
    <section className="py-16 md:py-24 px-4 bg-white/50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
            style={{
              backgroundColor: tumorDetected ? "rgb(254 242 242)" : "rgb(240 253 244)",
              color: tumorDetected ? "#dc2626" : "#16a34a",
              border: `1px solid ${tumorDetected ? "rgb(254 202 202)" : "rgb(187 247 208)"}`,
            }}
          >
            <span className={`w-2 h-2 rounded-full ${tumorDetected ? "bg-red-500" : "bg-green-500"}`} />
            {tumorDetected
              ? `Tumor Detected — ${predictions.length} finding${predictions.length > 1 ? "s" : ""}`
              : "No Tumor Detected"
            }
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
            Analysis Results
          </h2>
          <p className="text-slate-500">
            Review the detection results below. Hover over predictions for details.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* Image with annotations */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm animate-slide-up delay-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-700">Annotated Scan</h3>
              <span className="text-xs text-slate-400">{predictions.length} object{predictions.length !== 1 ? "s" : ""} detected</span>
            </div>
            <AnnotatedImage
              imageUrl={imageUrl}
              predictions={predictions}
            />
          </div>

          {/* Prediction cards */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between animate-slide-up delay-200">
              <h3 className="text-sm font-medium text-slate-700">Detections</h3>
              <span className="text-xs text-slate-400">{predictions.length} result{predictions.length !== 1 ? "s" : ""}</span>
            </div>

            {predictions.length > 0 ? (
              predictions.map((pred, i) => (
                <PredictionCard key={i} prediction={pred} index={i} />
              ))
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center animate-slide-up delay-200">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-700 font-medium">No abnormalities detected</p>
                <p className="text-slate-400 text-sm mt-1">The scan appears to be normal</p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4 mt-10 animate-fade-in delay-500">
          <button
            onClick={onAnalyzeAnother}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Analyze Another Scan
          </button>
          <button
            onClick={onBackHome}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    </section>
  );
}
