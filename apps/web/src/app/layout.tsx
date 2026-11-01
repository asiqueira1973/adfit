import type { Metadata, Viewport } from "next";
import { MenuDismiss } from "@/features/shell/menu-dismiss";
import { Inter } from "next/font/google";
import { APP_NAME } from "@/lib/constants";
import { HtmlLang } from "@/components/html-lang";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Anúncios em vídeo para a sua marca de roupa fitness.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

/**
 * Layout raiz: aplica a fonte Inter e os tokens da seção 16.2.
 * Recebe: as páginas filhas. Devolve: o documento HTML em pt-BR.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <HtmlLang />
        <MenuDismiss />
        {children}
      </body>
    </html>
  );
}
