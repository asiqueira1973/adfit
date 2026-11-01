import { Suspense } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { readFlags } from "@/features/fixtures/flags";
import { COPY, fill } from "@/lib/copy";

/**
 * Tela [Marca] Compra concluída — `/creditos/obrigado?session_id=` (seção 10 e 4.5): "Confirmando
 * seu pagamento…" enquanto `fulfillCheckout` roda; depois "Pronto! {n} créditos adicionados." com o
 * novo saldo, ou a falha. Estados de design: `?estado=confirmando|ok|falhou`.
 */
export default function ThanksPage({ searchParams }: PageProps<"/creditos/obrigado">) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-sm flex-col items-center justify-center gap-5 text-center">
      <Suspense fallback={<Confirming />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function Confirming() {
  return (
    <>
      <Spinner className="size-8" />
      <p className="text-[17px]">{COPY.confirmando}</p>
    </>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/creditos/obrigado">["searchParams"] }) {
  const flags = readFlags(await searchParams);
  if (flags.estado === "confirmando") return <Confirming />;
  if (flags.estado === "falhou") {
    return (
      <>
        <XCircle className="size-14 text-danger" />
        <p className="text-[20px] font-semibold">{COPY.pagamentoFalhou}</p>
        <ButtonLink href="/creditos/comprar" className="w-full">Escolher pacote</ButtonLink>
        <ButtonLink href="/inicio" variant="ghost" className="w-full">Voltar ao início</ButtonLink>
      </>
    );
  }
  return (
    <>
      <CheckCircle2 className="size-14 text-success" />
      <p className="text-[22px] font-bold tracking-tight">{fill(COPY.compraConcluida, { n: 50 })}</p>
      <p className="text-[15px] text-text-2">Novo saldo: <span className="tabular font-semibold text-text">86 créditos</span></p>
      <ButtonLink href="/anuncios/novo" className="w-full">Criar anúncio</ButtonLink>
      <ButtonLink href="/inicio" variant="ghost" className="w-full">Voltar ao início</ButtonLink>
    </>
  );
}
