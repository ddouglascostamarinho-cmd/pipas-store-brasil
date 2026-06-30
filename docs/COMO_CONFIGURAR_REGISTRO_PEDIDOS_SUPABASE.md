# Como configurar o registro central de pedidos assistidos

## Objetivo

Fazer todos os pedidos criados no site ficarem registrados em um banco central, para aparecerem no Portal do Lojista e no Painel Admin, mesmo quando o cliente cria o pedido pelo próprio celular.

## Arquivos deste pacote

- `index.html` — site ajustado para registrar pedidos no Supabase antes de abrir o WhatsApp.
- `assets/data/supabase-config.js` — arquivo de configuração do Supabase.
- `assets/data/tabela-precos.csv` — tabela de preços atual.
- `supabase/sql/01_pedidos_assistidos.sql` — script para criar a tabela de pedidos no Supabase.
- `docs/COMO_EDITAR_TABELA_PRECOS.md` — orientação da tabela de preços.
- `docs/COMO_CONFIGURAR_REGISTRO_PEDIDOS_SUPABASE.md` — este documento.

## Passo 1 — Criar projeto no Supabase

1. Acesse o Supabase.
2. Crie um projeto para a Pipas Store Brasil.
3. Aguarde o projeto ficar ativo.

## Passo 2 — Criar a tabela de pedidos

1. No Supabase, abra `SQL Editor`.
2. Crie uma nova query.
3. Cole o conteúdo de:

```text
supabase/sql/01_pedidos_assistidos.sql
```

4. Clique em `Run`.

## Passo 3 — Copiar URL e anon key

No Supabase:

```text
Project Settings -> API
```

Copie:

```text
Project URL
anon public key
```

## Passo 4 — Configurar o site

Edite o arquivo:

```text
assets/data/supabase-config.js
```

Troque:

```js
window.PSB_SUPABASE_CONFIG = {
  enabled: false,
  url: "COLE_AQUI_A_URL_DO_SUPABASE",
  anonKey: "COLE_AQUI_A_ANON_KEY_DO_SUPABASE"
};
```

Por:

```js
window.PSB_SUPABASE_CONFIG = {
  enabled: true,
  url: "SUA_URL_DO_SUPABASE",
  anonKey: "SUA_ANON_KEY_DO_SUPABASE"
};
```

## Passo 5 — Subir no GitHub

Suba estes arquivos:

```text
index.html
assets/data/supabase-config.js
assets/data/tabela-precos.csv
docs/COMO_EDITAR_TABELA_PRECOS.md
docs/COMO_CONFIGURAR_REGISTRO_PEDIDOS_SUPABASE.md
supabase/sql/01_pedidos_assistidos.sql
```

## Como testar

1. Abra o site em aba anônima.
2. Adicione um produto ao carrinho.
3. Vá para o checkout.
4. Preencha nome, telefone e cidade.
5. Clique para criar pedido para Juninho Pipas.
6. O site deve registrar o pedido e depois abrir o WhatsApp.
7. Entre no Portal do Lojista com:

```text
Login: juninho
Senha: juninho0713
```

8. O pedido deve aparecer em `Pedidos da loja`.

## Observação importante de segurança

Esta é uma solução de MVP assistido. Ela resolve o registro central dos pedidos, mas ainda não é a segurança final do marketplace.

Na Fase 2, o correto será implementar:

- login real;
- permissões por lojista;
- backend seguro;
- políticas de acesso por usuário;
- pagamento Pix integrado;
- histórico e auditoria mais robustos.
