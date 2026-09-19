# Pipas Store Brasil

Site estático com catálogo e pedidos conectados ao Supabase. Publicação atual: https://www.pipasstore.com.br.

## Desenvolvimento

Requer Node.js 24. Execute `npm ci --ignore-scripts`, `npm run build`, `npm test` e `npm run preview`. A prévia abre em http://127.0.0.1:4173.

Edite o layout comum em `scripts/site-template.html`, os estilos em `assets/css/` e a aplicação em `assets/data/`. O arquivo `index.html` e os demais documentos listados em `scripts/generated-pages.json` são gerados; depois de editar as fontes, execute `npm run build` e inclua os arquivos gerados no commit. A integração contínua verifica que a geração foi atualizada.

## Rotas e publicação

O fluxo conectado ao GitHub publica o Worker estático `pipas-store-brasil`. `wrangler.jsonc` mantém os endereços sem barra final e entrega a página de erro com status HTTP 404. A configuração segue a documentação oficial: https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/ e https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/.

Os documentos de produtos, categorias e artigos são publicados em diretórios com `index.html`, permitindo acesso direto em hospedagem estática sem regras de reescrita. Links antigos com `#/` continuam funcionando e passam para o endereço atual. `404.html` evita que endereços inexistentes sejam apresentados como páginas válidas.

A geração usa o catálogo local apenas para conteúdo e apresentações. Os valores de compra vêm do catálogo vigente no Supabase. Não há preços de oferta no JSON-LD estático, e os controles ficam indisponíveis até a consulta ao catálogo. Mantenha a tabela local coerente com as variações publicadas e gere novamente quando o catálogo mudar.

Não é necessária migração de banco para esta versão. A autenticação e as políticas do Supabase continuam responsáveis pelo acesso e registro dos pedidos. Nunca inclua chaves privadas na aplicação.

## Condições comerciais e métricas

O destino determina disponibilidade, pedido mínimo por loja e meios de pagamento. Frete, preparação e prazo são confirmados no WhatsApp antes do pagamento. Atendimento informado pelo proprietário: segunda a sábado, em horário comercial. As rabiolas de 75 m e 100 m usam a fotografia do modelo Normal fita 10 cm, conforme autorização do proprietário.

`analytics.js` disponibiliza eventos de página, produto, carrinho, checkout, pedido registrado e WhatsApp no `dataLayer`. O proprietário informou que ainda não possui Google Analytics/Tag Manager; nenhuma coleta externa foi ativada. A integração futura deve definir a propriedade e a configuração de privacidade antes de carregar o serviço. Pedido registrado é `generate_lead`; não representa pagamento confirmado e não dispara `purchase`. Nome, telefone, endereço, busca livre e número do pedido não entram nesses eventos.

## Validação

Os testes cobrem preços e quantidades, idempotência, formulários, meios de pagamento, pedido mínimo, rotas privadas, metadados, documentos publicados e eventos. Os testes SQL usam PGlite isolado e não gravam na produção. O fluxo visual foi conferido no computador e em viewport móvel de 390 px, até o checkout, sem registrar pedido de teste na produção.
