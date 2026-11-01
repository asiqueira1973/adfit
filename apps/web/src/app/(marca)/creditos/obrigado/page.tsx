import { Suspense } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { ConfirmingRefresh } from "@/features/credits/confirming-refresh";
import { fill } from "@/lib/copy";
import type { Dictionary } from "@/lib/i18n";
import { brandContext } from "@/server/brand/context";
import { getBrandSummary } from "@/server/brand/queries";
import { createUserClient } from "@/server/db/supabase";
import { fulfillCheckout } from "@/server/stripe/fulfill";

/**
 * Tela [Marca] Compra concluída — `/creditos/obrigado?session_id=` (seções 4.5, 10 e 13).
 * Chama `fulfillCheckout` no servidor (atalho do webhook, que continua obrigatório) e só mostra a
 * compra se ela for da marca do usuário. Estados: confirmando (recarrega sozinha), pronto com o
 * novo saldo, ou "O pagamento não foi aprovado…".
 */
export default function ThanksPage({ searchParams }: PageProps<"/creditos/obrigado">) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-sm flex-col items-center justify-center gap-5 text-center">
      <Suspense fallback={<Spinner className="size-8" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function Confirming({ t, attempt }: { t: Dictionary; attempt: number }) {
  return (
    <>
      <Spinner className="size-8" />
      <p className="text-[17px]">{t.copy.confirmando}</p>
      <ConfirmingRefresh attempt={attempt} />
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/creditos/obrigado">["searchParams"] }) {
  const { profile, t } = await brandContext();
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : "";
  const attempt = Number(typeof sp.tentativa === "string" ? sp.tentativa : 0) || 0;
  // Validação antes de agir (seção 13): a sessão precisa ser de um pagamento da própria marca —
  // a RLS pagamentos_select só devolve pagamentos da marca do usuário.
  const supabase = await createUserClient();
  const { data: own } = /^cs_(test|live)_\w+$/.test(sessionId)
    ? await supabase.from("pagamentos").select("id").eq("stripe_checkout_session_id", sessionId).maybeSingle()
    : { data: null };
  // Erro passageiro ao falar com a Stripe não é "pagamento recusado": segue confirmando.
  const result = own ? await fulfillCheckout(sessionId).catch(() => ({ status: "pendente" as const, pagamentoId: own.id, marcaId: profile.marcaId })) : null;

  const ownBrand = result && "marcaId" in result && result.marcaId === profile.marcaId;
  if (!result || !ownBrand || result.status === "falhou" || result.status === "expirado") {
    if (result && ownBrand && result.status === "pendente") return <Confirming t={t} attempt={attempt} />;
    return (
      <>
        <XCircle className="size-14 text-danger" />
        <p className="text-[20px] font-semibold">{t.copy.pagamentoFalhou}</p>
        <ButtonLink href="/creditos/comprar" className="w-full">{t.creditos.escolherPacote}</ButtonLink>
        <ButtonLink href="/inicio" variant="ghost" className="w-full">{t.creditos.voltarInicio}</ButtonLink>
      </>
    );
  }
  if (result.status !== "pago") return <Confirming t={t} attempt={attempt} />;

  const brand = await getBrandSummary(profile.marcaId);
  return (
    <>
      <CheckCircle2 className="size-14 text-success" />
      <p className="text-[22px] font-bold tracking-tight">{fill(t.copy.compraConcluida, { n: result.creditos })}</p>
      <p className="text-[15px] text-text-2">{fill(t.creditos.novoSaldo, { n: brand?.saldo_creditos ?? 0 })}</p>
      <ButtonLink href="/anuncios/novo" className="w-full">{t.creditos.criarAnuncio}</ButtonLink>
      <ButtonLink href="/inicio" variant="ghost" className="w-full">{t.creditos.voltarInicio}</ButtonLink>
    </>
  );
}
