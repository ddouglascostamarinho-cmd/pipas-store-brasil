# Etapa 2 — vitrine e solicitações centralizadas

A home adota a direção editorial aprovada: preto, amarelo, tipografia condensada, fotos reais da loja, categorias visuais e comunidade. A página do produto exibe a peça inteira e aproxima o CEP das opções de compra. O menu foi simplificado, mantendo os demais destinos no rodapé.

O CSS antes embutido passou a arquivos próprios, que podem ser reutilizados pelo cache. O HTML caiu de 250.121 para aproximadamente 194 mil bytes. As fontes Inter e Oswald são servidas pelo próprio site (61 KB de WOFF2, licenças OFL incluídas). Essas são mudanças estruturais; não representam uma medição de ganho de Core Web Vitals em usuários reais.

Cadastros de parceiros recebem protocolo confirmado pelo Supabase. CPF/CNPJ e demais dados pessoais só podem ser lidos pela administração. Homologar cria a loja e atualiza o cadastro na mesma transação. Não cria usuário Auth, senha ou confirmação de pagamento.

As solicitações de produto usam banco central e fotos em bucket privado, limitado a JPG/PNG/WebP de 2 MB. Cada lojista lê apenas suas solicitações e fotos. O administrador registra situação e retorno. Links de foto expiram em 5 minutos. Concluir uma análise não publica alterações no catálogo automaticamente.

Tentativas de envio reutilizam um UUID e a confirmação anterior. Apenas identificador e hash dos campos ficam em sessionStorage; fotos e documentos não são gravados no navegador. As filas são consultadas sob autenticação e limpas ao sair. As consultas exibem até 100 solicitações; cadastros pendentes priorizam os mais antigos e produtos exibem os mais recentes. Rascunhos locais antigos não são tratados como envios recebidos pelo servidor.

## Validação

- 8 testes de checkout, 18 de banco/pedidos e 17 de banco/solicitações em Postgres isolado via PGlite.
- Navegador desktop e celular: navegação de categoria, compra, falha/reenvio, confirmação recuperável, ausência de erro JavaScript e de rolagem horizontal.
- Navegadores separados de visitante, lojista e administrador, com backend simulado: protocolo após resposta perdida, upload, duplicidade, resposta à loja, escape de HTML e limpeza após logout.
- Login de lojista por e-mail validado pelo Auth e vínculo retornado pelo banco; aliases das lojas atuais continuam aceitos.
- Revisão visual com todas as imagens carregadas.
- Advisor do Supabase após migração: nenhum alerta novo; permanece a configuração pré-existente de proteção contra senhas vazadas desabilitada.
- Produção: 72 pedidos preservados; nenhum cadastro ou pedido fictício criado para testes. A verificação dos fluxos de escrita usa banco isolado e mocks, não clientes reais.

Migração aplicada: `20260907194924_central_partner_and_product_requests.sql`.

Documentação de referência: [Storage e RLS](https://supabase.com/docs/guides/storage/security/access-control), [URLs temporárias](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl).
