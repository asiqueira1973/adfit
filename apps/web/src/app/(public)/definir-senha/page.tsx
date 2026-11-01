import { AuthLayout } from "@/features/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

/**
 * Tela [Público] Definir senha (seção 6.2): primeiro acesso pelo link do convite,
 * nova senha + confirmação, mínimo 8 caracteres. Ligada ao Supabase Auth no épico 8.1.
 */
export default function SetPasswordPage() {
  return (
    <AuthLayout title="Crie sua senha" subtitle="Use pelo menos 8 caracteres." image={false}>
      <form className="flex flex-col gap-4">
        <TextField label="Nova senha" name="senha" type="password" autoComplete="new-password" minLength={8} required />
        <TextField label="Confirme a senha" name="confirmacao" type="password" autoComplete="new-password" minLength={8} required />
        <Button type="submit" className="mt-2">Salvar</Button>
      </form>
    </AuthLayout>
  );
}
