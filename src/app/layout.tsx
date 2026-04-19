import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "CRM",
  description: "Minimal CRM boilerplate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
