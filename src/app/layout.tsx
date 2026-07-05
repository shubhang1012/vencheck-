import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/lib/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Vencheck",
    template: "%s | Vencheck",
  },
  description:
    "AI-Powered Vendor Onboarding Automation Platform. Streamline vendor registration, compliance verification, and risk assessment with intelligent automation.",
  keywords: [
    "vendor onboarding",
    "automation",
    "compliance",
    "risk assessment",
    "AI",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider defaultTheme="dark" storageKey="vencheck-theme">
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
              className: "font-sans",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
