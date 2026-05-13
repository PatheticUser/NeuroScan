import { useCallback, useRef, useState } from "react";
import type { AppState } from "../types";

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  state: AppState;
}

export default function ImageUpload({ onImageSelected, state }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith("image/")) {
        onImageSelected(files[0]);
      }
    },
    [onImageSelected]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageSelected(files[0]);
    }
    // Reset so the same file can be uploaded again
    e.target.value = "";
  };

  const isLoading = state === "loading";

  return (
    <section id="upload" className="py-16 md:py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            Upload Your MRI Scan
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Drag and drop your medical image or click to browse.
            Supported formats: JPEG, PNG, DICOM.
          </p>
        </div>

        <div
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={isLoading ? undefined : handleClick}
          className={`
            relative group cursor-pointer rounded-2xl border-2 border-dashed p-12 md:p-16
            transition-all duration-300 ease-out
            ${isDragging
              ? "border-blue-500 bg-blue-50/80 scale-[1.02]"
              : "border-slate-300 hover:border-blue-400 bg-white/60 hover:bg-blue-50/40"
            }
            ${isLoading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
          />

          <div className="flex flex-col items-center gap-4">
            {isLoading ? (
              <>
                <div className="w-16 h-16 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
                </div>
                <p className="text-lg font-medium text-blue-600">Analyzing scan...</p>
                <p className="text-sm text-slate-400">This may take a few seconds</p>
              </>
            ) : (
              <>
                <div className={`
                  w-16 h-16 rounded-2xl flex items-center justify-center
                  transition-all duration-300
                  ${isDragging
                    ? "bg-blue-100 scale-110"
                    : "bg-blue-50 group-hover:bg-blue-100"
                  }
                `}>
                  <svg
                    className={`w-8 h-8 transition-colors duration-300 ${
                      isDragging ? "text-blue-600" : "text-blue-500"
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-slate-700">
                    {isDragging ? "Drop your image here" : "Drag & drop your MRI scan"}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    or click to browse files
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-3 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">
                    JPEG
                  </span>
                  <span className="px-3 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">
                    PNG
                  </span>
                  <span className="px-3 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full">
                    JPG
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {state === "error" && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-slide-up">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>Failed to analyze the image. Please try again with a different image.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
