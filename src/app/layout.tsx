import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AppHeader from "@/components/app-header";
import Footer from "@/components/layout/Footer";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300"],
  variable: "--font-quicksand",
});

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
      <body className={`${quicksand.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AppHeader />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
