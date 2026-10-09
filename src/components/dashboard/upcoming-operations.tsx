import Link from "next/link";
import { Button } from "@/components/ui/button";

export function UpcomingOperations() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[24px] border border-[#E5E7EA] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div>
        <span className="text-xs font-semibold text-[#8A9098]">
          Reminders
        </span>

        <div className="mt-6">
          <h3 className="text-xl font-bold text-[#17191C] leading-snug">
            Design Sprint Check-in
          </h3>
          <p className="mt-2 text-xs text-[#8A9098]">
            2:00PM to 3:00PM
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/attendance">
          <Button
            variant="charcoal"
            className="w-full h-11 rounded-full text-xs font-semibold shadow-sm"
          >
            Open Check-in Desk
          </Button>
        </Link>
      </div>
    </div>
  );
}
