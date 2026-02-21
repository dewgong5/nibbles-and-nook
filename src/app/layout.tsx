import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nibbles & Nook",
  description: "Welcome to Nibbles & nOOk — order food",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body className="antialiased">{children}</body>
    </html>
  );
}
