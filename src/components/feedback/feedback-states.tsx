import React from "react";
import { AlertCircle, FolderOpen, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = FolderOpen,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl border border-dashed border-[#CBD0D6] dark:border-[#353B42] bg-[#FAFAFA]/50 dark:bg-[#151719]/50",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAECEF] dark:bg-[#25292F] text-[#656B73] dark:text-[#A6ADB5] mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-[#17191C] dark:text-[#F1F2F3]">{title}</h3>
      <p className="mt-1 text-xs text-[#8A9098] dark:text-[#7D858F] max-w-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="mt-4 rounded-xl text-xs font-semibold"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Unable to load data",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-[#DC2626]/20 bg-[#FEF2F2]/60 dark:bg-[#450A0A]/20",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEE2E2] dark:bg-[#7F1D1D]/40 text-[#DC2626] dark:text-[#F87171] mb-3">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3]">{title}</h3>
      <p className="mt-1 text-xs text-[#B91C1C] dark:text-[#FCA5A5] max-w-sm leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-4 rounded-xl text-xs font-semibold gap-1.5 border-[#DC2626]/30 hover:bg-[#FEE2E2] dark:hover:bg-[#7F1D1D]/40"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Operation</span>
        </Button>
      )}
    </div>
  );
}
