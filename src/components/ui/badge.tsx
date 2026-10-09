import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#25292F] text-white",
        secondary:
          "border-transparent bg-[#F0F1F2] text-[#17191C]",
        destructive:
          "border-transparent bg-[#F0F1F2] text-[#17191C] font-semibold",
        outline:
          "border border-[#E5E7EA] text-[#656B73] bg-white",
        success:
          "border-transparent bg-[#EAECEF] text-[#17191C] font-semibold",
        warning:
          "border-transparent bg-[#F0F1F2] text-[#17191C]",
        info:
          "border-transparent bg-[#F0F1F2] text-[#17191C]",
        brandSoft:
          "border-transparent bg-[#EAECEF] text-[#17191C]",
        forestSoft:
          "border-transparent bg-[#EAECEF] text-[#17191C]",
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
