
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "anuncios": {
                  Row: {
                    "arquivado": boolean,"atualizado_em": string,"cenario": Database["public"]['Enums']["cenario"],"com_texto": boolean,"com_fecho": boolean,"criado_em": string,"criado_por": string,"erro": string | null,"estilo": Database["public"]['Enums']["estilo_video"],"faixa_etaria": Database["public"]['Enums']["faixa_etaria"],"ficha_id": string,"formato": Database["public"]['Enums']["formato_video"],"genero_modelo": Database["public"]['Enums']["genero_modelo"],"id": string,"marca_id": string,"modalidade": Database["public"]['Enums']["modalidade"],"montagem_iniciada_em": string | null,"observacoes": string | null,"produto_id": string,"prompt_versao": string | null,"roteiro": Json | null,"status": Database["public"]['Enums']["status_anuncio"],"tentativas_montagem": number,"texto_oferta": string | null,"titulo": string,"versao_montagem": number,"video_final_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "arquivado"?: boolean,"atualizado_em"?: string,"cenario": Database["public"]['Enums']["cenario"],"com_texto"?: boolean,"com_fecho"?: boolean,"criado_em"?: string,"criado_por": string,"erro"?: string | null,"estilo"?: Database["public"]['Enums']["estilo_video"],"faixa_etaria"?: Database["public"]['Enums']["faixa_etaria"],"ficha_id": string,"formato"?: Database["public"]['Enums']["formato_video"],"genero_modelo": Database["public"]['Enums']["genero_modelo"],"id"?: string,"marca_id": string,"modalidade": Database["public"]['Enums']["modalidade"],"montagem_iniciada_em"?: string | null,"observacoes"?: string | null,"produto_id": string,"prompt_versao"?: string | null,"roteiro"?: Json | null,"status"?: Database["public"]['Enums']["status_anuncio"],"tentativas_montagem"?: number,"texto_oferta"?: string | null,"titulo": string,"versao_montagem"?: number,"video_final_path"?: string | null
                  }
                  Update: {
                    "arquivado"?: boolean,"atualizado_em"?: string,"cenario"?: Database["public"]['Enums']["cenario"],"com_texto"?: boolean,"com_fecho"?: boolean,"criado_em"?: string,"criado_por"?: string,"erro"?: string | null,"estilo"?: Database["public"]['Enums']["estilo_video"],"faixa_etaria"?: Database["public"]['Enums']["faixa_etaria"],"ficha_id"?: string,"formato"?: Database["public"]['Enums']["formato_video"],"genero_modelo"?: Database["public"]['Enums']["genero_modelo"],"id"?: string,"marca_id"?: string,"modalidade"?: Database["public"]['Enums']["modalidade"],"montagem_iniciada_em"?: string | null,"observacoes"?: string | null,"produto_id"?: string,"prompt_versao"?: string | null,"roteiro"?: Json | null,"status"?: Database["public"]['Enums']["status_anuncio"],"tentativas_montagem"?: number,"texto_oferta"?: string | null,"titulo"?: string,"versao_montagem"?: number,"video_final_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "anuncios_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anuncios_ficha_id_fkey"
      columns: ["ficha_id"]
isOneToOne: false
      referencedRelation: "fichas_produto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anuncios_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anuncios_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"cenas": {
                  Row: {
                    "anuncio_id": string,"clipe_atual_id": string | null,"criado_em": string,"descricao": string,"id": string,"marca_id": string,"ordem": number,"prompt_movimento": string,"prompt_quadro": string,"quadro_atual_id": string | null,"texto_tela": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "anuncio_id": string,"clipe_atual_id"?: string | null,"criado_em"?: string,"descricao": string,"id"?: string,"marca_id": string,"ordem": number,"prompt_movimento": string,"prompt_quadro": string,"quadro_atual_id"?: string | null,"texto_tela"?: string | null
                  }
                  Update: {
                    "anuncio_id"?: string,"clipe_atual_id"?: string | null,"criado_em"?: string,"descricao"?: string,"id"?: string,"marca_id"?: string,"ordem"?: number,"prompt_movimento"?: string,"prompt_quadro"?: string,"quadro_atual_id"?: string | null,"texto_tela"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cenas_anuncio_id_fkey"
      columns: ["anuncio_id"]
isOneToOne: false
      referencedRelation: "anuncios"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cenas_clipe_atual_id_fkey"
      columns: ["clipe_atual_id"]
isOneToOne: false
      referencedRelation: "clipes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cenas_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cenas_quadro_atual_id_fkey"
      columns: ["quadro_atual_id"]
isOneToOne: false
      referencedRelation: "quadros"
      referencedColumns: ["id"]
    }
                  ]
                },"clipes": {
                  Row: {
                    "cena_id": string,"criado_em": string,"geracao_id": string | null,"id": string,"instrucao_refacao": string | null,"marca_id": string,"quadro_id": string,"status": Database["public"]['Enums']["status_item"],"versao": number,"video_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cena_id": string,"criado_em"?: string,"geracao_id"?: string | null,"id"?: string,"instrucao_refacao"?: string | null,"marca_id": string,"quadro_id": string,"status"?: Database["public"]['Enums']["status_item"],"versao": number,"video_path"?: string | null
                  }
                  Update: {
                    "cena_id"?: string,"criado_em"?: string,"geracao_id"?: string | null,"id"?: string,"instrucao_refacao"?: string | null,"marca_id"?: string,"quadro_id"?: string,"status"?: Database["public"]['Enums']["status_item"],"versao"?: number,"video_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clipes_cena_id_fkey"
      columns: ["cena_id"]
isOneToOne: false
      referencedRelation: "cenas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clipes_geracao_id_fkey"
      columns: ["geracao_id"]
isOneToOne: false
      referencedRelation: "geracoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clipes_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clipes_quadro_id_fkey"
      columns: ["quadro_id"]
isOneToOne: false
      referencedRelation: "quadros"
      referencedColumns: ["id"]
    }
                  ]
                },"configuracoes": {
                  Row: {
                    "atualizado_em": string,"chave": string,"descricao": string,"valor": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"chave": string,"descricao": string,"valor": NonNullable<Json>
                  }
                  Update: {
                    "atualizado_em"?: string,"chave"?: string,"descricao"?: string,"valor"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"feedbacks": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"id": string,"marca_id": string | null,"status": Database["public"]['Enums']["feedback_status"],"tela": string | null,"texto": string,"tipo": Database["public"]['Enums']["feedback_tipo"],"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"id"?: string,"marca_id"?: string | null,"status"?: Database["public"]['Enums']["feedback_status"],"tela"?: string | null,"texto": string,"tipo": Database["public"]['Enums']["feedback_tipo"],"usuario_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"id"?: string,"marca_id"?: string | null,"status"?: Database["public"]['Enums']["feedback_status"],"tela"?: string | null,"texto"?: string,"tipo"?: Database["public"]['Enums']["feedback_tipo"],"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedbacks_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedbacks_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"fichas_produto": {
                  Row: {
                    "criado_em": string,"geracao_id": string | null,"id": string,"imagem_path": string | null,"instrucao_refacao": string | null,"marca_id": string,"produto_id": string,"status": Database["public"]['Enums']["status_ficha"],"versao": number
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"geracao_id"?: string | null,"id"?: string,"imagem_path"?: string | null,"instrucao_refacao"?: string | null,"marca_id": string,"produto_id": string,"status"?: Database["public"]['Enums']["status_ficha"],"versao": number
                  }
                  Update: {
                    "criado_em"?: string,"geracao_id"?: string | null,"id"?: string,"imagem_path"?: string | null,"instrucao_refacao"?: string | null,"marca_id"?: string,"produto_id"?: string,"status"?: Database["public"]['Enums']["status_ficha"],"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "fichas_produto_geracao_id_fkey"
      columns: ["geracao_id"]
isOneToOne: false
      referencedRelation: "geracoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fichas_produto_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fichas_produto_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"fotos_produto": {
                  Row: {
                    "criado_em": string,"id": string,"marca_id": string,"ordem": number,"produto_id": string,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"id"?: string,"marca_id": string,"ordem"?: number,"produto_id": string,"storage_path": string
                  }
                  Update: {
                    "criado_em"?: string,"id"?: string,"marca_id"?: string,"ordem"?: number,"produto_id"?: string,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fotos_produto_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fotos_produto_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"geracoes": {
                  Row: {
                    "cobranca_id": string | null,"concluido_em": string | null,"criado_em": string,"custo_usd": number | null,"entrada": NonNullable<Json>,"erro": string | null,"id": string,"marca_id": string,"modelo": string,"request_id": string | null,"resultado_url": string | null,"status": Database["public"]['Enums']["status_geracao"],"tentativa": number,"tipo": Database["public"]['Enums']["tipo_geracao"]
                  }
                  ComputedFields: never
                  Insert: {
                    "cobranca_id"?: string | null,"concluido_em"?: string | null,"criado_em"?: string,"custo_usd"?: number | null,"entrada": NonNullable<Json>,"erro"?: string | null,"id"?: string,"marca_id": string,"modelo": string,"request_id"?: string | null,"resultado_url"?: string | null,"status"?: Database["public"]['Enums']["status_geracao"],"tentativa"?: number,"tipo": Database["public"]['Enums']["tipo_geracao"]
                  }
                  Update: {
                    "cobranca_id"?: string | null,"concluido_em"?: string | null,"criado_em"?: string,"custo_usd"?: number | null,"entrada"?: NonNullable<Json>,"erro"?: string | null,"id"?: string,"marca_id"?: string,"modelo"?: string,"request_id"?: string | null,"resultado_url"?: string | null,"status"?: Database["public"]['Enums']["status_geracao"],"tentativa"?: number,"tipo"?: Database["public"]['Enums']["tipo_geracao"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "geracoes_cobranca_id_fkey"
      columns: ["cobranca_id"]
isOneToOne: false
      referencedRelation: "movimentacoes_creditos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "geracoes_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    }
                  ]
                },"marcas": {
                  Row: {
                    "ativa": boolean,"atualizado_em": string,"cor_destaque": string | null,"criado_em": string,"cta_padrao": string | null,"id": string,"idioma_anuncios": Database["public"]['Enums']["idioma"],"instagram": string | null,"logo_path": string | null,"nome": string,"saldo_creditos": number,"tom_de_voz": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativa"?: boolean,"atualizado_em"?: string,"cor_destaque"?: string | null,"criado_em"?: string,"cta_padrao"?: string | null,"id"?: string,"idioma_anuncios"?: Database["public"]['Enums']["idioma"],"instagram"?: string | null,"logo_path"?: string | null,"nome": string,"saldo_creditos"?: number,"tom_de_voz"?: string | null
                  }
                  Update: {
                    "ativa"?: boolean,"atualizado_em"?: string,"cor_destaque"?: string | null,"criado_em"?: string,"cta_padrao"?: string | null,"id"?: string,"idioma_anuncios"?: Database["public"]['Enums']["idioma"],"instagram"?: string | null,"logo_path"?: string | null,"nome"?: string,"saldo_creditos"?: number,"tom_de_voz"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"movimentacoes_creditos": {
                  Row: {
                    "acao": Database["public"]['Enums']["acao_cobravel"] | null,"criado_em": string,"criado_por": string | null,"estorno_de_id": string | null,"id": string,"marca_id": string,"moeda": string | null,"observacao": string | null,"pagamento_id": string | null,"quantidade": number,"referencia_id": string | null,"referencia_tipo": string | null,"saldo_apos": number,"tipo": Database["public"]['Enums']["tipo_movimentacao"],"valor_pago_centavos": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acao"?: Database["public"]['Enums']["acao_cobravel"] | null,"criado_em"?: string,"criado_por"?: string | null,"estorno_de_id"?: string | null,"id"?: string,"marca_id": string,"moeda"?: string | null,"observacao"?: string | null,"pagamento_id"?: string | null,"quantidade": number,"referencia_id"?: string | null,"referencia_tipo"?: string | null,"saldo_apos": number,"tipo": Database["public"]['Enums']["tipo_movimentacao"],"valor_pago_centavos"?: number | null
                  }
                  Update: {
                    "acao"?: Database["public"]['Enums']["acao_cobravel"] | null,"criado_em"?: string,"criado_por"?: string | null,"estorno_de_id"?: string | null,"id"?: string,"marca_id"?: string,"moeda"?: string | null,"observacao"?: string | null,"pagamento_id"?: string | null,"quantidade"?: number,"referencia_id"?: string | null,"referencia_tipo"?: string | null,"saldo_apos"?: number,"tipo"?: Database["public"]['Enums']["tipo_movimentacao"],"valor_pago_centavos"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimentacoes_creditos_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_creditos_estorno_de_id_fkey"
      columns: ["estorno_de_id"]
isOneToOne: false
      referencedRelation: "movimentacoes_creditos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_creditos_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "movimentacoes_creditos_pagamento_id_fkey"
      columns: ["pagamento_id"]
isOneToOne: true
      referencedRelation: "pagamentos"
      referencedColumns: ["id"]
    }
                  ]
                },"pacotes_creditos": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"creditos": number,"criado_em": string,"id": string,"moeda": string,"nome": string,"ordem": number,"preco_centavos": number,"stripe_price_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"creditos": number,"criado_em"?: string,"id"?: string,"moeda": string,"nome": string,"ordem"?: number,"preco_centavos": number,"stripe_price_id": string
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"creditos"?: number,"criado_em"?: string,"id"?: string,"moeda"?: string,"nome"?: string,"ordem"?: number,"preco_centavos"?: number,"stripe_price_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pagamentos": {
                  Row: {
                    "atualizado_em": string,"creditos": number,"criado_em": string,"criado_por": string,"id": string,"marca_id": string,"moeda": string,"observacao": string | null,"pacote_id": string,"pago_em": string | null,"status": Database["public"]['Enums']["status_pagamento"],"stripe_checkout_session_id": string | null,"stripe_payment_intent_id": string | null,"valor_centavos": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"creditos": number,"criado_em"?: string,"criado_por": string,"id"?: string,"marca_id": string,"moeda": string,"observacao"?: string | null,"pacote_id": string,"pago_em"?: string | null,"status"?: Database["public"]['Enums']["status_pagamento"],"stripe_checkout_session_id"?: string | null,"stripe_payment_intent_id"?: string | null,"valor_centavos": number
                  }
                  Update: {
                    "atualizado_em"?: string,"creditos"?: number,"criado_em"?: string,"criado_por"?: string,"id"?: string,"marca_id"?: string,"moeda"?: string,"observacao"?: string | null,"pacote_id"?: string,"pago_em"?: string | null,"status"?: Database["public"]['Enums']["status_pagamento"],"stripe_checkout_session_id"?: string | null,"stripe_payment_intent_id"?: string | null,"valor_centavos"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "pagamentos_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagamentos_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pagamentos_pacote_id_fkey"
      columns: ["pacote_id"]
isOneToOne: false
      referencedRelation: "pacotes_creditos"
      referencedColumns: ["id"]
    }
                  ]
                },"pedidos_convite": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"email": string,"id": string,"idioma": Database["public"]['Enums']["idioma"],"instagram": string | null,"marca": string,"mensagem": string | null,"nome": string,"status": Database["public"]['Enums']["pedido_convite_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"email": string,"id"?: string,"idioma"?: Database["public"]['Enums']["idioma"],"instagram"?: string | null,"marca": string,"mensagem"?: string | null,"nome": string,"status"?: Database["public"]['Enums']["pedido_convite_status"]
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"email"?: string,"id"?: string,"idioma"?: Database["public"]['Enums']["idioma"],"instagram"?: string | null,"marca"?: string,"mensagem"?: string | null,"nome"?: string,"status"?: Database["public"]['Enums']["pedido_convite_status"]
                  }
                  Relationships: [
                    
                  ]
                },"perfis": {
                  Row: {
                    "ativo": boolean,"criado_em": string,"email": string,"id": string,"idioma": Database["public"]['Enums']["idioma"],"marca_id": string | null,"nome": string,"papel": Database["public"]['Enums']["papel_usuario"]
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"criado_em"?: string,"email": string,"id": string,"idioma"?: Database["public"]['Enums']["idioma"],"marca_id"?: string | null,"nome": string,"papel"?: Database["public"]['Enums']["papel_usuario"]
                  }
                  Update: {
                    "ativo"?: boolean,"criado_em"?: string,"email"?: string,"id"?: string,"idioma"?: Database["public"]['Enums']["idioma"],"marca_id"?: string | null,"nome"?: string,"papel"?: Database["public"]['Enums']["papel_usuario"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfis_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    }
                  ]
                },"precos_acoes": {
                  Row: {
                    "acao": Database["public"]['Enums']["acao_cobravel"],"atualizado_em": string,"creditos": number,"descricao": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": Database["public"]['Enums']["acao_cobravel"],"atualizado_em"?: string,"creditos": number,"descricao": string
                  }
                  Update: {
                    "acao"?: Database["public"]['Enums']["acao_cobravel"],"atualizado_em"?: string,"creditos"?: number,"descricao"?: string
                  }
                  Relationships: [
                    
                  ]
                },"produtos": {
                  Row: {
                    "arquivado": boolean,"atualizado_em": string,"categoria": Database["public"]['Enums']["categoria_peca"],"criado_em": string,"descricao": string | null,"ficha_aprovada_id": string | null,"genero_alvo": Database["public"]['Enums']["genero_alvo"],"id": string,"marca_id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arquivado"?: boolean,"atualizado_em"?: string,"categoria": Database["public"]['Enums']["categoria_peca"],"criado_em"?: string,"descricao"?: string | null,"ficha_aprovada_id"?: string | null,"genero_alvo"?: Database["public"]['Enums']["genero_alvo"],"id"?: string,"marca_id": string,"nome": string
                  }
                  Update: {
                    "arquivado"?: boolean,"atualizado_em"?: string,"categoria"?: Database["public"]['Enums']["categoria_peca"],"criado_em"?: string,"descricao"?: string | null,"ficha_aprovada_id"?: string | null,"genero_alvo"?: Database["public"]['Enums']["genero_alvo"],"id"?: string,"marca_id"?: string,"nome"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "produtos_ficha_aprovada_id_fkey"
      columns: ["ficha_aprovada_id"]
isOneToOne: false
      referencedRelation: "fichas_produto"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "produtos_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    }
                  ]
                },"quadros": {
                  Row: {
                    "cena_id": string,"criado_em": string,"geracao_id": string | null,"id": string,"imagem_path": string | null,"instrucao_refacao": string | null,"marca_id": string,"qc_aprovado": boolean | null,"qc_detalhe": Json | null,"status": Database["public"]['Enums']["status_item"],"versao": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cena_id": string,"criado_em"?: string,"geracao_id"?: string | null,"id"?: string,"imagem_path"?: string | null,"instrucao_refacao"?: string | null,"marca_id": string,"qc_aprovado"?: boolean | null,"qc_detalhe"?: Json | null,"status"?: Database["public"]['Enums']["status_item"],"versao": number
                  }
                  Update: {
                    "cena_id"?: string,"criado_em"?: string,"geracao_id"?: string | null,"id"?: string,"imagem_path"?: string | null,"instrucao_refacao"?: string | null,"marca_id"?: string,"qc_aprovado"?: boolean | null,"qc_detalhe"?: Json | null,"status"?: Database["public"]['Enums']["status_item"],"versao"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quadros_cena_id_fkey"
      columns: ["cena_id"]
isOneToOne: false
      referencedRelation: "cenas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quadros_geracao_id_fkey"
      columns: ["geracao_id"]
isOneToOne: false
      referencedRelation: "geracoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quadros_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "aprovar_ficha":
{ Args: { "p_ficha_id": string }; Returns: string
                           },
"creditar_pagamento":
{ Args: { "p_moeda": string,"p_pagamento_id": string,"p_stripe_payment_intent_id": string,"p_valor_centavos": number }; Returns: string
                           },
"debitar_creditos":
{ Args: { "p_acao": Database["public"]['Enums']["acao_cobravel"],"p_criado_por": string,"p_marca_id": string,"p_quantidade_itens": number,"p_referencia_id": string,"p_referencia_tipo": string }; Returns: string
                           },
"eh_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"estornar_creditos":
{ Args: { "p_movimentacao_id": string,"p_observacao": string,"p_quantidade"?: number,"p_referencia_id"?: string,"p_referencia_tipo"?: string }; Returns: string
                           },
"estornar_pagamento":
{ Args: { "p_pagamento_id": string }; Returns: string
                           },
"lancar_creditos":
{ Args: { "p_criado_por": string,"p_marca_id": string,"p_moeda"?: string,"p_observacao": string,"p_quantidade": number,"p_tipo": Database["public"]['Enums']["tipo_movimentacao"],"p_valor_pago_centavos": number }; Returns: string
                           },
"minha_marca_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"pegar_proximo_anuncio_para_montar":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"pode_gravar_original":
{ Args: { "p_nome": string }; Returns: boolean
                           }
          }
          Enums: {
            "acao_cobravel": "gerar_ficha"|"refazer_ficha"|"gerar_roteiro_quadros"|"refazer_quadro"|"gerar_video"|"refazer_clipe"|"remontar_texto","categoria_peca": "top"|"legging"|"shorts"|"camiseta"|"regata"|"jaqueta"|"conjunto"|"outro","cenario": "academia"|"box_crossfit"|"estudio_funcional"|"ao_ar_livre_urbano"|"ao_ar_livre_natureza"|"pista_de_corrida"|"orla_praia"|"academia_praia"|"parque_urbano"|"calcadao_rio"|"academia_ampla","estilo_video": "energetico"|"cinematografico"|"lifestyle","faixa_etaria": "de_20_a_30"|"de_30_a_45"|"acima_de_45","feedback_status": "novo"|"visto"|"resolvido","feedback_tipo": "problema"|"sugestao","formato_video": "vertical_9_16"|"horizontal_16_9","genero_alvo": "feminino"|"masculino"|"unissex","genero_modelo": "mulher"|"homem","idioma": "pt_br"|"en","modalidade": "musculacao"|"crossfit"|"hyrox"|"corrida"|"funcional"|"yoga_pilates","papel_usuario": "admin_plataforma"|"usuario_marca","pedido_convite_status": "novo"|"convidado"|"recusado","status_anuncio": "gerando_roteiro"|"gerando_quadros"|"aguardando_aprovacao"|"gerando_clipes"|"montando"|"pronto"|"falhou","status_ficha": "gerando"|"aguardando_aprovacao"|"aprovada"|"descartada"|"falhou","status_geracao": "na_fila"|"processando"|"concluida"|"falhou"|"bloqueada_nsfw","status_item": "gerando"|"pronto"|"descartado"|"falhou","status_pagamento": "iniciado"|"pago"|"falhou"|"expirado"|"reembolsado","tipo_geracao": "ficha_produto"|"quadro_chave"|"clipe_video","tipo_movimentacao": "compra"|"bonus"|"consumo"|"estorno"|"ajuste_manual"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "acao_cobravel": ["gerar_ficha", "refazer_ficha", "gerar_roteiro_quadros", "refazer_quadro", "gerar_video", "refazer_clipe", "remontar_texto"],"categoria_peca": ["top", "legging", "shorts", "camiseta", "regata", "jaqueta", "conjunto", "outro"],"cenario": ["academia", "box_crossfit", "estudio_funcional", "ao_ar_livre_urbano", "ao_ar_livre_natureza", "pista_de_corrida", "orla_praia", "academia_praia", "parque_urbano", "calcadao_rio", "academia_ampla"],"estilo_video": ["energetico", "cinematografico", "lifestyle"],"faixa_etaria": ["de_20_a_30", "de_30_a_45", "acima_de_45"],"feedback_status": ["novo", "visto", "resolvido"],"feedback_tipo": ["problema", "sugestao"],"formato_video": ["vertical_9_16", "horizontal_16_9"],"genero_alvo": ["feminino", "masculino", "unissex"],"genero_modelo": ["mulher", "homem"],"idioma": ["pt_br", "en"],"modalidade": ["musculacao", "crossfit", "hyrox", "corrida", "funcional", "yoga_pilates"],"papel_usuario": ["admin_plataforma", "usuario_marca"],"pedido_convite_status": ["novo", "convidado", "recusado"],"status_anuncio": ["gerando_roteiro", "gerando_quadros", "aguardando_aprovacao", "gerando_clipes", "montando", "pronto", "falhou"],"status_ficha": ["gerando", "aguardando_aprovacao", "aprovada", "descartada", "falhou"],"status_geracao": ["na_fila", "processando", "concluida", "falhou", "bloqueada_nsfw"],"status_item": ["gerando", "pronto", "descartado", "falhou"],"status_pagamento": ["iniciado", "pago", "falhou", "expirado", "reembolsado"],"tipo_geracao": ["ficha_produto", "quadro_chave", "clipe_video"],"tipo_movimentacao": ["compra", "bonus", "consumo", "estorno", "ajuste_manual"]
          }
        }
} as const
