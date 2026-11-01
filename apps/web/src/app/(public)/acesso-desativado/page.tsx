import { UserX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

/**
 * Tela após logout forçado de usuário com `perfis.ativo = false` (seção 6.3), com a copy da seção 15.
 */
export default function DisabledAccessPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface"><UserX className="size-6 text-text-2" /></span>
      <p className="max-w-xs text-[17px]">{COPY.usuarioDesativado}</p>
      <ButtonLink href="/entrar" variant="secondary">Voltar para o início</ButtonLink>
    </main>
  );
}
