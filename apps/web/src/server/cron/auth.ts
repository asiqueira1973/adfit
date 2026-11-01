import "server-only";
import { safeEqual } from "@/server/higgsfield/webhook";

/**
 * Confere o cabeçalho `Authorization: Bearer <CRON_SECRET>` das varreduras (o cron da Vercel e o
 * agendamento do GitHub mandam o mesmo formato). Sem segredo configurado, recusa sempre.
 * Recebe: cabeçalho e segredo. Devolve: se está autorizado (comparação em tempo constante).
 */
export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header?.startsWith("Bearer ")) return false;
  return safeEqual(header.slice(7), secret);
}
