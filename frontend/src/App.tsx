import { useState, useCallback, useRef, useEffect } from "react";
import Hero from "./components/Hero";
import ImageUpload from "./components/ImageUpload";
import ResultDisplay from "./components/ResultDisplay";
import HowItWorks from "./components/HowItWorks";
import Footer from "./components/Footer";
import type { AppState, ApiResponse, Prediction } from "./types";

const API_BASE = "/api";

export default function App() {
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [appState, setAppState] = useState<AppState>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [tumorDetected, setTumorDetected] = useState(false);
  const prevUrlRef = useRef<string | null>(null);
  const analyzerRef = useRef<HTMLDivElement>(null);

  // Revoke previous object URL on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, []);

  const handleGetStarted = useCallback(() => {
    setShowAnalyzer(true);
    requestAnimationFrame(() => {
      analyzerRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const handleAnalyzeAnother = useCallback(() => {
    // Reset results but stay in analyzer view
    setAppState("idle");
    setImageUrl(null);
    setPredictions([]);
    setTumorDetected(false);
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    requestAnimationFrame(() => {
      analyzerRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const handleBackToHome = useCallback(() => {
    setShowAnalyzer(false);
    setAppState("idle");
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    setImageUrl(null);
    setPredictions([]);
    setTumorDetected(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleImageSelected = useCallback(async (file: File) => {
    setAppState("loading");

    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
    }

    const localUrl = URL.createObjectURL(file);
    prevUrlRef.current = localUrl;
    setImageUrl(localUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setPredictions(data.predictions);
      setTumorDetected(data.tumor_detected);
      setAppState("success");
    } catch (err) {
      console.error("Prediction error:", err);
      setAppState("error");
      URL.revokeObjectURL(localUrl);
      prevUrlRef.current = null;
      setImageUrl(null);
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* ===== LANDING PAGE VIEW ===== */}
      <div
        className={
          showAnalyzer
            ? "hidden"
            : "animate-fade-in"
        }
      >
        <Hero onGetStarted={handleGetStarted} />
        <HowItWorks onGetStarted={handleGetStarted} />
        <Footer />
      </div>

      {/* ===== ANALYZER VIEW ===== */}
      {showAnalyzer && (
        <div ref={analyzerRef} className="animate-slide-up">
          {/* Top nav bar */}
          <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <button
                onClick={handleBackToHome}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span className="font-medium text-sm">Back</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" d="M12 4v16M4 12h16" />
                  </svg>
                </div>
                <span className="font-semibold text-slate-800 text-sm">NeuroScan</span>
              </div>

              {/* Spacer for alignment */}
              <div className="w-16" />
            </div>
          </nav>

          {/* Main analyzer content */}
          <main>
            <ImageUpload onImageSelected={handleImageSelected} state={appState} />

            {appState === "success" && imageUrl && (
              <ResultDisplay
                imageUrl={imageUrl}
                predictions={predictions}
                tumorDetected={tumorDetected}
                onAnalyzeAnother={handleAnalyzeAnother}
                onBackHome={handleBackToHome}
              />
            )}
          </main>

          <Footer />
        </div>
      )}
    </div>
  );
}
