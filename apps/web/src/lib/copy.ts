/**
 * Textos da interface, literalmente como na seção 15 do spec (copy e tom de voz).
 * Placeholders `{n}`/`{contato_suporte}` são preenchidos por `fill`.
 */
export const COPY = {
  inicioVazio: "Comece pelo produto: suba uma foto da peça e a gente prepara a ficha.",
  produtosVazio: "Nenhum produto ainda. Pode ser foto de celular, no cabide ou em cima da mesa.",
  uploadErroFormato: "Esse arquivo não deu. Use foto JPG, PNG ou HEIC de até 10 MB.",
  uploadAvisoPessoa: "Se a foto tiver alguém, usamos só a peça.",
  fichaGerando: "Preparando a ficha da peça. Leva uns 2 minutos — pode sair que a gente guarda.",
  fichaPronta: "Confira se a peça está igual à real: cor, recortes e logo.",
  fichaRefazerCampo: "O que está diferente da peça real?",
  anuncioGerandoQuadros: "Montando as 3 cenas do seu anúncio…",
  anuncioAguardando: "Escolha a imagem de cada cena. Gostou das três? Gere o vídeo.",
  avisoQc: "Pode não estar fiel à peça — sugerimos refazer.",
  refazerQuadroCampo: "O que você quer mudar nessa cena? (opcional)",
  gerandoVideo: "Animando as cenas. Leva uns 5 minutos — avisamos aqui quando ficar pronto.",
  videoPronto: "Seu anúncio está pronto.",
  falhaCena: "Não conseguimos animar a cena {n}. Os créditos dela voltaram para você.",
  falhaGeral: "Algo deu errado do nosso lado. Os créditos voltaram para o seu saldo.",
  saldoInsuficiente: "Saldo insuficiente",
  comprarTitulo: "Escolha um pacote",
  pacoteRende: "Rende cerca de {n} anúncios",
  pacoteRende1: "Rende cerca de 1 anúncio",
  indoPagamento: "Abrindo o pagamento seguro…",
  confirmando: "Confirmando seu pagamento…",
  compraConcluida: "Pronto! {n} créditos adicionados.",
  compraCancelada: "Compra cancelada. Nada foi cobrado.",
  pagamentoFalhou: "O pagamento não foi aprovado. Tente outro cartão.",
  contaPausada: "Conta pausada. Fale com o suporte: {contato_suporte}",
  usuarioDesativado: "Seu acesso foi desativado. Fale com o suporte.",
  ajusteNegativoInvalido: "O ajuste deixaria o saldo negativo.",
  avisoTextoProibido:
    "Evite prometer resultado (ex.: emagrecer X kg). Isso pode derrubar seu anúncio no Instagram.",
  lembreteLogo: "Adicione seu logo para ele aparecer no fim dos vídeos.",
  feitoPor: "Feito pela {estudio}",
} as const;

/**
 * Preenche placeholders `{chave}` de um texto da seção 15.
 * Recebe: o texto e um mapa chave → valor. Devolve: o texto preenchido.
 */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
