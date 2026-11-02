"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callApi } from "@/features/admin/api";

/** Arquivar personagem (MD-17; PATCH /api/personagens/:id). Pede confirmação; volta para /personagens. */
export function ArchiveCharacterButton({ id, label, confirm }: { id: string; label: string; confirm: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      className="px-3"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirm)) return;
        start(async () => {
          const r = await callApi("PATCH", `/api/personagens/${id}`, { arquivado: true });
          if (r.ok) {
            router.push("/personagens");
            router.refresh();
          }
        });
      }}
    >
      <Archive className="size-4.5" />
    </Button>
  );
}
