import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "StaffOps SaaS | Premium Multi-Tenant Dashboard",
  description: "Futuristic multi-company operational dashboard, asset management, real-time communications, and secure audit logging system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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

