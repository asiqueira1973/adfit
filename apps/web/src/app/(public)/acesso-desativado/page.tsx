import { Suspense } from "react";
import { UserX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/server/auth/profile";

/**
 * Tela após logout forçado de usuário com `perfis.ativo = false` (seção 6.3), copy da seção 15.
 */
export default function DisabledAccessPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface"><UserX className="size-6 text-text-2" /></span>
      <Suspense>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const t = getDictionary(await getRequestLocale());
  return (
    <>
      <p className="max-w-xs text-[17px]">{t.copy.usuarioDesativado}</p>
      <ButtonLink href="/entrar" variant="secondary">{t.auth.voltarInicio}</ButtonLink>
    </>
  );
}
