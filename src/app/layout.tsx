import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Navbar } from "@/components/nav/navbar";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { PageViewTracker } from "@/components/providers/page-view-tracker";
import { Suspense } from "react";
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
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME || "App",
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME || "App"}`,
  },
  description: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME || "App"}`,
  openGraph: {
    title: process.env.NEXT_PUBLIC_APP_NAME || "App",
    description: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME || "App"}`,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>
          <SessionProvider>
            <Navbar />
            <Suspense fallback={null}>
              <PageViewTracker />
            </Suspense>
            <main>{children}</main>
          </SessionProvider>
          <Toaster richColors position="top-right" />
        </PostHogProvider>
      </body>
    </html>
  );
}
