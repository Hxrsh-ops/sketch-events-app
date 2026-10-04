import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#8F2635] text-white shadow-sm hover:bg-[#76202D] active:bg-[#641B27]",
        destructive:
          "bg-[#B83A43] text-white shadow-sm hover:bg-[#A32F37]",
        outline:
          "border border-[#E8E6E1] bg-white text-[#191A1C] hover:bg-[#F9F8F6] hover:border-[#D8D5CF]",
        secondary:
          "bg-[#EFEEEA] text-[#191A1C] hover:bg-[#E4E2DC]",
        ghost:
          "text-[#65666A] hover:bg-[#F0EFEB] hover:text-[#191A1C]",
        link:
          "text-[#8F2635] underline-offset-4 hover:underline",
        forest:
          "bg-[#1B4332] text-white shadow-sm hover:bg-[#143728]",
        soft:
          "bg-[#F7E9EB] text-[#8F2635] hover:bg-[#F2D7DB]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-base font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
