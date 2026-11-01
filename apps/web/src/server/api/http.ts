import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { getDictionary, type Dictionary, type Locale } from "@/lib/i18n";
import { fill } from "@/lib/copy";
import { getSupportContact } from "../brand/queries";

/**
 * Resposta de erro no formato da seção 13: `{ "erro": "<codigo>", "mensagem": "<texto para o usuário>" }`.
 * Recebe: código, mensagem e status HTTP. Devolve: a resposta JSON.
 */
export function jsonError(erro: string, mensagem: string, status: number): NextResponse {
  return NextResponse.json({ erro, mensagem }, { status });
}

/** 400 de validação Zod, com os campos inválidos (para destacar no formulário). */
export function validationError(error: ZodError, t: Dictionary): NextResponse {
  return NextResponse.json(
    { erro: "validacao", mensagem: t.erros.validacao, campos: error.issues.map((i) => i.path.join(".")) },
    { status: 400 },
  );
}

/**
 * Códigos de erro de negócio levantados pelas funções do banco (MESSAGE = código, seção 7.5)
 * e a mensagem/status que a API devolve. Recebe: código e dicionário. Devolve: { mensagem, status }.
 */
export function businessError(code: string, t: Dictionary, supportContact = ""): { mensagem: string; status: number } {
  const map: Record<string, { mensagem: string; status: number }> = {
    validacao: { mensagem: t.erros.validacao, status: 400 },
    marca_inativa: { mensagem: fill(t.copy.contaPausada, { contato_suporte: supportContact }), status: 423 },
    nao_autorizado: { mensagem: t.erros.naoAutorizado, status: 403 },
    saldo_negativo: { mensagem: t.copy.ajusteNegativoInvalido, status: 422 },
    compra_exige_valor: { mensagem: t.erros.compraExigeValor, status: 422 },
    observacao_obrigatoria: { mensagem: t.erros.observacaoObrigatoria, status: 422 },
    quantidade_invalida: { mensagem: t.erros.quantidadeInvalida, status: 422 },
    tipo_invalido: { mensagem: t.erros.validacao, status: 422 },
    marca_inexistente: { mensagem: t.erros.marcaInexistente, status: 404 },
    usuario_inexistente: { mensagem: t.erros.usuarioInexistente, status: 404 },
    email_existente: { mensagem: t.erros.emailExistente, status: 409 },
    foto_inexistente: { mensagem: t.erros.generico, status: 404 },
    pacote_inexistente: { mensagem: t.erros.pacoteInexistente, status: 404 },
    price_invalido: { mensagem: t.erros.priceInvalido, status: 422 },
    saldo_insuficiente: { mensagem: t.copy.saldoInsuficiente, status: 402 },
    produto_inexistente: { mensagem: t.erros.produtoInexistente, status: 404 },
    produto_arquivado: { mensagem: t.erros.produtoArquivado, status: 422 },
    produto_sem_fotos: { mensagem: t.erros.produtoSemFotos, status: 422 },
    ficha_em_geracao: { mensagem: t.erros.fichaEmGeracao, status: 409 },
    ficha_inexistente: { mensagem: t.erros.fichaInexistente, status: 404 },
    transicao_invalida: { mensagem: t.erros.transicaoInvalida, status: 409 },
    geracao_inexistente: { mensagem: t.erros.geracaoInexistente, status: 404 },
  };
  return map[code] ?? { mensagem: t.erros.generico, status: 500 };
}

/** Erro de negócio com código conhecido, lançado pelos serviços do servidor. */
export class BusinessError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

/**
 * Extrai o código de negócio de um erro do Supabase/Postgres (a função levanta `raise exception '<codigo>'`).
 * Recebe: o erro. Devolve: o código, ou null se não for um erro de negócio conhecido.
 */
export function businessCodeOf(error: unknown): string | null {
  if (error instanceof BusinessError) return error.code;
  const message = typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : "";
  return /^[a-z_]+$/.test(message) ? message : null;
}

/**
 * Converte qualquer erro de serviço em resposta JSON da seção 13. Marca pausada (`marca_inativa`)
 * responde "Conta pausada. Fale com o suporte: {contato}" (seções 6.3 e 15).
 */
export async function errorResponse(error: unknown, locale: Locale): Promise<NextResponse> {
  const t = getDictionary(locale);
  const code = businessCodeOf(error);
  if (code) {
    const contact = code === "marca_inativa" ? await getSupportContact() : "";
    const { mensagem, status } = businessError(code, t, contact);
    if (status !== 500) return jsonError(code, mensagem, status);
  }
  console.error("Erro inesperado na API:", error instanceof Error ? error.message : error);
  return jsonError("erro_interno", t.erros.generico, 500);
}
