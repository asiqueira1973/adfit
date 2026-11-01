"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callApi } from "./api";

/**
 * "Reconsultar" de uma geração em processamento ([Admin] Gerações; POST
 * /api/admin/geracoes/:id/reconsultar). Recebe: id e textos. Recarrega os dados ao terminar.
 */
export function RecheckButton({ id, label, done, error }: { id: string; label: string; done: string; error: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await callApi("POST", `/api/admin/geracoes/${id}/reconsultar`, {});
          setBusy(false);
          setMsg(r.ok ? done : r.mensagem || error);
          if (r.ok) router.refresh();
        }}
      >
        <RefreshCw className="size-4" /> {label}
      </Button>
      {msg && <p className="text-[13px] text-text-2">{msg}</p>}
    </div>
  );
}
