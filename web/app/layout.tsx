import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Stasis",
  description: "A self-hosted Git server with CI/CD",
  keywords: ["git", "server", "self-hosted", "ci", "cd"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          <Header />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
