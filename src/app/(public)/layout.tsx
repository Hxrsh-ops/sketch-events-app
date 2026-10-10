import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F4F5F6] dark:bg-[#111315] text-[#17191C] dark:text-[#F1F2F3] flex flex-col justify-between transition-colors">
      {/* Minimal Public Navigation */}
      <header className="border-b border-[#E5E7EA] dark:border-[#30353A] bg-white/80 dark:bg-[#151719]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-black flex items-center justify-center shrink-0 shadow-sm dark:ring-1 dark:ring-white/20">
              <Image
                src="/sketch-logo.png"
                alt="SKETCH Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <span className="font-bold text-base tracking-tight text-[#17191C] dark:text-[#F1F2F3]">
              SKETCH
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-[#8A9098] font-medium">
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

      {/* Public Footer */}
      <footer className="border-t border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#151719] py-6 text-center text-xs text-[#8A9098]">
        <div className="max-w-4xl mx-auto px-6">
          <p>© {new Date().getFullYear()} SKETCH Events. Organized for students, creators, and technologists.</p>
          <p className="mt-1 text-[11px] text-[#AEB3BA] dark:text-[#656B73]">
            Tickets and credentials are sent directly via email. No student account required.
          </p>
        </div>
      </footer>
    </div>
  );
}
