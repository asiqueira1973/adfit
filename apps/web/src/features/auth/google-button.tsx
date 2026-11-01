"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { PUBLIC_ENV } from "@/lib/public-env";

type GoogleId = {
  initialize(config: { client_id: string; callback: (r: { credential: string }) => void; nonce: string; use_fedcm_for_prompt?: boolean; ux_mode?: "popup" }): void;
  renderButton(el: HTMLElement, options: Record<string, unknown>): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

/** Nonce aleatório e seu SHA-256 em hex (o Google recebe o hash; o Supabase confere o original). */
async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return { raw, hashed: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("") };
}

/** Carrega o script do Google Identity Services uma vez. */
function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-gis]");
    const s = existing ?? Object.assign(document.createElement("script"), { src: "https://accounts.google.com/gsi/client", async: true });
    s.dataset.gis = "1";
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("gis")));
    if (!existing) document.head.appendChild(s);
  });
}

/**
 * "Entrar com Google" (emendas MD-5 e MD-7). Usa o Google Identity Services NA PÁGINA do AdFit
 * (o Google mostra o nosso domínio, não o do Supabase) e troca o token do Google pela sessão com
 * `signInWithIdToken`. Só entra quem tem perfil: sem convite, o Supabase não cria a conta (cadastro
 * desligado) ou o proxy recusa quem não tem perfil. Recebe: idioma do botão e textos de erro.
 * Devolve: o botão oficial do Google.
 */
export function GoogleButton({ locale, errorLabel, noAccessLabel }: { locale: string; errorLabel: string; noAccessLabel: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nonce] = await Promise.all([makeNonce(), loadGis()]);
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: PUBLIC_ENV.googleClientId,
          nonce: nonce.hashed,
          use_fedcm_for_prompt: true,
          callback: async ({ credential }) => {
            setError(undefined);
            const { error: e } = await createBrowserSupabase().auth.signInWithIdToken({ provider: "google", token: credential, nonce: nonce.raw });
            if (e) {
              setError(/signup|not allowed|disabled/i.test(e.message) ? noAccessLabel : errorLabel);
              return;
            }
            // O proxy manda cada perfil para a sua página inicial (ou recusa quem não tem perfil).
            router.replace("/");
            router.refresh();
          },
        });
        window.google.accounts.id.renderButton(ref.current, { type: "standard", theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 320, locale });
      } catch {
        if (!cancelled) setError(errorLabel);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, errorLabel, noAccessLabel, router]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={ref} className="flex min-h-11 justify-center" />
      {error && <p className="text-center text-[14px] text-danger">{error}</p>}
    </div>
  );
}
