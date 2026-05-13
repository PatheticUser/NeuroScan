export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" d="M12 4v16M4 12h16" />
              </svg>
            </div>
            <span className="font-semibold text-slate-700">NeuroScan</span>
          </div>
          <p className="text-sm text-slate-400">
            Built with FastAPI, React, and YOLO. For research and educational purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
