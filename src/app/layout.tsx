import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { t } from "@/strings/en";

export const metadata: Metadata = {
  title: t.site,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">
        <header className="border-b border-line">
          <nav className="mx-auto flex h-12 max-w-xl items-center px-4">
            <Link href="/" className="font-semibold">{t.site}</Link>
            <Link href="/me" className="ml-auto text-link">{t.me}</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
