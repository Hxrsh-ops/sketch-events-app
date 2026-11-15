"use client";

import Image from "next/image";
import Link from "next/link";
import { useStealthClickTrigger } from "./stealth-gate-trigger";

export function PublicHeaderLogo() {
  const { onSecretClick } = useStealthClickTrigger(5, 2000);

  return (
    <Link href="/" className="flex items-center gap-3 select-none" onClick={onSecretClick}>
      <div className="relative h-8 w-8 rounded-xl overflow-hidden bg-[#F0F1F2] dark:bg-[#22262B] p-1 border border-[#E5E7EA] dark:border-[#30353A] flex items-center justify-center shrink-0 shadow-xs cursor-pointer active:scale-95 transition-transform">
        <Image
          src="/sketch-logo.png"
          alt="SKETCH Logo"
          width={28}
          height={28}
          className="object-contain h-full w-full dark:invert pointer-events-none"
          priority
        />
      </div>
      <span className="font-bold text-base tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
        SketchHUB
      </span>
    </Link>
  );
}
