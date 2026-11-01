"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { TextArea, TextField } from "@/components/ui/field";
import type { Dictionary } from "@/lib/i18n";
import { callApi } from "@/features/admin/api";

/**
 * Formulário "Peça seu convite" (MD-9): nome, e-mail, marca, Instagram e mensagem opcionais, e um
 * campo escondido de armadilha para robôs. Envia a `POST /api/pedidos-convite`. Recebe: textos.
 */
export function InviteRequestForm({ t }: { t: Pick<Dictionary, "convite" | "erros"> }) {
  const c = t.convite;
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string>();
  if (state === "sent") return <Banner tone="success">{c.enviado}</Banner>;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setState("sending");
        setError(undefined);
        const get = (k: string) => String(f.get(k) ?? "").trim();
        const r = await callApi("POST", "/api/pedidos-convite", {
          nome: get("nome"),
          email: get("email"),
          marca: get("marca"),
          instagram: get("instagram") || undefined,
          mensagem: get("mensagem") || undefined,
          site: get("site") || undefined,
        });
        if (r.ok) return setState("sent");
        setError(r.mensagem || t.erros.generico);
        setState("idle");
      }}
    >
      {error && <Banner tone="danger">{error}</Banner>}
      <TextField label={c.nome} name="nome" required maxLength={80} autoComplete="name" />
      <TextField label={c.email} name="email" type="email" required maxLength={254} autoComplete="email" inputMode="email" hint={c.emailDica} />
      <TextField label={c.marca} name="marca" required maxLength={80} />
      <TextField label={c.instagram} name="instagram" maxLength={31} hint={c.instagramDica} />
      <TextArea label={c.mensagem} name="mensagem" rows={3} maxChars={500} placeholder={c.mensagemPlaceholder} />
      {/* Armadilha para robôs: invisível para pessoas. */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <Button type="submit" disabled={state === "sending"}>{state === "sending" ? c.enviando : c.enviar}</Button>
    </form>
  );
}
