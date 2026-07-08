import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "GrowEasy CSV Importer",
  description: "AI-powered CSV to CRM lead importer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
