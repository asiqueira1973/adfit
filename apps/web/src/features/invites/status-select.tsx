"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { callApi } from "@/features/admin/api";

/** Seletor de status de um pedido de convite no admin (MD-9): `PATCH /api/admin/pedidos/:id`. */
export function InviteRequestStatusSelect({ id, status, labels, aria }: { id: string; status: string; labels: Record<string, string>; aria: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  return (
    <select
      aria-label={aria}
      value={value}
      disabled={busy}
      onChange={async (e) => {
        const next = e.target.value;
        setValue(next);
        setBusy(true);
        const r = await callApi("PATCH", `/api/admin/pedidos/${id}`, { status: next });
        setBusy(false);
        if (!r.ok) setValue(status);
        router.refresh();
      }}
      className="min-h-10 rounded-[10px] border border-hairline bg-bg px-2 text-[14px]"
    >
      {Object.entries(labels).map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}
