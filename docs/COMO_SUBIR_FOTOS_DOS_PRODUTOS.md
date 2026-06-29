# COMO SUBIR FOTOS DOS PRODUTOS

## Objetivo
Padronizar o envio das imagens dos produtos sem alterar o restante do site.

## Estrutura obrigatória
- Pasta base: `/assets/products/`
- Imagem principal do produto: `/assets/products/[slug]/principal.jpg`
- Galeria opcional:
  - `/assets/products/[slug]/galeria-01.jpg`
  - `/assets/products/[slug]/galeria-02.jpg`
  - `/assets/products/[slug]/galeria-03.jpg`
- Fallback padrão: `/assets/products/placeholder.jpg`

## Regras de nome
- Usar somente **minúsculas**
- Extensão obrigatória: **.jpg**
- **Sem espaços**
- **Sem acentos**
- **Sem ç**
- **Sem caracteres especiais**

## Exemplos corretos
### Mucha
- `/assets/products/mucha/principal.jpg`
- `/assets/products/mucha/galeria-01.jpg`
- `/assets/products/mucha/galeria-02.jpg`
- `/assets/products/mucha/galeria-03.jpg`

### Linha Chilena
- `/assets/products/linha-chilena/principal.jpg`
- `/assets/products/linha-chilena/galeria-01.jpg`
- `/assets/products/linha-chilena/galeria-02.jpg`
- `/assets/products/linha-chilena/galeria-03.jpg`

## Como subir no GitHub
1. Abrir o repositório do site.
2. Entrar na pasta `assets/products/`.
3. Entrar no slug correto do produto.
4. Fazer upload da imagem com o nome exato (`principal.jpg` ou `galeria-01.jpg`, etc.).
5. Confirmar commit no GitHub.
6. Aguardar o deploy da Cloudflare Pages.

## Observações operacionais
- Os arquivos de imagem criados nesta fase funcionam como **estrutura-base** e podem ser substituídos a qualquer momento.
- Se `principal.jpg` não existir ou estiver inválida, o site usa `placeholder.jpg`.
- As imagens da galeria só aparecem se o arquivo correspondente estiver válido.
- Não é necessário alterar checkout, carrinho, painel admin, portal do lojista, layout, Cloudflare ou imagens institucionais.

## Verificação pós-deploy
1. Abrir a home e validar se o catálogo continua carregando.
2. Abrir um produto com foto enviada e confirmar se o card usa a nova `principal.jpg`.
3. Abrir a página do produto e validar a imagem principal.
4. Confirmar se apenas as galerias enviadas aparecem.
5. Testar um produto sem foto enviada e confirmar uso do `placeholder.jpg`.
6. Validar que checkout, carrinho, portal do lojista e painel admin seguem intactos.
