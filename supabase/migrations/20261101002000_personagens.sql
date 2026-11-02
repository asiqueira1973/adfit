-- =============================================================================
-- AdFit — catálogo de personagens (emenda MD-17, plans/I-2-personagens.md), parte 2.
-- Personagem = modelo reaproveitável da marca, com ficha de referência (rosto, corpo, cabelo).
-- Escrita só pelo servidor (rotas /api/personagens*); o cliente lê a própria marca pela RLS e
-- envia fotos de referência direto ao Storage em produtos/<marca>/personagens/<id>/originais/*.
-- Teste: supabase/tests/10_personagens.test.sql.
-- =============================================================================

-- personagens — modelos reaproveitáveis da marca.
create table public.personagens (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas (id),
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  descricao text check (char_length(descricao) <= 300),
  -- Descrição em inglês usada nos prompts (escrita pelo Claude a partir da descrição e das fotos).
  modelo_en text check (char_length(modelo_en) <= 600),
  genero_modelo public.genero_modelo not null,
  faixa_etaria public.faixa_etaria not null default 'de_20_a_30',
  origem public.origem_personagem not null default 'descricao',
  anuncio_origem_id uuid references public.anuncios (id),
  ficha_aprovada_id uuid,
  arquivado boolean not null default false,
  criado_por uuid not null references public.perfis (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, marca_id)
);
create index personagens_marca_id_idx on public.personagens (marca_id);
create index personagens_criado_por_idx on public.personagens (criado_por);
create index personagens_anuncio_origem_id_idx on public.personagens (anuncio_origem_id);

-- trg_personagens_atualizado_em — mantém atualizado_em.
create trigger trg_personagens_atualizado_em before update on public.personagens
  for each row execute function public.definir_atualizado_em();

-- fotos_personagem — até 4 fotos de referência (pessoa real ou inspiração).
create table public.fotos_personagem (
  id uuid primary key default gen_random_uuid(),
  personagem_id uuid not null,
  marca_id uuid not null references public.marcas (id),
  storage_path text not null,
  ordem smallint not null default 1 check (ordem between 1 and 4),
  criado_em timestamptz not null default now(),
  foreign key (personagem_id, marca_id) references public.personagens (id, marca_id),
  constraint fotos_personagem_caminho_chk check (
    storage_path ~ ('^produtos/' || marca_id::text || '/personagens/' || personagem_id::text || '/originais/[^/]+$')
  )
);
create index fotos_personagem_personagem_marca_idx on public.fotos_personagem (personagem_id, marca_id);
create index fotos_personagem_marca_id_idx on public.fotos_personagem (marca_id);

-- trg_fotos_personagem_limite — máximo 4 fotos por personagem (como fotos_produto).
create function public.limitar_fotos_personagem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.personagens where id = new.personagem_id for update;
  if (select count(*) from public.fotos_personagem where personagem_id = new.personagem_id) >= 4 then
    raise exception 'limite_fotos';
  end if;
  return new;
end;
$$;
create trigger trg_fotos_personagem_limite before insert on public.fotos_personagem
  for each row execute function public.limitar_fotos_personagem();

-- fichas_personagem — versões da ficha de personagem (mesmo ciclo da ficha do produto, 12.1).
create table public.fichas_personagem (
  id uuid primary key default gen_random_uuid(),
  personagem_id uuid not null,
  marca_id uuid not null references public.marcas (id),
  versao integer not null check (versao >= 1),
  status public.status_ficha not null default 'gerando',
  imagem_path text,
  geracao_id uuid references public.geracoes (id),
  instrucao_refacao text check (char_length(instrucao_refacao) <= 400),
  criado_em timestamptz not null default now(),
  unique (personagem_id, versao),
  foreign key (personagem_id, marca_id) references public.personagens (id, marca_id)
);
create index fichas_personagem_personagem_marca_idx on public.fichas_personagem (personagem_id, marca_id);
create index fichas_personagem_marca_id_idx on public.fichas_personagem (marca_id);
create index fichas_personagem_geracao_id_idx on public.fichas_personagem (geracao_id);
-- Uma ficha em geração por personagem (cliques simultâneos; o servidor estorna se recusar).
create unique index fichas_personagem_uma_gerando_uidx on public.fichas_personagem (personagem_id) where status = 'gerando';

alter table public.personagens
  add constraint personagens_ficha_aprovada_fk foreign key (ficha_aprovada_id) references public.fichas_personagem (id);
create index personagens_ficha_aprovada_id_idx on public.personagens (ficha_aprovada_id);

-- anuncios.personagem_id — personagem do catálogo usada no anúncio (opcional; da mesma marca).
alter table public.anuncios add column personagem_id uuid;
alter table public.anuncios
  add constraint anuncios_personagem_fk foreign key (personagem_id, marca_id) references public.personagens (id, marca_id);
create index anuncios_personagem_marca_idx on public.anuncios (personagem_id, marca_id);
grant select (personagem_id) on public.anuncios to authenticated;

-- Movimentação de crédito pode apontar para a personagem.
alter table public.movimentacoes_creditos drop constraint if exists movimentacoes_creditos_referencia_tipo_check;
alter table public.movimentacoes_creditos add constraint movimentacoes_creditos_referencia_tipo_check
  check (referencia_tipo in ('ficha', 'anuncio', 'quadro', 'clipe', 'personagem'));

-- Preços (2 e 1 créditos, decisão do Alexandre em 01/11/2026) e modelo da ficha de personagem.
insert into public.precos_acoes (acao, creditos, descricao) values
  ('gerar_ficha_personagem', 2, 'Ficha de personagem (1ª versão)'),
  ('refazer_ficha_personagem', 1, 'Refazer a ficha de personagem')
on conflict (acao) do nothing;
insert into public.configuracoes (chave, valor, descricao) values
  ('modelo_personagem', '"marketing-studio/image/flare"', 'Endpoint ID do modelo da ficha de personagem (MD-17)')
on conflict (chave) do nothing;

-- -----------------------------------------------------------------------------
-- aprovar_ficha_personagem(ficha) — como aprovar_ficha: aprova a versão, descarta as outras
-- aguardando/aprovadas e aponta personagens.ficha_aprovada_id. Só service_role.
-- Recebe: id da ficha. Devolve: id da personagem. Erros: ficha_inexistente, transicao_invalida.
-- -----------------------------------------------------------------------------
create function public.aprovar_ficha_personagem(p_ficha_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ficha public.fichas_personagem%rowtype;
begin
  select * into v_ficha from public.fichas_personagem where id = p_ficha_id;
  if not found then
    raise exception 'ficha_inexistente';
  end if;
  perform 1 from public.personagens where id = v_ficha.personagem_id for update;
  select * into v_ficha from public.fichas_personagem where id = p_ficha_id for update;
  if v_ficha.status not in ('aguardando_aprovacao', 'aprovada', 'descartada') or v_ficha.imagem_path is null then
    raise exception 'transicao_invalida';
  end if;
  update public.fichas_personagem set status = 'aprovada' where id = p_ficha_id;
  update public.fichas_personagem set status = 'descartada'
  where personagem_id = v_ficha.personagem_id and id <> p_ficha_id and status in ('aguardando_aprovacao', 'aprovada');
  update public.personagens set ficha_aprovada_id = p_ficha_id where id = v_ficha.personagem_id;
  return v_ficha.personagem_id;
end;
$$;
revoke execute on function public.aprovar_ficha_personagem(uuid) from public, anon, authenticated;
grant execute on function public.aprovar_ficha_personagem(uuid) to service_role;

-- RLS: leitura da própria marca (admin todas); escrita só pelo servidor.
alter table public.personagens enable row level security;
alter table public.fotos_personagem enable row level security;
alter table public.fichas_personagem enable row level security;

-- personagens_select — própria marca; admin.
create policy personagens_select on public.personagens for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));
-- fotos_personagem_select — própria marca; admin.
create policy fotos_personagem_select on public.fotos_personagem for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));
-- fichas_personagem_select — própria marca; admin.
create policy fichas_personagem_select on public.fichas_personagem for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));

revoke all on public.personagens, public.fotos_personagem, public.fichas_personagem from anon, authenticated;
grant select on public.personagens, public.fotos_personagem, public.fichas_personagem to authenticated;

-- -----------------------------------------------------------------------------
-- pode_gravar_foto_personagem(nome) — o objeto `<marca>/personagens/<personagem>/originais/<arq>`
-- do bucket `produtos` é de personagem (não arquivada) da marca do usuário (ou admin).
-- Recebe: nome do objeto. Devolve: true se o cliente pode gravar/apagar ali.
-- -----------------------------------------------------------------------------
create function public.pode_gravar_foto_personagem(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (storage.foldername(p_nome))[2] = 'personagens'
     and (storage.foldername(p_nome))[4] = 'originais'
     and ((storage.foldername(p_nome))[1] = public.minha_marca_id()::text or public.eh_admin())
     and exists (
       select 1 from public.personagens p
       where p.id::text = (storage.foldername(p_nome))[3]
         and p.marca_id::text = (storage.foldername(p_nome))[1]
         and not p.arquivado
     );
$$;
revoke execute on function public.pode_gravar_foto_personagem(text) from public, anon;
grant execute on function public.pode_gravar_foto_personagem(text) to authenticated, service_role;

-- Políticas de Storage: acrescentam as fotos de personagem às regras de 20261101000900.
drop policy storage_adfit_insert on storage.objects;
create policy storage_adfit_insert on storage.objects for insert to authenticated
  with check (
    (bucket_id = 'marcas' and (storage.foldername(name))[2] = 'logo'
      and ((storage.foldername(name))[1] = (select public.minha_marca_id())::text or (select public.eh_admin())))
    or (bucket_id = 'produtos' and public.pode_gravar_original(name))
    or (bucket_id = 'produtos' and public.pode_gravar_foto_personagem(name))
  );
drop policy storage_adfit_update on storage.objects;
create policy storage_adfit_update on storage.objects for update to authenticated
  using (
    (bucket_id = 'marcas' and (storage.foldername(name))[2] = 'logo'
      and ((storage.foldername(name))[1] = (select public.minha_marca_id())::text or (select public.eh_admin())))
    or (bucket_id = 'produtos' and public.pode_gravar_original(name))
    or (bucket_id = 'produtos' and public.pode_gravar_foto_personagem(name))
  );
drop policy storage_adfit_delete on storage.objects;
create policy storage_adfit_delete on storage.objects for delete to authenticated
  using (
    (bucket_id = 'marcas' and (storage.foldername(name))[2] = 'logo'
      and ((storage.foldername(name))[1] = (select public.minha_marca_id())::text or (select public.eh_admin())))
    or (bucket_id = 'produtos' and public.pode_gravar_original(name))
    or (bucket_id = 'produtos' and public.pode_gravar_foto_personagem(name))
  );
