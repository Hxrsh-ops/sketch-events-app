import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25292F] dark:focus-visible:ring-[#E8EAED] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#111315] disabled:pointer-events-none disabled:opacity-50 active:translate-y-[0.5px] motion-reduce:transition-none motion-reduce:transform-none select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-sm hover:bg-[#17191C] dark:hover:bg-white active:bg-[#0D0E10]",
        charcoal:
          "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-sm hover:bg-[#17191C] dark:hover:bg-white active:bg-[#0D0E10]",
        outline:
          "border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#25292F] hover:border-[#CBD0D6] dark:hover:border-[#4A515A]",
        secondary:
          "bg-[#F0F1F2] dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#E4E6E9] dark:hover:bg-[#30353A]",
        ghost:
          "text-[#656B73] dark:text-[#A6ADB5] hover:bg-[#EAECEF] dark:hover:bg-[#25292F] hover:text-[#17191C] dark:hover:text-[#F1F2F3]",
        destructive:
          "border border-[#8A9098]/30 dark:border-[#7D858F]/30 bg-transparent text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#17191C] hover:text-white dark:hover:bg-[#E8EAED] dark:hover:text-[#111315] hover:border-transparent",
        link:
          "text-[#17191C] dark:text-[#F1F2F3] underline-offset-4 hover:underline",
        pillOutlineWhite:
          "border border-white/40 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm",
        forest:
          "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-sm hover:bg-[#17191C]", // alias for backwards compatibility
        soft:
          "bg-[#F0F1F2] dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#E4E6E9] dark:hover:bg-[#30353A]",
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
