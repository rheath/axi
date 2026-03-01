import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axi AI Readiness Checker",
  description: "Scan any website URL and get an AI readiness score with prioritized fixes."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
