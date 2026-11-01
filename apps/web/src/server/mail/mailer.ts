import "server-only";
import type { Locale } from "@/lib/i18n";

/** E-mail de boas-vindas do convite (emenda MD-7). */
export type WelcomeMail = { to: string; nome: string; marca: string; idioma: Locale; link: string };

/** Envio de e-mail atrás de interface (seção 22: dublê nos testes; trocar de provedor sem mexer no resto). */
export interface Mailer {
  /** Devolve true se o e-mail foi aceito pelo provedor. */
  sendWelcome(mail: WelcomeMail): Promise<boolean>;
}

let testMailer: Mailer | null = null;

/** Troca o envio nos testes (nunca usado fora de testes). */
export function setMailerForTests(m: Mailer | null): void {
  testMailer = m;
}

/** Escapa texto para HTML. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Texto do e-mail de boas-vindas em pt-BR e inglês (MD-1). */
export function welcomeContent(m: WelcomeMail): { subject: string; html: string; text: string } {
  const pt = m.idioma !== "en";
  const subject = pt ? `Seu acesso ao AdFit (${m.marca})` : `Your AdFit access (${m.marca})`;
  const lines = pt
    ? [`Olá, ${m.nome}!`, `Você agora tem acesso ao AdFit da marca ${m.marca}. Lá você transforma fotos das suas peças em vídeos curtos de anúncio.`, `Para entrar, use o botão "Entrar com Google" com este mesmo e-mail (${m.to}).`]
    : [`Hi ${m.nome}!`, `You now have access to AdFit for ${m.marca}. It turns photos of your products into short video ads.`, `To sign in, use "Sign in with Google" with this same email (${m.to}).`];
  const cta = pt ? "Entrar no AdFit" : "Open AdFit";
  const footer = pt ? "Feito pela Dab Lab" : "Made by Dab Lab";
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#fff;border-radius:16px;padding:32px">
<tr><td style="font-size:22px;font-weight:700;padding-bottom:16px">AdFit</td></tr>
${lines.map((l) => `<tr><td style="font-size:16px;line-height:1.5;padding-bottom:12px">${esc(l)}</td></tr>`).join("")}
<tr><td style="padding:12px 0 8px"><a href="${esc(m.link)}" style="display:inline-block;background:#c6f432;color:#1d1d1f;font-weight:600;text-decoration:none;padding:14px 22px;border-radius:12px">${cta}</a></td></tr>
<tr><td style="font-size:12px;color:#6e6e73;padding-top:16px">${footer}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text: `${lines.join("\n\n")}\n\n${cta}: ${m.link}\n\n${footer}` };
}

/**
 * Envio real pela API do Resend (https://resend.com), quando `RESEND_API_KEY` e `MAIL_FROM` estão
 * configurados; sem eles, não envia e devolve false (o admin recebe o link para mandar por conta própria).
 */
function resendMailer(): Mailer {
  return {
    async sendWelcome(m) {
      const key = process.env.RESEND_API_KEY;
      const from = process.env.MAIL_FROM;
      if (!key || !from) return false;
      const { subject, html, text } = welcomeContent(m);
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [m.to], subject, html, text }),
        });
        if (!res.ok) console.error("E-mail de boas-vindas recusado pelo provedor:", res.status);
        return res.ok;
      } catch (e) {
        console.error("E-mail de boas-vindas falhou:", e instanceof Error ? e.message : e);
        return false;
      }
    },
  };
}

/** Envio em uso: dublê nos testes, Resend no resto. */
export function mailer(): Mailer {
  return testMailer ?? resendMailer();
}
