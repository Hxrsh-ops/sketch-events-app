import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#8F2635] text-white",
        secondary:
          "border-transparent bg-[#EFEEEA] text-[#191A1C]",
        destructive:
          "border-transparent bg-[#FCEBED] text-[#B83A43]",
        outline:
          "border border-[#E8E6E1] text-[#65666A]",
        success:
          "border-transparent bg-[#E8F4ED] text-[#237A58]",
        warning:
          "border-transparent bg-[#FBF2DF] text-[#A66B18]",
        info:
          "border-transparent bg-[#EAF0F8] text-[#4B6D9B]",
        brandSoft:
          "border-transparent bg-[#F7E9EB] text-[#8F2635]",
        forestSoft:
          "border-transparent bg-[#E8F4ED] text-[#1B4332]",
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
