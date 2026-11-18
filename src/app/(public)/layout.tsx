import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { StealthGateTrigger } from "@/components/navigation/stealth-gate-trigger";
import { PublicHeaderLogo } from "@/components/navigation/public-header-logo";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-ink flex flex-col justify-between transition-colors">
      <StealthGateTrigger />
      {/* Minimal FlowFest Retro Public Navigation */}
      <header className="border-b-2 border-ink bg-[#FFFDF7]/95 backdrop-blur-md sticky top-0 z-30 shadow-brutal-flat">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <PublicHeaderLogo />

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-ink bg-retro-yellow text-ink font-quicksand font-black text-xs uppercase tracking-wider shadow-brutal-badge">
              Official Event Portal
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        {children}
      </main>

      {/* Retro Public Footer */}
      <footer className="border-t-2 border-ink bg-[#FFFDF7] py-6 text-center text-xs text-ink/80 font-quicksand font-bold">
        <div className="max-w-4xl mx-auto px-6 space-y-1">
          <p>© {new Date().getFullYear()} SketchHUB Events. Organized for campus creators, innovators, and technologists.</p>
          <p className="text-[11px] text-ink/60">
            Tickets and credentials are sent directly via email. No student account required.
          </p>
        </div>
      </footer>
    </div>
  );
}
