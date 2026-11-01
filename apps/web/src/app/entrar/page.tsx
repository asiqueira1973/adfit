import { APP_NAME } from "@/lib/constants";

/**
 * Tela [Público] Entrar — esqueleto do épico 8.0 (critério: responder 200 na Vercel).
 * O formulário real (seção 6 e 10) entra no épico 8.1 a partir do design aprovado.
 */
export default function SignInPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <h1 className="text-[28px] font-bold tracking-tight">{APP_NAME}</h1>
    </main>
  );
}
