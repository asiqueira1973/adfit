"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Enquanto o pagamento ainda não está `paid` (ex.: webhook atrasado ou pagamento assíncrono),
 * recarrega a página de obrigado a cada 3 s, até 20 vezes (seção 4.5: "estado confirmando…").
 */
export function ConfirmingRefresh({ attempt }: { attempt: number }) {
  const router = useRouter();
  useEffect(() => {
    if (attempt >= 20) return;
    const id = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("tentativa", String(attempt + 1));
      router.replace(url.pathname + url.search);
    }, 3000);
    return () => clearTimeout(id);
  }, [attempt, router]);
  return null;
}
