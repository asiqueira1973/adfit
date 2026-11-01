import { redirect } from "next/navigation";

/**
 * Raiz do app: no esqueleto (épico 8.0) só leva para a tela de entrada.
 * No épico 8.1 o proxy decide entre Início da marca e painel admin.
 */
export default function Home() {
  redirect("/entrar");
}
