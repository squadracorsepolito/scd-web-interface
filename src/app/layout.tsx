import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SCD Web Interface",
  description: "A simple dashboard to display stats of the car",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
