import Link from "next/link";
import { LogOut, Store } from "lucide-react";

/**
 * Menu do perfil (seção 10): avatar com iniciais que abre "Marca" e "Sair".
 * Usa <details> nativo (funciona sem JavaScript e com teclado).
 * Recebe: nome do usuário e da marca. Devolve: o menu.
 */
export function ProfileMenu({ userName, brandName }: { userName: string; brandName: string }) {
  const initials = userName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <details className="relative">
      <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full [&::-webkit-details-marker]:hidden" aria-label="Menu do perfil">
        <span className="flex size-8 items-center justify-center rounded-full bg-surface text-[13px] font-semibold">{initials}</span>
      </summary>
      <div className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-[14px] border border-hairline bg-bg shadow-lg">
        <div className="border-b border-hairline px-4 py-3">
          <div className="text-[15px] font-semibold">{userName}</div>
          <div className="text-[13px] text-text-2">{brandName}</div>
        </div>
        <Link href="/marca" className="flex min-h-11 items-center gap-3 px-4 text-[15px] hover:bg-surface">
          <Store className="size-4.5 text-text-2" /> Marca
        </Link>
        <Link href="/sair" className="flex min-h-11 items-center gap-3 px-4 text-[15px] text-danger hover:bg-surface">
          <LogOut className="size-4.5" /> Sair
        </Link>
      </div>
    </details>
  );
}
