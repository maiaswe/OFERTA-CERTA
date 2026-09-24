import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";
const bodyFont = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});
const headingFont = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});
export const metadata: Metadata = {
  title: "Oferta Certa — descubra o preço real",
  description:
    "Organize ofertas, compare preços registrados, guarde cupons e acompanhe seus produtos favoritos.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${bodyFont.variable} ${headingFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
