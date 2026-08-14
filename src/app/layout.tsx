import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Worknode SaaS | Premium Multi-Tenant Dashboard",
  description: "Futuristic multi-company operational dashboard, asset management, real-time communications, and secure audit logging system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>
          <div className="ambient-background">
            <div className="ambient-blob-1"></div>
            <div className="ambient-blob-2"></div>
            <div className="ambient-light-streak"></div>
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
