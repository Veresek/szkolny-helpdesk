import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Szkolny Helpdesk — zgłaszanie usterek",
  description: "Zgłoś usterkę w szkole i sprawdź postęp jej naprawy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `try { const theme = localStorage.getItem("helpdesk-theme"); document.documentElement.classList.toggle("dark", theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches); } catch {}`,
        }} />
        {children}
      </body>
    </html>
  );
}
