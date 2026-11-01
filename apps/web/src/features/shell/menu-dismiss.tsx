"use client";

import { useEffect } from "react";

/**
 * Fecha os menus `<details data-menu>` ao clicar fora deles ou apertar Esc (bug relatado em
 * 01/11/2026: o menu do perfil ficava aberto até recarregar a página). Não desenha nada.
 */
export function MenuDismiss() {
  useEffect(() => {
    const closeAll = (except?: EventTarget | null) => {
      document.querySelectorAll<HTMLDetailsElement>("details[data-menu][open]").forEach((d) => {
        if (!(except instanceof Node && d.contains(except))) d.removeAttribute("open");
      });
    };
    const onClick = (e: MouseEvent) => closeAll(e.target);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAll();
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
