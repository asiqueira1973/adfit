"use client";

import { useEffect } from "react";
import { LOCALE_COOKIE } from "@/lib/i18n";

/**
 * Ajusta `<html lang>` ao idioma da sessão (MD-1, acessibilidade da seção 17). O layout raiz não
 * pode ler cookies fora de Suspense (Cache Components), então o ajuste é feito no navegador.
 */
export function HtmlLang() {
  useEffect(() => {
    const value = document.cookie.split("; ").find((c) => c.startsWith(`${LOCALE_COOKIE}=`))?.split("=")[1];
    document.documentElement.lang = value === "en" ? "en" : "pt-BR";
  });
  return null;
}
