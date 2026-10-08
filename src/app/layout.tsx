import type { Metadata, Viewport } from "next";
import { OfflineApp } from "@/components/offline-app";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCD Web Interface",
  description: "A simple dashboard to display stats of the car",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SCD",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <OfflineApp />
        {children}
      </body>
    </html>
  );
}
