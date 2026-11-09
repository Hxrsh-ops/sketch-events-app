import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#858B93] disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#17191C] text-white border border-[#17191C] hover:bg-[#25292F] active:bg-black shadow-xs",
        charcoal:
          "bg-[#17191C] text-white border border-[#17191C] hover:bg-[#25292F] active:bg-black shadow-xs",
        outline:
          "border border-[#E5E7E9] bg-white text-[#34383D] hover:bg-[#F6F7F8] hover:border-[#D9DCE0] hover:text-[#17191C] shadow-xs",
        secondary:
          "bg-[#F6F7F8] text-[#34383D] border border-[#E5E7E9] hover:bg-[#EAECEF] hover:text-[#17191C]",
        ghost:
          "text-[#777E86] hover:bg-[#F6F7F8] hover:text-[#17191C]",
        destructive:
          "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 shadow-xs",
        link:
          "text-[#17191C] underline-offset-4 hover:underline",
        pillOutlineWhite:
          "border border-[#E5E7E9] bg-white text-[#34383D] hover:bg-[#F6F7F8]",
        forest:
          "bg-[#17191C] text-white border border-[#17191C] hover:bg-[#25292F]",
        soft:
          "bg-[#F6F7F8] text-[#34383D] border border-[#E5E7E9] hover:bg-[#EAECEF]",
      },
      size: {
        default: "h-8.5 px-3.5 py-1.5",
        sm: "h-7.5 px-2.5 text-[11px]",
        lg: "h-10 px-5 text-sm font-medium",
        icon: "h-8.5 w-8.5",
        "icon-sm": "h-7.5 w-7.5",
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
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), loading && "cursor-wait opacity-70")}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#777E86]" />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
