import Link from "next/link";
import { AuthLayout } from "@/features/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

/**
 * Tela [Público] Entrar (seção 10): e-mail, senha e "Esqueci minha senha".
 * Fase de design: formulário sem ação; o login com Supabase Auth entra no épico 8.1 (seção 6).
 */
export default function SignInPage() {
  return (
    <AuthLayout title="Entrar" subtitle="Anúncios em vídeo para a sua marca, sem complicação.">
      <form className="flex flex-col gap-4">
        <TextField label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@suamarca.com" required />
        <TextField label="Senha" name="senha" type="password" autoComplete="current-password" required />
        <Button type="submit" className="mt-2">Entrar</Button>
        <Link href="/redefinir-senha" className="text-center text-[15px] font-medium text-brand-text">Esqueci minha senha</Link>
      </form>
    </AuthLayout>
  );
}
