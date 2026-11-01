"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { TextArea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import type { Dictionary } from "@/lib/i18n";
import { callApi } from "@/features/admin/api";

/**
 * Formulário "Fale com a gente" (emenda MD-6): tipo (problema ou sugestão), texto e a tela de onde a
 * pessoa veio (`?de=` do menu, ou o `document.referrer` do próprio site), enviado a `POST /api/feedback`.
 * Recebe: textos. Devolve: o formulário.
 */
export function FeedbackForm({ t }: { t: Pick<Dictionary, "feedback" | "erros"> }) {
  const f = t.feedback;
  const [tipo, setTipo] = useState<"problema" | "sugestao">("problema");
  const [texto, setTexto] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  if (state === "sent") return <Banner tone="success">{f.enviado}</Banner>;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        const result = await callApi("POST", "/api/feedback", { tipo, texto, tela: originPath() });
        if (result.ok) return setState("sent");
        setError(result.mensagem || t.erros.generico);
        setState("error");
      }}
    >
      {state === "error" && <Banner tone="danger">{error}</Banner>}
      <Segmented name="tipo" label={f.tipo} value={tipo} onChange={(v) => setTipo(v as "problema" | "sugestao")} options={[{ value: "problema", label: f.problema }, { value: "sugestao", label: f.sugestao }]} />
      <TextArea
        label={f.texto}
        name="texto"
        rows={6}
        maxChars={2000}
        required
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={tipo === "problema" ? f.textoPlaceholderProblema : f.textoPlaceholderSugestao}
      />
      <Button type="submit" disabled={!texto.trim() || state === "sending"}>
        {state === "sending" ? f.enviando : f.enviar}
      </Button>
    </form>
  );
}

/** Caminho da tela de onde a pessoa veio (só do próprio site), para o admin entender o contexto. */
function originPath(): string | undefined {
  try {
    const de = new URLSearchParams(window.location.search).get("de");
    if (de && de.startsWith("/") && !de.startsWith("//")) return de.slice(0, 300);
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && ref.pathname !== "/feedback") return ref.pathname.slice(0, 300);
  } catch {
    // Sem referrer: segue sem a tela.
  }
  return undefined;
}
