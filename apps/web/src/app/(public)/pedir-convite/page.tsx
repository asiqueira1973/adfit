import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/features/auth/auth-layout";
import { PublicLanguageSwitch } from "@/features/shell/language-switch";
import { InviteRequestForm } from "@/features/invites/request-form";
import { getDictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/server/auth/profile";

/** Tela pública "Peça seu convite" (emenda MD-9): sem autocadastro; o pedido vai para o admin. */
export default function RequestInvitePage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const locale = await getRequestLocale();
  const t = getDictionary(locale);
  return (
    <AuthLayout title={t.convite.titulo} subtitle={t.convite.subtitulo} madeBy={t.copy.feitoPor} language={<PublicLanguageSwitch current={locale} label={t.nav.idioma} names={t.idiomas} />}>
      <InviteRequestForm t={{ convite: t.convite, erros: t.erros }} />
      <Link href="/entrar" className="inline-flex items-center justify-center gap-1 text-[15px] font-semibold text-brand-text">
        <ArrowLeft className="size-4" /> {t.convite.voltar}
      </Link>
    </AuthLayout>
  );
}
