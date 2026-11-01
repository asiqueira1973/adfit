// Captura as telas do AdFit em 390 px (todas) e 1280 px (admin), modo claro e escuro (seção 22.1).
// Recebe: BASE_URL (padrão http://localhost:3000) e OUT (padrão docs/design). Devolve: JPGs de página inteira.
// Uso: BASE_URL=http://localhost:57165 node scripts/capture-design.mjs [filtro]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "docs/design";
const filter = process.argv[2];

/** [nome do arquivo, caminho, é admin?] */
export const SCREENS = [
  ["01-entrar", "/entrar"],
  ["02-definir-senha", "/definir-senha"],
  ["02b-esqueci-senha", "/redefinir-senha"],
  ["02c-redefinir-senha", "/redefinir-senha?etapa=nova"],
  ["02d-acesso-desativado", "/acesso-desativado"],
  ["03-inicio", "/inicio"],
  ["03b-inicio-vazio", "/inicio?estado=vazio"],
  ["03c-inicio-pausada", "/inicio?pausada=1"],
  ["04-produtos", "/produtos"],
  ["04b-produtos-vazio", "/produtos?estado=vazio"],
  ["05-novo-produto", "/produtos/novo"],
  ["05b-novo-produto-enviando", "/produtos/novo?estado=enviando"],
  ["05c-novo-produto-erro", "/produtos/novo?estado=erro"],
  ["06-produto-sem-ficha", "/produtos/p2?estado=sem_ficha"],
  ["06b-produto-sem-saldo", "/produtos/p2?estado=sem_ficha&saldo=1"],
  ["06c-produto-gerando", "/produtos/p3?estado=gerando"],
  ["06d-produto-aguardando", "/produtos/p1?estado=aguardando"],
  ["06e-produto-aprovada", "/produtos/p1?estado=aprovada"],
  ["06f-produto-falhou", "/produtos/p2?estado=falhou"],
  ["07a-novo-anuncio-passo1", "/anuncios/novo?passo=1"],
  ["07b-novo-anuncio-passo2", "/anuncios/novo?passo=2"],
  ["07c-novo-anuncio-passo3", "/anuncios/novo?passo=3"],
  ["07d-novo-anuncio-passo4", "/anuncios/novo?passo=4"],
  ["07e-novo-anuncio-resumo", "/anuncios/novo?passo=5"],
  ["07f-novo-anuncio-sem-saldo", "/anuncios/novo?passo=5&saldo=0"],
  ["08a-anuncio-gerando", "/anuncios/a2?estado=gerando"],
  ["08b-anuncio-aguardando", "/anuncios/a2?estado=aguardando"],
  ["08c-anuncio-aguardando-16x9", "/anuncios/a2?estado=aguardando&formato=horizontal"],
  ["08d-anuncio-gerando-video", "/anuncios/a3?estado=gerando_video"],
  ["08e-anuncio-falha-cena", "/anuncios/a2?estado=falha_cena"],
  ["08f-anuncio-pronto", "/anuncios/a1?estado=pronto"],
  ["08g-anuncio-falhou", "/anuncios/a4?estado=falhou"],
  ["09-anuncios", "/anuncios"],
  ["09b-anuncios-vazio", "/anuncios?estado=vazio"],
  ["10-creditos", "/creditos"],
  ["10b-creditos-cancelada", "/creditos?estado=cancelada"],
  ["10c-comprar", "/creditos/comprar"],
  ["10d-comprar-abrindo", "/creditos/comprar?estado=abrindo"],
  ["10e-comprar-pausada", "/creditos/comprar?pausada=1"],
  ["10f-obrigado-confirmando", "/creditos/obrigado?estado=confirmando"],
  ["10g-obrigado-ok", "/creditos/obrigado?estado=ok"],
  ["10h-obrigado-falhou", "/creditos/obrigado?estado=falhou"],
  ["11-marca", "/marca"],
  ["12-admin-marcas", "/admin/marcas", true],
  ["12b-admin-nova-marca", "/admin/marcas?modal=nova", true],
  ["13a-admin-marca-kit", "/admin/marcas/marca-kore?aba=kit", true],
  ["13b-admin-marca-usuarios", "/admin/marcas/marca-kore?aba=usuarios", true],
  ["13c-admin-marca-extrato", "/admin/marcas/marca-kore?aba=extrato", true],
  ["13d-admin-marca-pagamentos", "/admin/marcas/marca-kore?aba=pagamentos", true],
  ["13e-admin-marca-anuncios", "/admin/marcas/marca-kore?aba=anuncios", true],
  ["13f-admin-lancar-creditos", "/admin/marcas/marca-kore?aba=extrato&modal=creditos", true],
  ["13g-admin-lancar-creditos-erro", "/admin/marcas/marca-kore?aba=extrato&modal=creditos&erro=negativo", true],
  ["13h-admin-convidar", "/admin/marcas/marca-kore?aba=usuarios&modal=convidar", true],
  ["14-admin-usuarios", "/admin/usuarios", true],
  ["14b-admin-usuarios-convidar", "/admin/usuarios?modal=convidar", true],
  ["15-admin-custos", "/admin/custos", true],
  ["16-admin-geracoes", "/admin/geracoes", true],
  ["16b-admin-geracao-detalhe", "/admin/geracoes?detalhe=g3", true],
  ["17-admin-configuracoes", "/admin/configuracoes", true],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let count = 0;
for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, deviceScaleFactor: 2, colorScheme: scheme });
    const page = await context.newPage();
    for (const [name, path, admin] of SCREENS) {
      if (width === 1280 && !admin) continue;
      if (filter && !name.includes(filter)) continue;
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        // Força o carregamento das imagens lazy antes da captura de página inteira.
        document.querySelectorAll("img[loading=lazy]").forEach((img) => (img.loading = "eager"));
        await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
      });
      // Estica a janela até a altura do documento: barras fixas (abas, rodapé) ficam no fim,
      // como no celular, em vez de aparecerem no meio de uma captura "fullPage".
      const baseHeight = width === 390 ? 844 : 800;
      const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width, height: Math.max(baseHeight, docHeight) });
      await page.waitForTimeout(300);
      const file = `${OUT}/${name}-${width}-${scheme === "light" ? "claro" : "escuro"}.jpg`;
      await page.screenshot({ path: file, type: "jpeg", quality: 72, scale: "css" });
      await page.setViewportSize({ width, height: baseHeight });
      count++;
    }
    await context.close();
  }
}
await browser.close();
console.log(`${count} capturas em ${OUT}`);
