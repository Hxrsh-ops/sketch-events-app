import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8.5 w-full rounded-lg border border-[#E5E7E9] bg-white px-3 py-1.5 text-xs text-[#34383D] placeholder:text-[#A4A9AF] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#858B93] focus-visible:border-[#858B93] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
