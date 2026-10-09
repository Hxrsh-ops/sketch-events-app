"use client";

interface AnalyticsBar {
  day: string;
  registrations: number;
  heightPercent: number;
  isPeak?: boolean;
}

const BARS_DATA: AnalyticsBar[] = [
  { day: "SUN", registrations: 65, heightPercent: 65 },
  { day: "MON", registrations: 85, heightPercent: 80 },
  { day: "TUE", registrations: 50, heightPercent: 55 },
  { day: "WED", registrations: 85, heightPercent: 80 },
  { day: "THU", registrations: 120, heightPercent: 95, isPeak: true },
  { day: "FRI", registrations: 40, heightPercent: 45 },
  { day: "SAT", registrations: 70, heightPercent: 70 },
];

export function RegistrationAnalytics() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[#17191C]">
          Registration Analytics
        </h3>
      </div>

      {/* Donezo Monochrome Pill Bar Chart */}
      <div className="mt-8 flex h-52 items-end justify-between gap-3 px-2 sm:px-4">
        {BARS_DATA.map((bar, idx) => (
          <div key={idx} className="flex flex-1 flex-col items-center gap-2.5">
            <div className="relative flex h-40 w-full max-w-[36px] items-end justify-center">
              {/* Pill Shaped Bar */}
              <div
                style={{ height: `${bar.heightPercent}%` }}
                className={`w-full rounded-full transition-all duration-500 ${
                  bar.isPeak
                    ? "bg-[#25292F] shadow-sm"
                    : "bg-[#989EA7]/80 hover:bg-[#7B828B]"
                }`}
                title={`${bar.day}: ${bar.registrations} registrations`}
              />
            </div>
            {/* Day Label */}
            <span className="text-[11px] font-bold tracking-wider text-[#8A9098]">
              {bar.day}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
