import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SKETCH — Event Operations Platform",
  description: "One calm, dependable workspace to publish events, manage registrations, coordinate attendance, and issue certificates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans min-h-screen bg-[#F5F4F1] text-[#191A1C] selection:bg-[#F7E9EB] selection:text-[#8F2635]">
        {children}
      </body>
    </html>
  );
}
