import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arkadaşlık İsteği - Everydle",
  description: "Bağlantıyı Everydle'da aç ve arkadaş ol!",
  openGraph: {
    title: "Arkadaşlık İsteği - Everydle",
    description: "Bağlantıyı Everydle'da aç veya uygulamayı indir.",
    siteName: "Everydle",
    type: "website",
    url: "https://playeverydle.com/friends/add",
    images: [
      {
        url: "https://playeverydle.com/images/og-friend-invite.png?v=3",
        width: 1200,
        height: 630,
        alt: "Everydle Arkadaşlık Daveti",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arkadaşlık İsteği - Everydle",
    description: "Bağlantıyı Everydle'da aç veya uygulamayı indir.",
    images: ["https://playeverydle.com/images/og-friend-invite.png?v=3"],
  },
};

export default function AddFriendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
