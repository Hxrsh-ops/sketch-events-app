import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]",
        secondary:
          "border-transparent bg-[#F0F1F2] dark:bg-[#22262A] text-[#17191C] dark:text-[#F1F2F3]",
        destructive:
          "border-transparent bg-[#F0F1F2] dark:bg-[#2A2F35] text-[#17191C] dark:text-[#F1F2F3] font-semibold",
        outline:
          "border border-[#E5E7EA] dark:border-[#30353A] text-[#656B73] dark:text-[#A6ADB5] bg-white dark:bg-[#1B1E21]",
        success:
          "border-transparent bg-[#EAECEF] dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3] font-semibold",
        warning:
          "border-transparent bg-[#F0F1F2] dark:bg-[#22262A] text-[#17191C] dark:text-[#F1F2F3]",
        info:
          "border-transparent bg-[#F0F1F2] dark:bg-[#22262A] text-[#17191C] dark:text-[#F1F2F3]",
        brandSoft:
          "border-transparent bg-[#EAECEF] dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3]",
        forestSoft:
          "border-transparent bg-[#EAECEF] dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3]",
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
