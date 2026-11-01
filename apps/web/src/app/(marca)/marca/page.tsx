import { Suspense } from "react";
import { PageHeader } from "@/components/ui/feedback";
import { BrandKitForm } from "@/features/brand/brand-kit-form";
import { LogoUploader } from "@/features/brand/logo-uploader";
import { brandContext } from "@/server/brand/context";
import { createUserClient } from "@/server/db/supabase";
import { signedLogoUrl } from "@/server/admin/brands";

/** Tela [Marca] Marca — kit da marca com logo e prévia do fecho (seção 10; épico 8.3). */
export default function BrandPage() {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-[14px] bg-surface" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { profile, t } = await brandContext();
  const supabase = await createUserClient();
  const { data: kit } = await supabase.from("marcas").select("id, nome, instagram, logo_path, cor_destaque, cta_padrao, tom_de_voz, idioma_anuncios").eq("id", profile.marcaId).single();
  if (!kit) return null;
  const logoUrl = await signedLogoUrl(kit.logo_path);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.marca.titulo} subtitle={t.marca.subtitulo} />
      <LogoUploader
        marcaId={kit.id}
        currentUrl={logoUrl}
        labels={{ enviar: t.admin.kitEnviarLogo, trocar: t.admin.kitTrocarLogo, dica: t.admin.kitLogoDica, erro: t.admin.kitLogoErro, enviando: t.admin.kitEnviando, semLogo: t.admin.kitLogoNaoEnviado, erroGenerico: t.erros.generico }}
      />
      <BrandKitForm kit={kit} logoUrl={logoUrl} t={t} />
    </div>
  );
}
