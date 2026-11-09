import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border-[#E5E7E9] bg-[#F6F7F8] text-[#17191C] font-semibold",
        secondary:
          "border-[#E5E7E9] bg-[#F6F7F8] text-[#777E86]",
        destructive:
          "border-rose-200/80 bg-rose-50/80 text-rose-700",
        outline:
          "border-[#E5E7E9] text-[#777E86] bg-white",
        success:
          "border-emerald-200/80 bg-emerald-50/80 text-emerald-800",
        warning:
          "border-amber-200/80 bg-amber-50/80 text-amber-800",
        info:
          "border-slate-200/80 bg-slate-50/80 text-slate-700",
        brandSoft:
          "border-[#E5E7E9] bg-[#F6F7F8] text-[#17191C]",
        forestSoft:
          "border-[#E5E7E9] bg-[#F6F7F8] text-[#17191C]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
