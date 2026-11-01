


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."acao_cobravel" AS ENUM (
    'gerar_ficha',
    'refazer_ficha',
    'gerar_roteiro_quadros',
    'refazer_quadro',
    'gerar_video',
    'refazer_clipe',
    'remontar_texto'
);


ALTER TYPE "public"."acao_cobravel" OWNER TO "postgres";


CREATE TYPE "public"."categoria_peca" AS ENUM (
    'top',
    'legging',
    'shorts',
    'camiseta',
    'regata',
    'jaqueta',
    'conjunto',
    'outro'
);


ALTER TYPE "public"."categoria_peca" OWNER TO "postgres";


CREATE TYPE "public"."cenario" AS ENUM (
    'academia',
    'box_crossfit',
    'estudio_funcional',
    'ao_ar_livre_urbano',
    'ao_ar_livre_natureza',
    'pista_de_corrida'
);


ALTER TYPE "public"."cenario" OWNER TO "postgres";


CREATE TYPE "public"."estilo_video" AS ENUM (
    'energetico',
    'cinematografico',
    'lifestyle'
);


ALTER TYPE "public"."estilo_video" OWNER TO "postgres";


CREATE TYPE "public"."faixa_etaria" AS ENUM (
    'de_20_a_30',
    'de_30_a_45',
    'acima_de_45'
);


ALTER TYPE "public"."faixa_etaria" OWNER TO "postgres";


CREATE TYPE "public"."feedback_status" AS ENUM (
    'novo',
    'visto',
    'resolvido'
);


ALTER TYPE "public"."feedback_status" OWNER TO "postgres";


CREATE TYPE "public"."feedback_tipo" AS ENUM (
    'problema',
    'sugestao'
);


ALTER TYPE "public"."feedback_tipo" OWNER TO "postgres";


CREATE TYPE "public"."formato_video" AS ENUM (
    'vertical_9_16',
    'horizontal_16_9'
);


ALTER TYPE "public"."formato_video" OWNER TO "postgres";


CREATE TYPE "public"."genero_alvo" AS ENUM (
    'feminino',
    'masculino',
    'unissex'
);


ALTER TYPE "public"."genero_alvo" OWNER TO "postgres";


CREATE TYPE "public"."genero_modelo" AS ENUM (
    'mulher',
    'homem'
);


ALTER TYPE "public"."genero_modelo" OWNER TO "postgres";


CREATE TYPE "public"."idioma" AS ENUM (
    'pt_br',
    'en'
);


ALTER TYPE "public"."idioma" OWNER TO "postgres";


CREATE TYPE "public"."modalidade" AS ENUM (
    'musculacao',
    'crossfit',
    'hyrox',
    'corrida',
    'funcional',
    'yoga_pilates'
);


ALTER TYPE "public"."modalidade" OWNER TO "postgres";


CREATE TYPE "public"."papel_usuario" AS ENUM (
    'admin_plataforma',
    'usuario_marca'
);


ALTER TYPE "public"."papel_usuario" OWNER TO "postgres";


CREATE TYPE "public"."status_anuncio" AS ENUM (
    'gerando_roteiro',
    'gerando_quadros',
    'aguardando_aprovacao',
    'gerando_clipes',
    'montando',
    'pronto',
    'falhou'
);


ALTER TYPE "public"."status_anuncio" OWNER TO "postgres";


CREATE TYPE "public"."status_ficha" AS ENUM (
    'gerando',
    'aguardando_aprovacao',
    'aprovada',
    'descartada',
    'falhou'
);


ALTER TYPE "public"."status_ficha" OWNER TO "postgres";


CREATE TYPE "public"."status_geracao" AS ENUM (
    'na_fila',
    'processando',
    'concluida',
    'falhou',
    'bloqueada_nsfw'
);


ALTER TYPE "public"."status_geracao" OWNER TO "postgres";


CREATE TYPE "public"."status_item" AS ENUM (
    'gerando',
    'pronto',
    'descartado',
    'falhou'
);


ALTER TYPE "public"."status_item" OWNER TO "postgres";


CREATE TYPE "public"."status_pagamento" AS ENUM (
    'iniciado',
    'pago',
    'falhou',
    'expirado',
    'reembolsado'
);


ALTER TYPE "public"."status_pagamento" OWNER TO "postgres";


CREATE TYPE "public"."tipo_geracao" AS ENUM (
    'ficha_produto',
    'quadro_chave',
    'clipe_video'
);


ALTER TYPE "public"."tipo_geracao" OWNER TO "postgres";


CREATE TYPE "public"."tipo_movimentacao" AS ENUM (
    'compra',
    'bonus',
    'consumo',
    'estorno',
    'ajuste_manual'
);


ALTER TYPE "public"."tipo_movimentacao" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."aprovar_ficha"("p_ficha_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_ficha public.fichas_produto%rowtype;
begin
  select * into v_ficha from public.fichas_produto where id = p_ficha_id;
  if not found then
    raise exception 'ficha_inexistente';
  end if;
  -- Trava o produto: serializa aprovações concorrentes de versões diferentes.
  perform 1 from public.produtos where id = v_ficha.produto_id for update;
  select * into v_ficha from public.fichas_produto where id = p_ficha_id for update;

  if v_ficha.status not in ('aguardando_aprovacao', 'aprovada', 'descartada') or v_ficha.imagem_path is null then
    raise exception 'transicao_invalida';
  end if;

  update public.fichas_produto set status = 'aprovada' where id = p_ficha_id;
  update public.fichas_produto set status = 'descartada'
  where produto_id = v_ficha.produto_id and id <> p_ficha_id and status in ('aguardando_aprovacao', 'aprovada');
  update public.produtos set ficha_aprovada_id = p_ficha_id where id = v_ficha.produto_id;

  return v_ficha.produto_id;
end;
$$;


ALTER FUNCTION "public"."aprovar_ficha"("p_ficha_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bloquear_alteracao_movimentacao"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  raise exception 'livro_razao_imutavel';
end;
$$;


ALTER FUNCTION "public"."bloquear_alteracao_movimentacao"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."creditar_pagamento"("p_pagamento_id" "uuid", "p_stripe_payment_intent_id" "text", "p_valor_centavos" integer, "p_moeda" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_pag public.pagamentos%rowtype;
  v_saldo integer;
  v_id uuid;
begin
  select * into v_pag from public.pagamentos where id = p_pagamento_id for update;
  if not found then
    raise exception 'pagamento_inexistente';
  end if;
  if v_pag.status in ('pago', 'reembolsado') then
    select id into v_id from public.movimentacoes_creditos where pagamento_id = p_pagamento_id;
    return v_id;
  end if;
  if v_pag.status <> 'iniciado' then
    raise exception 'transicao_invalida';
  end if;
  if coalesce(p_valor_centavos, 0) <= 0 or p_moeda is null then
    raise exception 'compra_exige_valor';
  end if;

  update public.pagamentos
  set status = 'pago', pago_em = now(), stripe_payment_intent_id = p_stripe_payment_intent_id,
      valor_centavos = p_valor_centavos, moeda = lower(p_moeda)
  where id = p_pagamento_id;

  select saldo_creditos into v_saldo from public.marcas where id = v_pag.marca_id for update;
  perform set_config('app.alterando_saldo', 'sim', true);
  update public.marcas set saldo_creditos = saldo_creditos + v_pag.creditos where id = v_pag.marca_id;
  perform set_config('app.alterando_saldo', 'nao', true);

  insert into public.movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, valor_pago_centavos, moeda, pagamento_id, criado_por)
  values (v_pag.marca_id, 'compra', v_pag.creditos, v_saldo + v_pag.creditos, p_valor_centavos, lower(p_moeda), p_pagamento_id, v_pag.criado_por)
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."creditar_pagamento"("p_pagamento_id" "uuid", "p_stripe_payment_intent_id" "text", "p_valor_centavos" integer, "p_moeda" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debitar_creditos"("p_marca_id" "uuid", "p_acao" "public"."acao_cobravel", "p_quantidade_itens" integer, "p_referencia_tipo" "text", "p_referencia_id" "uuid", "p_criado_por" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_marca public.marcas%rowtype;
  v_preco integer;
  v_total integer;
  v_id uuid;
begin
  if p_quantidade_itens is null or p_quantidade_itens < 1 then
    raise exception 'quantidade_invalida';
  end if;

  select * into v_marca from public.marcas where id = p_marca_id for update;
  if not found then
    raise exception 'marca_inexistente';
  end if;
  if not v_marca.ativa then
    raise exception 'marca_inativa';
  end if;

  select creditos into v_preco from public.precos_acoes where acao = p_acao;
  if v_preco is null then
    raise exception 'preco_inexistente';
  end if;

  v_total := v_preco * p_quantidade_itens;
  if v_total = 0 then
    return null;
  end if;
  if v_marca.saldo_creditos < v_total then
    raise exception 'saldo_insuficiente';
  end if;

  perform set_config('app.alterando_saldo', 'sim', true);
  update public.marcas set saldo_creditos = saldo_creditos - v_total where id = p_marca_id;
  perform set_config('app.alterando_saldo', 'nao', true);

  insert into public.movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, acao, referencia_tipo, referencia_id, criado_por)
  values (p_marca_id, 'consumo', -v_total, v_marca.saldo_creditos - v_total, p_acao, p_referencia_tipo, p_referencia_id, p_criado_por)
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."debitar_creditos"("p_marca_id" "uuid", "p_acao" "public"."acao_cobravel", "p_quantidade_itens" integer, "p_referencia_tipo" "text", "p_referencia_id" "uuid", "p_criado_por" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."definir_atualizado_em"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."definir_atualizado_em"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."eh_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'admin_plataforma' and ativo
  );
$$;


ALTER FUNCTION "public"."eh_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."estornar_creditos"("p_movimentacao_id" "uuid", "p_observacao" "text", "p_quantidade" integer DEFAULT NULL::integer, "p_referencia_tipo" "text" DEFAULT NULL::"text", "p_referencia_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_original public.movimentacoes_creditos%rowtype;
  v_saldo integer;
  v_ja_estornado integer;
  v_valor integer;
  v_id uuid;
begin
  select * into v_original from public.movimentacoes_creditos where id = p_movimentacao_id;
  if not found or v_original.tipo <> 'consumo' then
    raise exception 'consumo_inexistente';
  end if;

  -- Trava a marca primeiro: serializa estornos concorrentes do mesmo consumo.
  select saldo_creditos into v_saldo from public.marcas where id = v_original.marca_id for update;

  select coalesce(sum(quantidade), 0) into v_ja_estornado
  from public.movimentacoes_creditos
  where estorno_de_id = p_movimentacao_id;

  if p_quantidade is null then
    if v_ja_estornado > 0 then
      raise exception 'ja_estornado';
    end if;
    v_valor := -v_original.quantidade;
  else
    if p_quantidade < 1 then
      raise exception 'quantidade_invalida';
    end if;
    if exists (
      select 1 from public.movimentacoes_creditos
      where estorno_de_id = p_movimentacao_id
        and referencia_id is not distinct from p_referencia_id
    ) then
      raise exception 'ja_estornado';
    end if;
    if v_ja_estornado + p_quantidade > -v_original.quantidade then
      raise exception 'ja_estornado';
    end if;
    v_valor := p_quantidade;
  end if;

  perform set_config('app.alterando_saldo', 'sim', true);
  update public.marcas set saldo_creditos = saldo_creditos + v_valor where id = v_original.marca_id;
  perform set_config('app.alterando_saldo', 'nao', true);

  insert into public.movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, acao, referencia_tipo, referencia_id, estorno_de_id, observacao)
  values (
    v_original.marca_id, 'estorno', v_valor, v_saldo + v_valor, v_original.acao,
    coalesce(p_referencia_tipo, v_original.referencia_tipo),
    coalesce(p_referencia_id, v_original.referencia_id),
    p_movimentacao_id, p_observacao
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."estornar_creditos"("p_movimentacao_id" "uuid", "p_observacao" "text", "p_quantidade" integer, "p_referencia_tipo" "text", "p_referencia_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."estornar_pagamento"("p_pagamento_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_pag public.pagamentos%rowtype;
  v_saldo integer;
  v_debito integer;
  v_id uuid;
  v_nota text;
begin
  select * into v_pag from public.pagamentos where id = p_pagamento_id for update;
  if not found then
    raise exception 'pagamento_inexistente';
  end if;
  if v_pag.status = 'reembolsado' then
    return null;
  end if;
  if v_pag.status <> 'pago' then
    raise exception 'transicao_invalida';
  end if;

  select saldo_creditos into v_saldo from public.marcas where id = v_pag.marca_id for update;
  v_debito := least(v_pag.creditos, v_saldo);

  if v_debito > 0 then
    perform set_config('app.alterando_saldo', 'sim', true);
    update public.marcas set saldo_creditos = saldo_creditos - v_debito where id = v_pag.marca_id;
    perform set_config('app.alterando_saldo', 'nao', true);

    insert into public.movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, observacao)
    values (v_pag.marca_id, 'ajuste_manual', -v_debito, v_saldo - v_debito,
            format('Reembolso na Stripe do pagamento %s (%s créditos)', p_pagamento_id, v_pag.creditos))
    returning id into v_id;
  end if;

  if v_debito < v_pag.creditos then
    v_nota := format('Reembolso de %s créditos: só %s debitados por falta de saldo; diferença de %s créditos já usados.',
                     v_pag.creditos, v_debito, v_pag.creditos - v_debito);
  end if;

  update public.pagamentos
  set status = 'reembolsado',
      observacao = nullif(concat_ws(' ', observacao, v_nota), '')
  where id = p_pagamento_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."estornar_pagamento"("p_pagamento_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lancar_creditos"("p_marca_id" "uuid", "p_tipo" "public"."tipo_movimentacao", "p_quantidade" integer, "p_valor_pago_centavos" integer, "p_observacao" "text", "p_criado_por" "uuid", "p_moeda" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_saldo integer;
  v_id uuid;
  v_observacao text := nullif(btrim(p_observacao), '');
begin
  if p_tipo not in ('compra', 'bonus', 'ajuste_manual') then
    raise exception 'tipo_invalido';
  end if;
  if p_quantidade is null or p_quantidade = 0 then
    raise exception 'quantidade_invalida';
  end if;
  if p_tipo = 'compra' and (p_quantidade < 0 or coalesce(p_valor_pago_centavos, 0) <= 0 or p_moeda is null) then
    raise exception 'compra_exige_valor';
  end if;
  if p_tipo in ('bonus', 'ajuste_manual') and v_observacao is null then
    raise exception 'observacao_obrigatoria';
  end if;
  if p_tipo = 'bonus' and p_quantidade < 0 then
    raise exception 'quantidade_invalida';
  end if;

  select saldo_creditos into v_saldo from public.marcas where id = p_marca_id for update;
  if not found then
    raise exception 'marca_inexistente';
  end if;
  if v_saldo + p_quantidade < 0 then
    raise exception 'saldo_negativo';
  end if;

  perform set_config('app.alterando_saldo', 'sim', true);
  update public.marcas set saldo_creditos = saldo_creditos + p_quantidade where id = p_marca_id;
  perform set_config('app.alterando_saldo', 'nao', true);

  insert into public.movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, valor_pago_centavos, moeda, observacao, criado_por)
  values (
    p_marca_id, p_tipo, p_quantidade, v_saldo + p_quantidade,
    case when p_tipo = 'compra' then p_valor_pago_centavos end,
    case when p_tipo = 'compra' then lower(p_moeda) end,
    v_observacao, p_criado_por
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."lancar_creditos"("p_marca_id" "uuid", "p_tipo" "public"."tipo_movimentacao", "p_quantidade" integer, "p_valor_pago_centavos" integer, "p_observacao" "text", "p_criado_por" "uuid", "p_moeda" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."limitar_fotos_produto"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform 1 from public.produtos where id = new.produto_id for update;
  if (select count(*) from public.fotos_produto where produto_id = new.produto_id) >= 4 then
    raise exception 'limite_fotos';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."limitar_fotos_produto"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."minha_marca_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select marca_id from public.perfis where id = (select auth.uid()) and ativo;
$$;


ALTER FUNCTION "public"."minha_marca_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pegar_proximo_anuncio_para_montar"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.anuncios
  where status = 'montando'
    and tentativas_montagem < 3
    and (montagem_iniciada_em is null or montagem_iniciada_em < now() - interval '10 minutes')
  order by atualizado_em
  limit 1
  for update skip locked;

  if v_id is null then
    return null;
  end if;

  update public.anuncios
  set erro = null, montagem_iniciada_em = now(), tentativas_montagem = tentativas_montagem + 1
  where id = v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."pegar_proximo_anuncio_para_montar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pode_gravar_original"("p_nome" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select (storage.foldername(p_nome))[3] = 'originais'
     and ((storage.foldername(p_nome))[1] = public.minha_marca_id()::text or public.eh_admin())
     and exists (
       select 1 from public.produtos p
       where p.id::text = (storage.foldername(p_nome))[2]
         and p.marca_id::text = (storage.foldername(p_nome))[1]
         and p.ficha_aprovada_id is null
     );
$$;


ALTER FUNCTION "public"."pode_gravar_original"("p_nome" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."proteger_saldo_marca"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.saldo_creditos is distinct from old.saldo_creditos
     and coalesce(current_setting('app.alterando_saldo', true), '') <> 'sim' then
    raise exception 'saldo_protegido';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."proteger_saldo_marca"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."anuncios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "marca_id" "uuid" NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "ficha_id" "uuid" NOT NULL,
    "criado_por" "uuid" NOT NULL,
    "titulo" "text" NOT NULL,
    "cenario" "public"."cenario" NOT NULL,
    "modalidade" "public"."modalidade" NOT NULL,
    "genero_modelo" "public"."genero_modelo" NOT NULL,
    "faixa_etaria" "public"."faixa_etaria" DEFAULT 'de_20_a_30'::"public"."faixa_etaria" NOT NULL,
    "estilo" "public"."estilo_video" DEFAULT 'energetico'::"public"."estilo_video" NOT NULL,
    "formato" "public"."formato_video" DEFAULT 'vertical_9_16'::"public"."formato_video" NOT NULL,
    "com_texto" boolean DEFAULT true NOT NULL,
    "texto_oferta" "text",
    "observacoes" "text",
    "status" "public"."status_anuncio" DEFAULT 'gerando_roteiro'::"public"."status_anuncio" NOT NULL,
    "roteiro" "jsonb",
    "prompt_versao" "text",
    "video_final_path" "text",
    "versao_montagem" integer DEFAULT 0 NOT NULL,
    "montagem_iniciada_em" timestamp with time zone,
    "tentativas_montagem" smallint DEFAULT 0 NOT NULL,
    "erro" "text",
    "arquivado" boolean DEFAULT false NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "anuncios_observacoes_check" CHECK (("char_length"("observacoes") <= 200)),
    CONSTRAINT "anuncios_tentativas_montagem_check" CHECK (("tentativas_montagem" >= 0)),
    CONSTRAINT "anuncios_texto_oferta_check" CHECK (("char_length"("texto_oferta") <= 40)),
    CONSTRAINT "anuncios_versao_montagem_check" CHECK (("versao_montagem" >= 0))
);


ALTER TABLE "public"."anuncios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cenas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "anuncio_id" "uuid" NOT NULL,
    "marca_id" "uuid" NOT NULL,
    "ordem" smallint NOT NULL,
    "descricao" "text" NOT NULL,
    "prompt_quadro" "text" NOT NULL,
    "prompt_movimento" "text" NOT NULL,
    "texto_tela" "text",
    "quadro_atual_id" "uuid",
    "clipe_atual_id" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cenas_ordem_check" CHECK ((("ordem" >= 1) AND ("ordem" <= 3))),
    CONSTRAINT "cenas_texto_tela_check" CHECK (("texto_tela" ~ '^[^\n]{1,32}(\n[^\n]{1,32})?$'::"text"))
);


ALTER TABLE "public"."cenas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cena_id" "uuid" NOT NULL,
    "marca_id" "uuid" NOT NULL,
    "quadro_id" "uuid" NOT NULL,
    "versao" integer NOT NULL,
    "status" "public"."status_item" DEFAULT 'gerando'::"public"."status_item" NOT NULL,
    "video_path" "text",
    "geracao_id" "uuid",
    "instrucao_refacao" "text",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "clipes_instrucao_refacao_check" CHECK (("char_length"("instrucao_refacao") <= 200)),
    CONSTRAINT "clipes_versao_check" CHECK (("versao" >= 1))
);


ALTER TABLE "public"."clipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."configuracoes" (
    "chave" "text" NOT NULL,
    "valor" "jsonb" NOT NULL,
    "descricao" "text" NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."configuracoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedbacks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "marca_id" "uuid",
    "tipo" "public"."feedback_tipo" NOT NULL,
    "texto" "text" NOT NULL,
    "tela" "text",
    "status" "public"."feedback_status" DEFAULT 'novo'::"public"."feedback_status" NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedbacks_tela_check" CHECK (("char_length"("tela") <= 300)),
    CONSTRAINT "feedbacks_texto_check" CHECK ((("char_length"("texto") >= 1) AND ("char_length"("texto") <= 2000)))
);


ALTER TABLE "public"."feedbacks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fichas_produto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "marca_id" "uuid" NOT NULL,
    "versao" integer NOT NULL,
    "status" "public"."status_ficha" DEFAULT 'gerando'::"public"."status_ficha" NOT NULL,
    "imagem_path" "text",
    "geracao_id" "uuid",
    "instrucao_refacao" "text",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fichas_produto_instrucao_refacao_check" CHECK (("char_length"("instrucao_refacao") <= 200)),
    CONSTRAINT "fichas_produto_versao_check" CHECK (("versao" >= 1))
);


ALTER TABLE "public"."fichas_produto" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fotos_produto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "marca_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "ordem" smallint DEFAULT 1 NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fotos_produto_caminho_chk" CHECK (("storage_path" ~ (((('^produtos/'::"text" || ("marca_id")::"text") || '/'::"text") || ("produto_id")::"text") || '/originais/[^/]+$'::"text"))),
    CONSTRAINT "fotos_produto_ordem_check" CHECK ((("ordem" >= 1) AND ("ordem" <= 4)))
);


ALTER TABLE "public"."fotos_produto" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."geracoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "marca_id" "uuid" NOT NULL,
    "tipo" "public"."tipo_geracao" NOT NULL,
    "modelo" "text" NOT NULL,
    "request_id" "text",
    "status" "public"."status_geracao" DEFAULT 'na_fila'::"public"."status_geracao" NOT NULL,
    "entrada" "jsonb" NOT NULL,
    "resultado_url" "text",
    "custo_usd" numeric(10,4),
    "tentativa" smallint DEFAULT 1 NOT NULL,
    "erro" "text",
    "cobranca_id" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "concluido_em" timestamp with time zone,
    CONSTRAINT "geracoes_tentativa_check" CHECK (("tentativa" >= 1))
);


ALTER TABLE "public"."geracoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marcas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "instagram" "text",
    "logo_path" "text",
    "cor_destaque" "text",
    "cta_padrao" "text" DEFAULT 'Compre pelo link da bio'::"text" NOT NULL,
    "tom_de_voz" "text",
    "idioma_anuncios" "public"."idioma" DEFAULT 'pt_br'::"public"."idioma" NOT NULL,
    "saldo_creditos" integer DEFAULT 0 NOT NULL,
    "ativa" boolean DEFAULT true NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "marcas_cor_destaque_check" CHECK (("cor_destaque" ~ '^#[0-9A-Fa-f]{6}$'::"text")),
    CONSTRAINT "marcas_cta_padrao_check" CHECK (("char_length"("cta_padrao") <= 40)),
    CONSTRAINT "marcas_instagram_check" CHECK (("instagram" ~ '^[A-Za-z0-9._]{1,30}$'::"text")),
    CONSTRAINT "marcas_logo_caminho_chk" CHECK ((("logo_path" IS NULL) OR ("logo_path" ~ (('^'::"text" || ("id")::"text") || '/logo/[^/]+$'::"text")))),
    CONSTRAINT "marcas_saldo_creditos_check" CHECK (("saldo_creditos" >= 0))
);


ALTER TABLE "public"."marcas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."movimentacoes_creditos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "marca_id" "uuid" NOT NULL,
    "tipo" "public"."tipo_movimentacao" NOT NULL,
    "quantidade" integer NOT NULL,
    "saldo_apos" integer NOT NULL,
    "acao" "public"."acao_cobravel",
    "referencia_tipo" "text",
    "referencia_id" "uuid",
    "estorno_de_id" "uuid",
    "valor_pago_centavos" integer,
    "moeda" "text",
    "pagamento_id" "uuid",
    "observacao" "text",
    "criado_por" "uuid",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "movimentacoes_acao_chk" CHECK ((("tipo" = ANY (ARRAY['consumo'::"public"."tipo_movimentacao", 'estorno'::"public"."tipo_movimentacao"])) = ("acao" IS NOT NULL))),
    CONSTRAINT "movimentacoes_creditos_moeda_check" CHECK (("moeda" ~ '^[a-z]{3}$'::"text")),
    CONSTRAINT "movimentacoes_creditos_quantidade_check" CHECK (("quantidade" <> 0)),
    CONSTRAINT "movimentacoes_creditos_referencia_tipo_check" CHECK (("referencia_tipo" = ANY (ARRAY['ficha'::"text", 'anuncio'::"text", 'quadro'::"text", 'clipe'::"text"]))),
    CONSTRAINT "movimentacoes_creditos_saldo_apos_check" CHECK (("saldo_apos" >= 0)),
    CONSTRAINT "movimentacoes_estorno_chk" CHECK ((("tipo" = 'estorno'::"public"."tipo_movimentacao") = ("estorno_de_id" IS NOT NULL))),
    CONSTRAINT "movimentacoes_observacao_chk" CHECK ((("tipo" <> ALL (ARRAY['bonus'::"public"."tipo_movimentacao", 'ajuste_manual'::"public"."tipo_movimentacao"])) OR (NULLIF("btrim"("observacao"), ''::"text") IS NOT NULL))),
    CONSTRAINT "movimentacoes_pagamento_chk" CHECK ((("pagamento_id" IS NULL) OR ("tipo" = 'compra'::"public"."tipo_movimentacao"))),
    CONSTRAINT "movimentacoes_sinal_chk" CHECK (((("tipo" = 'consumo'::"public"."tipo_movimentacao") AND ("quantidade" < 0)) OR (("tipo" = ANY (ARRAY['compra'::"public"."tipo_movimentacao", 'bonus'::"public"."tipo_movimentacao", 'estorno'::"public"."tipo_movimentacao"])) AND ("quantidade" > 0)) OR ("tipo" = 'ajuste_manual'::"public"."tipo_movimentacao"))),
    CONSTRAINT "movimentacoes_valor_chk" CHECK (((("tipo" = 'compra'::"public"."tipo_movimentacao") AND ("valor_pago_centavos" > 0) AND ("moeda" IS NOT NULL)) OR (("tipo" <> 'compra'::"public"."tipo_movimentacao") AND ("valor_pago_centavos" IS NULL) AND ("moeda" IS NULL))))
);


ALTER TABLE "public"."movimentacoes_creditos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pacotes_creditos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "creditos" integer NOT NULL,
    "preco_centavos" integer NOT NULL,
    "moeda" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "ordem" smallint DEFAULT 1 NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pacotes_creditos_creditos_check" CHECK (("creditos" > 0)),
    CONSTRAINT "pacotes_creditos_moeda_check" CHECK (("moeda" ~ '^[a-z]{3}$'::"text")),
    CONSTRAINT "pacotes_creditos_preco_centavos_check" CHECK (("preco_centavos" > 0))
);


ALTER TABLE "public"."pacotes_creditos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pagamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "marca_id" "uuid" NOT NULL,
    "pacote_id" "uuid" NOT NULL,
    "criado_por" "uuid" NOT NULL,
    "creditos" integer NOT NULL,
    "valor_centavos" integer NOT NULL,
    "moeda" "text" NOT NULL,
    "status" "public"."status_pagamento" DEFAULT 'iniciado'::"public"."status_pagamento" NOT NULL,
    "stripe_checkout_session_id" "text",
    "stripe_payment_intent_id" "text",
    "pago_em" timestamp with time zone,
    "observacao" "text",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pagamentos_creditos_check" CHECK (("creditos" > 0)),
    CONSTRAINT "pagamentos_moeda_check" CHECK (("moeda" ~ '^[a-z]{3}$'::"text")),
    CONSTRAINT "pagamentos_valor_centavos_check" CHECK (("valor_centavos" >= 0))
);


ALTER TABLE "public"."pagamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."perfis" (
    "id" "uuid" NOT NULL,
    "marca_id" "uuid",
    "papel" "public"."papel_usuario" DEFAULT 'usuario_marca'::"public"."papel_usuario" NOT NULL,
    "nome" "text" NOT NULL,
    "email" "text" NOT NULL,
    "idioma" "public"."idioma" DEFAULT 'pt_br'::"public"."idioma" NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "perfis_marca_obrigatoria_chk" CHECK ((("papel" = 'admin_plataforma'::"public"."papel_usuario") OR ("marca_id" IS NOT NULL)))
);


ALTER TABLE "public"."perfis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."precos_acoes" (
    "acao" "public"."acao_cobravel" NOT NULL,
    "creditos" integer NOT NULL,
    "descricao" "text" NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "precos_acoes_creditos_check" CHECK (("creditos" >= 0))
);


ALTER TABLE "public"."precos_acoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produtos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "marca_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "categoria" "public"."categoria_peca" NOT NULL,
    "genero_alvo" "public"."genero_alvo" DEFAULT 'unissex'::"public"."genero_alvo" NOT NULL,
    "descricao" "text",
    "ficha_aprovada_id" "uuid",
    "arquivado" boolean DEFAULT false NOT NULL,
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    "atualizado_em" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."produtos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quadros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cena_id" "uuid" NOT NULL,
    "marca_id" "uuid" NOT NULL,
    "versao" integer NOT NULL,
    "status" "public"."status_item" DEFAULT 'gerando'::"public"."status_item" NOT NULL,
    "imagem_path" "text",
    "geracao_id" "uuid",
    "instrucao_refacao" "text",
    "qc_aprovado" boolean,
    "qc_detalhe" "jsonb",
    "criado_em" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quadros_instrucao_refacao_check" CHECK (("char_length"("instrucao_refacao") <= 200)),
    CONSTRAINT "quadros_versao_check" CHECK (("versao" >= 1))
);


ALTER TABLE "public"."quadros" OWNER TO "postgres";


ALTER TABLE ONLY "public"."anuncios"
    ADD CONSTRAINT "anuncios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cenas"
    ADD CONSTRAINT "cenas_anuncio_id_ordem_key" UNIQUE ("anuncio_id", "ordem");



ALTER TABLE ONLY "public"."cenas"
    ADD CONSTRAINT "cenas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clipes"
    ADD CONSTRAINT "clipes_cena_id_versao_key" UNIQUE ("cena_id", "versao");



ALTER TABLE ONLY "public"."clipes"
    ADD CONSTRAINT "clipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."configuracoes"
    ADD CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("chave");



ALTER TABLE ONLY "public"."feedbacks"
    ADD CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fichas_produto"
    ADD CONSTRAINT "fichas_produto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fichas_produto"
    ADD CONSTRAINT "fichas_produto_produto_id_versao_key" UNIQUE ("produto_id", "versao");



ALTER TABLE ONLY "public"."fotos_produto"
    ADD CONSTRAINT "fotos_produto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geracoes"
    ADD CONSTRAINT "geracoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geracoes"
    ADD CONSTRAINT "geracoes_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."marcas"
    ADD CONSTRAINT "marcas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movimentacoes_creditos"
    ADD CONSTRAINT "movimentacoes_creditos_pagamento_id_key" UNIQUE ("pagamento_id");



ALTER TABLE ONLY "public"."movimentacoes_creditos"
    ADD CONSTRAINT "movimentacoes_creditos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pacotes_creditos"
    ADD CONSTRAINT "pacotes_creditos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pacotes_creditos"
    ADD CONSTRAINT "pacotes_creditos_stripe_price_id_key" UNIQUE ("stripe_price_id");



ALTER TABLE ONLY "public"."pagamentos"
    ADD CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagamentos"
    ADD CONSTRAINT "pagamentos_stripe_checkout_session_id_key" UNIQUE ("stripe_checkout_session_id");



ALTER TABLE ONLY "public"."perfis"
    ADD CONSTRAINT "perfis_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."perfis"
    ADD CONSTRAINT "perfis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."precos_acoes"
    ADD CONSTRAINT "precos_acoes_pkey" PRIMARY KEY ("acao");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quadros"
    ADD CONSTRAINT "quadros_cena_id_versao_key" UNIQUE ("cena_id", "versao");



ALTER TABLE ONLY "public"."quadros"
    ADD CONSTRAINT "quadros_pkey" PRIMARY KEY ("id");



CREATE INDEX "anuncios_criado_por_idx" ON "public"."anuncios" USING "btree" ("criado_por");



CREATE INDEX "anuncios_ficha_id_idx" ON "public"."anuncios" USING "btree" ("ficha_id");



CREATE INDEX "anuncios_marca_id_idx" ON "public"."anuncios" USING "btree" ("marca_id", "criado_em" DESC);



CREATE INDEX "anuncios_montando_idx" ON "public"."anuncios" USING "btree" ("status") WHERE ("status" = 'montando'::"public"."status_anuncio");



CREATE INDEX "anuncios_produto_id_idx" ON "public"."anuncios" USING "btree" ("produto_id");



CREATE INDEX "cenas_clipe_atual_id_idx" ON "public"."cenas" USING "btree" ("clipe_atual_id");



CREATE INDEX "cenas_marca_id_idx" ON "public"."cenas" USING "btree" ("marca_id");



CREATE INDEX "cenas_quadro_atual_id_idx" ON "public"."cenas" USING "btree" ("quadro_atual_id");



CREATE INDEX "clipes_cena_id_idx" ON "public"."clipes" USING "btree" ("cena_id");



CREATE INDEX "clipes_geracao_id_idx" ON "public"."clipes" USING "btree" ("geracao_id");



CREATE INDEX "clipes_marca_id_idx" ON "public"."clipes" USING "btree" ("marca_id");



CREATE INDEX "clipes_quadro_id_idx" ON "public"."clipes" USING "btree" ("quadro_id");



CREATE INDEX "feedbacks_marca_id_idx" ON "public"."feedbacks" USING "btree" ("marca_id");



CREATE INDEX "feedbacks_status_criado_em_idx" ON "public"."feedbacks" USING "btree" ("status", "criado_em" DESC);



CREATE INDEX "feedbacks_usuario_id_idx" ON "public"."feedbacks" USING "btree" ("usuario_id");



CREATE INDEX "fichas_produto_geracao_id_idx" ON "public"."fichas_produto" USING "btree" ("geracao_id");



CREATE INDEX "fichas_produto_marca_id_idx" ON "public"."fichas_produto" USING "btree" ("marca_id");



CREATE UNIQUE INDEX "fichas_produto_uma_gerando_uidx" ON "public"."fichas_produto" USING "btree" ("produto_id") WHERE ("status" = 'gerando'::"public"."status_ficha");



CREATE INDEX "fotos_produto_marca_id_idx" ON "public"."fotos_produto" USING "btree" ("marca_id");



CREATE INDEX "fotos_produto_produto_id_idx" ON "public"."fotos_produto" USING "btree" ("produto_id");



CREATE INDEX "geracoes_cobranca_id_idx" ON "public"."geracoes" USING "btree" ("cobranca_id");



CREATE INDEX "geracoes_marca_id_idx" ON "public"."geracoes" USING "btree" ("marca_id", "criado_em" DESC);



CREATE INDEX "geracoes_status_idx" ON "public"."geracoes" USING "btree" ("status", "criado_em");



CREATE INDEX "movimentacoes_criado_por_idx" ON "public"."movimentacoes_creditos" USING "btree" ("criado_por");



CREATE INDEX "movimentacoes_estorno_de_id_idx" ON "public"."movimentacoes_creditos" USING "btree" ("estorno_de_id");



CREATE INDEX "movimentacoes_marca_id_idx" ON "public"."movimentacoes_creditos" USING "btree" ("marca_id", "criado_em" DESC);



CREATE INDEX "pagamentos_criado_por_idx" ON "public"."pagamentos" USING "btree" ("criado_por");



CREATE INDEX "pagamentos_marca_id_idx" ON "public"."pagamentos" USING "btree" ("marca_id", "criado_em" DESC);



CREATE INDEX "pagamentos_pacote_id_idx" ON "public"."pagamentos" USING "btree" ("pacote_id");



CREATE INDEX "perfis_marca_id_idx" ON "public"."perfis" USING "btree" ("marca_id");



CREATE INDEX "produtos_ficha_aprovada_id_idx" ON "public"."produtos" USING "btree" ("ficha_aprovada_id");



CREATE INDEX "produtos_marca_id_idx" ON "public"."produtos" USING "btree" ("marca_id");



CREATE INDEX "quadros_geracao_id_idx" ON "public"."quadros" USING "btree" ("geracao_id");



CREATE INDEX "quadros_marca_id_idx" ON "public"."quadros" USING "btree" ("marca_id");



CREATE OR REPLACE TRIGGER "trg_anuncios_atualizado_em" BEFORE UPDATE ON "public"."anuncios" FOR EACH ROW EXECUTE FUNCTION "public"."definir_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_feedbacks_atualizado_em" BEFORE UPDATE ON "public"."feedbacks" FOR EACH ROW EXECUTE FUNCTION "public"."definir_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_fotos_produto_limite" BEFORE INSERT ON "public"."fotos_produto" FOR EACH ROW EXECUTE FUNCTION "public"."limitar_fotos_produto"();



CREATE OR REPLACE TRIGGER "trg_marcas_atualizado_em" BEFORE UPDATE ON "public"."marcas" FOR EACH ROW EXECUTE FUNCTION "public"."definir_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_marcas_proteger_saldo" BEFORE UPDATE ON "public"."marcas" FOR EACH ROW EXECUTE FUNCTION "public"."proteger_saldo_marca"();



CREATE OR REPLACE TRIGGER "trg_movimentacoes_imutaveis" BEFORE DELETE OR UPDATE ON "public"."movimentacoes_creditos" FOR EACH ROW EXECUTE FUNCTION "public"."bloquear_alteracao_movimentacao"();



CREATE OR REPLACE TRIGGER "trg_pacotes_creditos_atualizado_em" BEFORE UPDATE ON "public"."pacotes_creditos" FOR EACH ROW EXECUTE FUNCTION "public"."definir_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_pagamentos_atualizado_em" BEFORE UPDATE ON "public"."pagamentos" FOR EACH ROW EXECUTE FUNCTION "public"."definir_atualizado_em"();



CREATE OR REPLACE TRIGGER "trg_produtos_atualizado_em" BEFORE UPDATE ON "public"."produtos" FOR EACH ROW EXECUTE FUNCTION "public"."definir_atualizado_em"();



ALTER TABLE ONLY "public"."anuncios"
    ADD CONSTRAINT "anuncios_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."perfis"("id");



ALTER TABLE ONLY "public"."anuncios"
    ADD CONSTRAINT "anuncios_ficha_id_fkey" FOREIGN KEY ("ficha_id") REFERENCES "public"."fichas_produto"("id");



ALTER TABLE ONLY "public"."anuncios"
    ADD CONSTRAINT "anuncios_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."anuncios"
    ADD CONSTRAINT "anuncios_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id");



ALTER TABLE ONLY "public"."cenas"
    ADD CONSTRAINT "cenas_anuncio_id_fkey" FOREIGN KEY ("anuncio_id") REFERENCES "public"."anuncios"("id");



ALTER TABLE ONLY "public"."cenas"
    ADD CONSTRAINT "cenas_clipe_atual_id_fkey" FOREIGN KEY ("clipe_atual_id") REFERENCES "public"."clipes"("id");



ALTER TABLE ONLY "public"."cenas"
    ADD CONSTRAINT "cenas_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."cenas"
    ADD CONSTRAINT "cenas_quadro_atual_id_fkey" FOREIGN KEY ("quadro_atual_id") REFERENCES "public"."quadros"("id");



ALTER TABLE ONLY "public"."clipes"
    ADD CONSTRAINT "clipes_cena_id_fkey" FOREIGN KEY ("cena_id") REFERENCES "public"."cenas"("id");



ALTER TABLE ONLY "public"."clipes"
    ADD CONSTRAINT "clipes_geracao_id_fkey" FOREIGN KEY ("geracao_id") REFERENCES "public"."geracoes"("id");



ALTER TABLE ONLY "public"."clipes"
    ADD CONSTRAINT "clipes_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."clipes"
    ADD CONSTRAINT "clipes_quadro_id_fkey" FOREIGN KEY ("quadro_id") REFERENCES "public"."quadros"("id");



ALTER TABLE ONLY "public"."feedbacks"
    ADD CONSTRAINT "feedbacks_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."feedbacks"
    ADD CONSTRAINT "feedbacks_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."perfis"("id");



ALTER TABLE ONLY "public"."fichas_produto"
    ADD CONSTRAINT "fichas_produto_geracao_id_fkey" FOREIGN KEY ("geracao_id") REFERENCES "public"."geracoes"("id");



ALTER TABLE ONLY "public"."fichas_produto"
    ADD CONSTRAINT "fichas_produto_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."fichas_produto"
    ADD CONSTRAINT "fichas_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id");



ALTER TABLE ONLY "public"."fotos_produto"
    ADD CONSTRAINT "fotos_produto_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."fotos_produto"
    ADD CONSTRAINT "fotos_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id");



ALTER TABLE ONLY "public"."geracoes"
    ADD CONSTRAINT "geracoes_cobranca_id_fkey" FOREIGN KEY ("cobranca_id") REFERENCES "public"."movimentacoes_creditos"("id");



ALTER TABLE ONLY "public"."geracoes"
    ADD CONSTRAINT "geracoes_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."movimentacoes_creditos"
    ADD CONSTRAINT "movimentacoes_creditos_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."perfis"("id");



ALTER TABLE ONLY "public"."movimentacoes_creditos"
    ADD CONSTRAINT "movimentacoes_creditos_estorno_de_id_fkey" FOREIGN KEY ("estorno_de_id") REFERENCES "public"."movimentacoes_creditos"("id");



ALTER TABLE ONLY "public"."movimentacoes_creditos"
    ADD CONSTRAINT "movimentacoes_creditos_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."movimentacoes_creditos"
    ADD CONSTRAINT "movimentacoes_creditos_pagamento_id_fkey" FOREIGN KEY ("pagamento_id") REFERENCES "public"."pagamentos"("id");



ALTER TABLE ONLY "public"."pagamentos"
    ADD CONSTRAINT "pagamentos_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "public"."perfis"("id");



ALTER TABLE ONLY "public"."pagamentos"
    ADD CONSTRAINT "pagamentos_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."pagamentos"
    ADD CONSTRAINT "pagamentos_pacote_id_fkey" FOREIGN KEY ("pacote_id") REFERENCES "public"."pacotes_creditos"("id");



ALTER TABLE ONLY "public"."perfis"
    ADD CONSTRAINT "perfis_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."perfis"
    ADD CONSTRAINT "perfis_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_ficha_aprovada_id_fkey" FOREIGN KEY ("ficha_aprovada_id") REFERENCES "public"."fichas_produto"("id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE ONLY "public"."quadros"
    ADD CONSTRAINT "quadros_cena_id_fkey" FOREIGN KEY ("cena_id") REFERENCES "public"."cenas"("id");



ALTER TABLE ONLY "public"."quadros"
    ADD CONSTRAINT "quadros_geracao_id_fkey" FOREIGN KEY ("geracao_id") REFERENCES "public"."geracoes"("id");



ALTER TABLE ONLY "public"."quadros"
    ADD CONSTRAINT "quadros_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas"("id");



ALTER TABLE "public"."anuncios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anuncios_select" ON "public"."anuncios" FOR SELECT TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



CREATE POLICY "anuncios_update_basico" ON "public"."anuncios" FOR UPDATE TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin"))) WITH CHECK ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



ALTER TABLE "public"."cenas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cenas_select" ON "public"."cenas" FOR SELECT TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



ALTER TABLE "public"."clipes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clipes_select" ON "public"."clipes" FOR SELECT TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



ALTER TABLE "public"."configuracoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "configuracoes_select_admin" ON "public"."configuracoes" FOR SELECT TO "authenticated" USING (( SELECT "public"."eh_admin"() AS "eh_admin"));



ALTER TABLE "public"."feedbacks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedbacks_insert" ON "public"."feedbacks" FOR INSERT TO "authenticated" WITH CHECK ((("usuario_id" = ( SELECT "auth"."uid"() AS "uid")) AND (NOT ("marca_id" IS DISTINCT FROM ( SELECT "public"."minha_marca_id"() AS "minha_marca_id"))) AND ("status" = 'novo'::"public"."feedback_status") AND (EXISTS ( SELECT 1
   FROM "public"."perfis" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND "p"."ativo")))));



CREATE POLICY "feedbacks_select" ON "public"."feedbacks" FOR SELECT TO "authenticated" USING ((("usuario_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



CREATE POLICY "feedbacks_update_admin" ON "public"."feedbacks" FOR UPDATE TO "authenticated" USING (( SELECT "public"."eh_admin"() AS "eh_admin")) WITH CHECK (( SELECT "public"."eh_admin"() AS "eh_admin"));



ALTER TABLE "public"."fichas_produto" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fichas_select" ON "public"."fichas_produto" FOR SELECT TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



CREATE POLICY "fotos_delete" ON "public"."fotos_produto" FOR DELETE TO "authenticated" USING (((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")) AND (EXISTS ( SELECT 1
   FROM "public"."produtos" "p"
  WHERE (("p"."id" = "fotos_produto"."produto_id") AND ("p"."ficha_aprovada_id" IS NULL))))));



CREATE POLICY "fotos_insert" ON "public"."fotos_produto" FOR INSERT TO "authenticated" WITH CHECK (((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")) AND (EXISTS ( SELECT 1
   FROM "public"."produtos" "p"
  WHERE (("p"."id" = "fotos_produto"."produto_id") AND ("p"."marca_id" = "fotos_produto"."marca_id") AND ("p"."ficha_aprovada_id" IS NULL))))));



ALTER TABLE "public"."fotos_produto" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fotos_select" ON "public"."fotos_produto" FOR SELECT TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



ALTER TABLE "public"."geracoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "geracoes_select_admin" ON "public"."geracoes" FOR SELECT TO "authenticated" USING (( SELECT "public"."eh_admin"() AS "eh_admin"));



ALTER TABLE "public"."marcas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marcas_select" ON "public"."marcas" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



CREATE POLICY "marcas_update_kit" ON "public"."marcas" FOR UPDATE TO "authenticated" USING ((("id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin"))) WITH CHECK ((("id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



ALTER TABLE "public"."movimentacoes_creditos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "movimentacoes_select" ON "public"."movimentacoes_creditos" FOR SELECT TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



ALTER TABLE "public"."pacotes_creditos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pacotes_select" ON "public"."pacotes_creditos" FOR SELECT TO "authenticated" USING (("ativo" OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



ALTER TABLE "public"."pagamentos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pagamentos_select" ON "public"."pagamentos" FOR SELECT TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



ALTER TABLE "public"."perfis" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "perfis_select" ON "public"."perfis" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



ALTER TABLE "public"."precos_acoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "precos_select" ON "public"."precos_acoes" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."produtos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "produtos_insert" ON "public"."produtos" FOR INSERT TO "authenticated" WITH CHECK ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



CREATE POLICY "produtos_select" ON "public"."produtos" FOR SELECT TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



CREATE POLICY "produtos_update" ON "public"."produtos" FOR UPDATE TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin"))) WITH CHECK ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



ALTER TABLE "public"."quadros" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quadros_select" ON "public"."quadros" FOR SELECT TO "authenticated" USING ((("marca_id" = ( SELECT "public"."minha_marca_id"() AS "minha_marca_id")) OR ( SELECT "public"."eh_admin"() AS "eh_admin")));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."aprovar_ficha"("p_ficha_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."aprovar_ficha"("p_ficha_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."bloquear_alteracao_movimentacao"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bloquear_alteracao_movimentacao"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."creditar_pagamento"("p_pagamento_id" "uuid", "p_stripe_payment_intent_id" "text", "p_valor_centavos" integer, "p_moeda" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."creditar_pagamento"("p_pagamento_id" "uuid", "p_stripe_payment_intent_id" "text", "p_valor_centavos" integer, "p_moeda" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."debitar_creditos"("p_marca_id" "uuid", "p_acao" "public"."acao_cobravel", "p_quantidade_itens" integer, "p_referencia_tipo" "text", "p_referencia_id" "uuid", "p_criado_por" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."debitar_creditos"("p_marca_id" "uuid", "p_acao" "public"."acao_cobravel", "p_quantidade_itens" integer, "p_referencia_tipo" "text", "p_referencia_id" "uuid", "p_criado_por" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."definir_atualizado_em"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."definir_atualizado_em"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."eh_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."eh_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."eh_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."estornar_creditos"("p_movimentacao_id" "uuid", "p_observacao" "text", "p_quantidade" integer, "p_referencia_tipo" "text", "p_referencia_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."estornar_creditos"("p_movimentacao_id" "uuid", "p_observacao" "text", "p_quantidade" integer, "p_referencia_tipo" "text", "p_referencia_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."estornar_pagamento"("p_pagamento_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."estornar_pagamento"("p_pagamento_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."lancar_creditos"("p_marca_id" "uuid", "p_tipo" "public"."tipo_movimentacao", "p_quantidade" integer, "p_valor_pago_centavos" integer, "p_observacao" "text", "p_criado_por" "uuid", "p_moeda" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lancar_creditos"("p_marca_id" "uuid", "p_tipo" "public"."tipo_movimentacao", "p_quantidade" integer, "p_valor_pago_centavos" integer, "p_observacao" "text", "p_criado_por" "uuid", "p_moeda" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."limitar_fotos_produto"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."limitar_fotos_produto"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."minha_marca_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."minha_marca_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."minha_marca_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."pegar_proximo_anuncio_para_montar"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pegar_proximo_anuncio_para_montar"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."pode_gravar_original"("p_nome" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pode_gravar_original"("p_nome" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pode_gravar_original"("p_nome" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."proteger_saldo_marca"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."proteger_saldo_marca"() TO "service_role";



GRANT ALL ON TABLE "public"."anuncios" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("marca_id") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("produto_id") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("ficha_id") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("criado_por") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("titulo"),UPDATE("titulo") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("cenario") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("modalidade") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("genero_modelo") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("faixa_etaria") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("estilo") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("formato") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("com_texto") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("texto_oferta") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("observacoes") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("status") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("video_final_path") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("versao_montagem") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("arquivado"),UPDATE("arquivado") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("criado_em") ON TABLE "public"."anuncios" TO "authenticated";



GRANT SELECT("atualizado_em") ON TABLE "public"."anuncios" TO "authenticated";



GRANT ALL ON TABLE "public"."cenas" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."cenas" TO "authenticated";



GRANT SELECT("anuncio_id") ON TABLE "public"."cenas" TO "authenticated";



GRANT SELECT("marca_id") ON TABLE "public"."cenas" TO "authenticated";



GRANT SELECT("ordem") ON TABLE "public"."cenas" TO "authenticated";



GRANT SELECT("descricao") ON TABLE "public"."cenas" TO "authenticated";



GRANT SELECT("texto_tela") ON TABLE "public"."cenas" TO "authenticated";



GRANT SELECT("quadro_atual_id") ON TABLE "public"."cenas" TO "authenticated";



GRANT SELECT("clipe_atual_id") ON TABLE "public"."cenas" TO "authenticated";



GRANT SELECT("criado_em") ON TABLE "public"."cenas" TO "authenticated";



GRANT ALL ON TABLE "public"."clipes" TO "service_role";
GRANT SELECT ON TABLE "public"."clipes" TO "authenticated";



GRANT ALL ON TABLE "public"."configuracoes" TO "service_role";
GRANT SELECT ON TABLE "public"."configuracoes" TO "authenticated";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feedbacks" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."feedbacks" TO "authenticated";
GRANT ALL ON TABLE "public"."feedbacks" TO "service_role";



GRANT INSERT("usuario_id") ON TABLE "public"."feedbacks" TO "authenticated";



GRANT INSERT("marca_id") ON TABLE "public"."feedbacks" TO "authenticated";



GRANT INSERT("tipo") ON TABLE "public"."feedbacks" TO "authenticated";



GRANT INSERT("texto") ON TABLE "public"."feedbacks" TO "authenticated";



GRANT INSERT("tela") ON TABLE "public"."feedbacks" TO "authenticated";



GRANT UPDATE("status") ON TABLE "public"."feedbacks" TO "authenticated";



GRANT ALL ON TABLE "public"."fichas_produto" TO "service_role";
GRANT SELECT ON TABLE "public"."fichas_produto" TO "authenticated";



GRANT ALL ON TABLE "public"."fotos_produto" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."fotos_produto" TO "authenticated";



GRANT INSERT("produto_id") ON TABLE "public"."fotos_produto" TO "authenticated";



GRANT INSERT("marca_id") ON TABLE "public"."fotos_produto" TO "authenticated";



GRANT INSERT("storage_path") ON TABLE "public"."fotos_produto" TO "authenticated";



GRANT INSERT("ordem") ON TABLE "public"."fotos_produto" TO "authenticated";



GRANT ALL ON TABLE "public"."geracoes" TO "service_role";
GRANT SELECT ON TABLE "public"."geracoes" TO "authenticated";



GRANT ALL ON TABLE "public"."marcas" TO "service_role";
GRANT SELECT ON TABLE "public"."marcas" TO "authenticated";



GRANT UPDATE("nome") ON TABLE "public"."marcas" TO "authenticated";



GRANT UPDATE("instagram") ON TABLE "public"."marcas" TO "authenticated";



GRANT UPDATE("logo_path") ON TABLE "public"."marcas" TO "authenticated";



GRANT UPDATE("cor_destaque") ON TABLE "public"."marcas" TO "authenticated";



GRANT UPDATE("cta_padrao") ON TABLE "public"."marcas" TO "authenticated";



GRANT UPDATE("tom_de_voz") ON TABLE "public"."marcas" TO "authenticated";



GRANT UPDATE("idioma_anuncios") ON TABLE "public"."marcas" TO "authenticated";



GRANT ALL ON TABLE "public"."movimentacoes_creditos" TO "service_role";
GRANT SELECT ON TABLE "public"."movimentacoes_creditos" TO "authenticated";



GRANT ALL ON TABLE "public"."pacotes_creditos" TO "service_role";
GRANT SELECT ON TABLE "public"."pacotes_creditos" TO "authenticated";



GRANT ALL ON TABLE "public"."pagamentos" TO "service_role";
GRANT SELECT ON TABLE "public"."pagamentos" TO "authenticated";



GRANT ALL ON TABLE "public"."perfis" TO "service_role";
GRANT SELECT ON TABLE "public"."perfis" TO "authenticated";



GRANT ALL ON TABLE "public"."precos_acoes" TO "service_role";
GRANT SELECT ON TABLE "public"."precos_acoes" TO "authenticated";



GRANT ALL ON TABLE "public"."produtos" TO "service_role";
GRANT SELECT ON TABLE "public"."produtos" TO "authenticated";



GRANT INSERT("marca_id") ON TABLE "public"."produtos" TO "authenticated";



GRANT INSERT("nome"),UPDATE("nome") ON TABLE "public"."produtos" TO "authenticated";



GRANT INSERT("categoria"),UPDATE("categoria") ON TABLE "public"."produtos" TO "authenticated";



GRANT INSERT("genero_alvo"),UPDATE("genero_alvo") ON TABLE "public"."produtos" TO "authenticated";



GRANT INSERT("descricao"),UPDATE("descricao") ON TABLE "public"."produtos" TO "authenticated";



GRANT UPDATE("arquivado") ON TABLE "public"."produtos" TO "authenticated";



GRANT ALL ON TABLE "public"."quadros" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."quadros" TO "authenticated";



GRANT SELECT("cena_id") ON TABLE "public"."quadros" TO "authenticated";



GRANT SELECT("marca_id") ON TABLE "public"."quadros" TO "authenticated";



GRANT SELECT("versao") ON TABLE "public"."quadros" TO "authenticated";



GRANT SELECT("status") ON TABLE "public"."quadros" TO "authenticated";



GRANT SELECT("imagem_path") ON TABLE "public"."quadros" TO "authenticated";



GRANT SELECT("geracao_id") ON TABLE "public"."quadros" TO "authenticated";



GRANT SELECT("instrucao_refacao") ON TABLE "public"."quadros" TO "authenticated";



GRANT SELECT("qc_aprovado") ON TABLE "public"."quadros" TO "authenticated";



GRANT SELECT("criado_em") ON TABLE "public"."quadros" TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







