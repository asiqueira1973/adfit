import { redirect } from "next/navigation";

/** Senhas deixaram de existir (emenda MD-7: login só com Google). Links antigos voltam para /entrar. */
export default function RemovedPasswordPage() {
  redirect("/entrar");
}
