import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F4F1] flex flex-col justify-between">
      {/* Minimal Public Navigation */}
      <header className="border-b border-[#EAE8E3] bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#8F2635] flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
              S
            </div>
            <span className="font-bold text-base tracking-tight text-[#191A1C]">
              SKETCH
            </span>
          </Link>

          <span className="text-xs text-[#929398] font-medium">
            Official Event Portal
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-[#EAE8E3] bg-white py-6 text-center text-xs text-[#929398]">
        <div className="max-w-4xl mx-auto px-6">
          <p>© {new Date().getFullYear()} SKETCH Events. Organized for students, creators, and technologists.</p>
          <p className="mt-1 text-[11px] text-[#B6B4AF]">
            Tickets and credentials are sent directly via email. No account required.
          </p>
        </div>
      </footer>
    </div>
  );
}
