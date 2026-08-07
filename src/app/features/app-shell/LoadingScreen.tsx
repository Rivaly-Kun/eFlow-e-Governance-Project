export function LoadingScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F5F6F8]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0085FF] to-[#0066CC] flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
          <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
            <path d="M20 4L6 12v10c0 8.5 6 14.5 14 18 8-3.5 14-9.5 14-18V12L20 4z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" />
            <text x="20" y="24" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Lexend, sans-serif">eF</text>
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-neutral-300 border-t-[#0085FF] rounded-full animate-spin" />
          <span className="text-[13px] font-['Lexend:Regular',_sans-serif] text-[#676879]">Loading eFlow...</span>
        </div>
      </div>
    </div>
  );
}
