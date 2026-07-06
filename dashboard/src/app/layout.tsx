import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthHeader from "./partials/AuthHeader";
import { Toaster } from "@/components/ui/sonner";
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
  title: "Semantic Web Intelligence Platform",
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
        <AuthHeader />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
