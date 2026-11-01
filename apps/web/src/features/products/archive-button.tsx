"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase-browser";

/**
 * Arquivar produto (soft delete, seção 7.4; RLS produtos_update). Some das listas do usuário.
 * Recebe: id e rótulo. Devolve: o botão; ao arquivar volta para /produtos.
 */
export function ArchiveProductButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      className="px-3"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => start(async () => {
        const { error } = await createBrowserSupabase().from("produtos").update({ arquivado: true }).eq("id", id);
        if (!error) {
          router.push("/produtos");
          router.refresh();
        }
      })}
    >
      <Archive className="size-4.5" />
    </Button>
  );
}
