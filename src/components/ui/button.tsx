import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#25292F] text-white shadow-sm hover:bg-[#17191C] active:bg-[#0D0E10]",
        charcoal:
          "bg-[#25292F] text-white shadow-sm hover:bg-[#17191C] active:bg-[#0D0E10]",
        outline:
          "border border-[#E5E7EA] bg-white text-[#17191C] hover:bg-[#F4F5F6] hover:border-[#D2D6DC]",
        secondary:
          "bg-[#F0F1F2] text-[#17191C] hover:bg-[#E4E6E9]",
        ghost:
          "text-[#656B73] hover:bg-[#EAECEF] hover:text-[#17191C]",
        link:
          "text-[#17191C] underline-offset-4 hover:underline",
        pillOutlineWhite:
          "border border-white/40 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm",
        forest:
          "bg-[#25292F] text-white shadow-sm hover:bg-[#17191C]", // alias for backwards compatibility
        soft:
          "bg-[#F0F1F2] text-[#17191C] hover:bg-[#E4E6E9]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-[11px]",
        lg: "h-11 px-6 text-sm font-semibold",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
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
