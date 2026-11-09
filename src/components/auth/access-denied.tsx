import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminRole } from "@/types";

interface AccessDeniedProps {
  currentRole?: AdminRole | null;
  requiredRoles?: AdminRole[];
  moduleName?: string;
}

export function AccessDenied({
  currentRole,
  requiredRoles,
  moduleName = "this module",
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="max-w-md w-full rounded-2xl border border-[#E5E7E9] dark:border-[#30353A] bg-white dark:bg-[#181B1E] p-8 shadow-sm space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F4F5F6] dark:bg-[#202428] text-[#17191C] dark:text-[#F1F2F3] border border-[#E5E7EA] dark:border-[#30353A]">
          <Lock className="h-6 w-6 stroke-[2.5]" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-xl font-bold text-[#17191C] dark:text-[#F1F2F3]">
              Access Restricted
            </h2>
            {currentRole && (
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {currentRole.replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#656B73] dark:text-[#8A9098] leading-relaxed">
            Your current administrator account does not possess the required authorization to view or manage {moduleName}.
          </p>
          {requiredRoles && requiredRoles.length > 0 && (
            <div className="pt-1 text-[11px] text-[#8A9098]">
              Authorized roles:{" "}
              <strong className="text-[#34383D] dark:text-[#E8EAED]">
                {requiredRoles.map((r) => r.replace("_", " ")).join(", ")}
              </strong>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link href="/">
            <Button
              variant="charcoal"
              size="sm"
              className="rounded-full text-xs font-semibold px-5"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              <span>Return to Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
