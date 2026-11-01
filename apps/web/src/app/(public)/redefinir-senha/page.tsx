import { Suspense } from "react";
import { AuthLayout } from "@/features/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

/**
 * Tela [Público] Redefinir senha (seção 6.2): sem token pede o e-mail ("esqueci minha senha");
 * com o link do e-mail (`?etapa=nova`) pede nova senha + confirmação. Ligada no épico 8.1.
 */
export default function ResetPasswordPage({ searchParams }: PageProps<"/redefinir-senha">) {
  return (
    <Suspense>
      <ResetPasswordForm searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordForm({ searchParams }: { searchParams: PageProps<"/redefinir-senha">["searchParams"] }) {
  const { etapa } = await searchParams;
  if (etapa === "nova") {
    return (
      <AuthLayout title="Nova senha" subtitle="Use pelo menos 8 caracteres." image={false}>
        <form className="flex flex-col gap-4">
          <TextField label="Nova senha" name="senha" type="password" autoComplete="new-password" minLength={8} required />
          <TextField label="Confirme a senha" name="confirmacao" type="password" autoComplete="new-password" minLength={8} required />
          <Button type="submit" className="mt-2">Salvar</Button>
        </form>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Esqueci minha senha" subtitle="Mandamos um link para você criar uma nova." image={false}>
      <form className="flex flex-col gap-4">
        <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
        <Button type="submit" className="mt-2">Enviar link</Button>
      </form>
    </AuthLayout>
  );
}
