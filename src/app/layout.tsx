import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display-stack",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zyrix — Web Agency Operating System",
  description:
    "Zyrix is a web development agency in Dehiwala, Sri Lanka. This platform automates lead discovery, client outreach, and AI-driven project briefs for custom web builds.",
  keywords: [
    "Zyrix",
    "web agency",
    "Sri Lanka",
    "Dehiwala",
    "lead discovery",
    "AI outreach",
  ],
  authors: [{ name: "Zyrix Agency" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <SonnerToaster position="top-right" richColors />
      </body>
    </html>
  );
}
