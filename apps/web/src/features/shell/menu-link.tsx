"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * Link de menu dentro de `<details>` (menu do perfil): fecha o menu ao navegar. O cabeçalho não
 * remonta na navegação do App Router, então sem isso o menu ficava aberto por cima da página.
 * `withOrigin` acrescenta `?de=<tela atual>` (feedback, MD-6).
 */
export function MenuLink({ onClick, withOrigin, ...props }: ComponentProps<typeof Link> & { withOrigin?: boolean }) {
  const router = useRouter();
  return (
    <Link
      {...props}
      onClick={(e) => {
        e.currentTarget.closest("details")?.removeAttribute("open");
        onClick?.(e);
        if (withOrigin && !e.defaultPrevented) {
          e.preventDefault();
          router.push(`${String(props.href)}?de=${encodeURIComponent(window.location.pathname)}`);
        }
      }}
    />
  );
}
