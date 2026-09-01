import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LoadingOverlayProvider } from "@/components/loading-overlay";
import { NavProgress } from "@/components/nav-progress";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAMone's Kitchen — Admin",
  description: "Track market costs, food pricing, and income for SAMone's Kitchen.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="h-full flex flex-col overflow-hidden"
        suppressHydrationWarning
      >
        <LoadingOverlayProvider>
          <NavProgress />
          {children}
        </LoadingOverlayProvider>
      </body>
    </html>
  );
}
