import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { NavigationProvider } from "@/components/layout/navigation-progress";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SketchHUB — Event Operations Platform",
  description: "One calm, dependable workspace to publish events, manage registrations, coordinate attendance, and issue certificates.",
};

const THEME_INITIALIZER_SCRIPT = `
  (function() {
    try {
      var theme = localStorage.getItem('sketch-theme');
      var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${inter.variable}`}>
      <head>
        <script
          id="sketch-theme-initializer"
          dangerouslySetInnerHTML={{
            __html: THEME_INITIALIZER_SCRIPT,
          }}
        />
      </head>
      <body className="font-sans min-h-screen bg-[#F4F5F6] dark:bg-[#111315] text-[#17191C] dark:text-[#F1F2F3] selection:bg-[#25292F] dark:selection:bg-[#E8EAED] selection:text-white dark:selection:text-[#111315] antialiased transition-colors duration-200">
        <ThemeProvider>
          <NavigationProvider>{children}</NavigationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
