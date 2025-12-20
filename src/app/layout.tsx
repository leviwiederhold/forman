import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AppHeader from "@/components/app-header";

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
      <body className={`${quicksand.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AppHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
