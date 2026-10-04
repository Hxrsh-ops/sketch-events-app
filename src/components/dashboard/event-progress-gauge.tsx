export function EventProgressGauge() {
  return (
    <div className="flex flex-col justify-between rounded-[22px] border border-[#EAE8E3] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#191A1C]">
          Event Progress
        </h3>
        <span className="text-[11px] font-medium text-[#929398]">Term 2026</span>
      </div>

      {/* Semicircular Arc Gauge matching Donezo */}
      <div className="relative mt-4 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center h-40 w-64 overflow-hidden">
          <svg className="w-64 h-32" viewBox="0 0 200 100">
            {/* Background Arch (Pending / Gray) */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#E8E6E1"
              strokeWidth="24"
              strokeLinecap="round"
            />
            {/* In Progress Arch (Medium Green) */}
            <path
              d="M 20 100 A 80 80 0 0 1 150 40"
              fill="none"
              stroke="#3A7D5C"
              strokeWidth="24"
              strokeLinecap="round"
            />
            {/* Completed Arch (Deep Forest Green) */}
            <path
              d="M 20 100 A 80 80 0 0 1 95 21"
              fill="none"
              stroke="#1B4332"
              strokeWidth="24"
              strokeLinecap="round"
            />
          </svg>

          {/* Centered Value */}
          <div className="absolute bottom-2 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-[#191A1C] leading-none">
              41%
            </span>
            <span className="text-[11px] font-medium text-[#65666A] mt-1">
              Events Completed
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 border-t border-[#F5F4F1] pt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1B4332]" />
          <span className="text-[#65666A]">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#3A7D5C]" />
          <span className="text-[#65666A]">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D8D5CF]" />
          <span className="text-[#65666A]">Pending</span>
        </div>
      </div>
    </div>
  );
}
