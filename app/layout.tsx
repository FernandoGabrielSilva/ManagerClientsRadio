import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["300","400","500","600","700","800"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://rayssemanager.vercel.app"),
  title: "Raysse Manager",
  description:
    "Gerenciamento de clientes, contratos e lembretes para agência de marketing",
  verification: {
    google: "cQnb1Z3n4_fqh8FQkpYB4IwbzTRqUTI-0yATGXa9IcQ",
    other: {
      "msvalidate.01": "0ED11B484FF8DA1A32B9EEECB793C3E7",
    },
  },
  keywords: [
    "Raysse Manager",
    "Gerenciamento de clientes",
    "Agência de rádio",
    "Contratos",
    "Calendário",
    "Lembretes",
    "Marketing",
    "Clientes",
    "Vendedores",
    "Gestão",
  ],
  authors: [{ name: "Raysse Manager" }],
  openGraph: {
    title: "Raysse Manager | Gestão de clientes e contratos",
    description:
      "Gerenciamento de clientes, contratos e lembretes para agência de marketing e rádio.",
    url: "https://rayssemanager.vercel.app",
    siteName: "Raysse Manager",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Raysse Manager | Gestão de clientes e contratos",
    description: "Gerenciamento de clientes, contratos e lembretes para agência de marketing e rádio.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://rayssemanager.vercel.app" },
  category: "business",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth">
      <head />
      <body className={`${jakarta.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
