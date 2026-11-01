import { redirect } from "next/navigation";

/** Raiz do admin: abre a lista de marcas (primeiro item do menu, seção 16.4). */
export default function AdminIndex() {
  redirect("/admin/marcas");
}
