import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "InsightLens",
  description: "Summaries, insights, and a personal knowledge base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} app-shell`}>
        <div className="bg-orb orb-a" />
        <div className="bg-orb orb-b" />
        <header className="nav">
          <a className="logo" href="/">
            InsightLens
          </a>
          <nav className="nav-links">
            <a href="/dashboard">Dashboard</a>
            <a href="/login">Sign in</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
