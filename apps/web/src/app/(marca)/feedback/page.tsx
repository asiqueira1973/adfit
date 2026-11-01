import { Suspense } from "react";
import { PageHeader } from "@/components/ui/feedback";
import { FeedbackForm } from "@/features/feedback/feedback-form";
import { brandContext } from "@/server/brand/context";

/** Tela "Fale com a gente" (emenda MD-6): problemas e sugestões do usuário da marca para o admin. */
export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-80 max-w-xl animate-pulse rounded-[14px] bg-surface" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { t } = await brandContext();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader title={t.feedback.titulo} subtitle={t.feedback.subtitulo} />
      <FeedbackForm t={{ feedback: t.feedback, erros: t.erros }} />
    </div>
  );
}
