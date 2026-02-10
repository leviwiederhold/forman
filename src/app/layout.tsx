import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AppHeader from "@/components/app-header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Forman",
  description: "Contractor quoting app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="font-sans antialiased min-h-screen flex flex-col"
        style={
          {
            "--font-quicksand":
              "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif",
            "--font-display": "ui-serif, Georgia, Cambria, \"Times New Roman\", serif",
          } as CSSProperties
        }
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AppHeader />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
