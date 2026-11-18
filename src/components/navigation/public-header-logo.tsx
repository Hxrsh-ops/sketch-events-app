"use client";

import Image from "next/image";
import Link from "next/link";
import { useStealthClickTrigger } from "./stealth-gate-trigger";

export function PublicHeaderLogo() {
  const { onSecretClick } = useStealthClickTrigger(5, 2000);

  return (
    <Link href="/" className="flex items-center gap-2.5 select-none group" onClick={onSecretClick}>
      <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-white p-1.5 border-2 border-ink flex items-center justify-center shrink-0 shadow-brutal-flat group-hover:-translate-y-0.5 transition-transform">
        <Image
          src="/sketch-logo.png"
          alt="SKETCH Logo"
          width={28}
          height={28}
          className="object-contain h-full w-full pointer-events-none"
          priority
        />
      </div>
      <span className="font-peachy font-black text-xl tracking-tight text-ink">
        SketchHUB
      </span>
    </Link>
  );
}
