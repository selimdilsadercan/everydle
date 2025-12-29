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

const siteConfig = {
  name: "Everydle",
  description: "Türkiye'nin en popüler günlük kelime ve bulmaca oyunları koleksiyonu. Wordle, Contexto, Redactle ve daha fazlasını ücretsiz oyna.",
  url: "https://playeverydle.com",
  ogImage: "https://playeverydle.com/og-image.png",
  keywords: [
    "Wordle Türkçe", 
    "Contexto Türkçe", 
    "Redactle Türkçe", 
    "Nerdle", 
    "Bulmaca oyunları", 
    "Günlük oyunlar", 
    "Kelime oyunu", 
    "Zeka oyunları",
    "Everydle"
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Everydle | Günlük Kelime Oyunları Koleksiyonu",
    template: "%s | Everydle"
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "Everydle Team" }],
  creator: "Everydle",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteConfig.url,
    title: "Everydle | Günlük Kelime Oyunları Koleksiyonu",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Everydle Game Collection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Everydle | Günlük Kelime Oyunları Koleksiyonu",
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@everydle",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: "/",
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Everydle",
              "operatingSystem": "Web",
              "applicationCategory": "GameApplication",
              "description": siteConfig.description,
              "url": siteConfig.url,
              "genre": "Puzzle",
              "author": {
                "@type": "Organization",
                "name": "Everydle"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />
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
