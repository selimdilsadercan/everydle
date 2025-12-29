import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import MobileAppBanner from "@/components/MobileAppBanner";

import QueryProvider from "@/components/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Everydle | Puzzle Games Collection",
  description: "Play Wordle, Contexto, Redactle, Nerdle, Pokerdle, Quordle, Octordle and Moviedle - a collection of fun puzzle games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0F172B" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="msapplication-navbutton-color" content="#0F172B" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
              <MobileAppBanner />
            </AuthProvider>
          </QueryProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
