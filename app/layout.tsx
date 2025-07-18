import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { PostHogProvider } from "./components/PosthogProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import AnimatedGrid from "./components/AnimatedGrid";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const ppNeue = localFont({
  src: "../fonts/PPNeueMontreal-Medium.otf",
  variable: "--font-pp-neue",
});

const ppSupply = localFont({
  src: "../fonts/PPSupplySans-Regular.otf",
  variable: "--font-pp-supply",
});

export const metadata: Metadata = {
  title: "Node v2",
  description: "Automation is here",
  openGraph: {
    images: ["/ogpng"],
    title: "Node v2",
    description: "Watch AI browse the web, for free",
    url: "https://Nodev2.bawebtools.com",
  },
  icons: {
    icon: [
      { url: "/cube-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/cube-icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </head>
      <body
        className={`${inter.variable} ${ppNeue.variable} ${ppSupply.variable} font-sans antialiased background-theme text-theme transition-colors`}
      >
        <AnimatedGrid />
        <ThemeProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
