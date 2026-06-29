# CHECKLIST FASE 1

## Itens entregues
- [x] `index.html` ajustado somente para a lógica de imagens dos produtos.
- [x] Pasta `/assets/products/` criada.
- [x] `placeholder.jpg` criado.
- [x] Pastas de produto criadas para 29 slugs.
- [x] Pastas futuras criadas: `/assets/brand/`, `/assets/events/`, `/assets/gallery/`, `/assets/institutional/`, `/assets/blog/`.
- [x] Documento `/docs/COMO_SUBIR_FOTOS_DOS_PRODUTOS.md` criado.
- [x] Documento `/docs/MAPA_DE_IMAGENS_DOS_PRODUTOS.csv` criado.

## Alterações realizadas no index.html
- [x] Adicionadas funções `getProductMainImage(slug)` e `getProductGalleryImages(slug)`.
- [x] Catálogo ajustado para buscar a imagem principal em `/assets/products/[slug]/principal.jpg`.
- [x] Página do produto ajustada para usar `principal.jpg` com fallback para `placeholder.jpg`.
- [x] Galeria configurada para exibir apenas arquivos válidos (`galeria-01.jpg`, `galeria-02.jpg`, `galeria-03.jpg`).
- [x] Carrinho mantido intacto, com fallback visual de imagem quando necessário.

## Itens preservados por escopo
- [x] Checkout não alterado.
- [x] Carrinho não alterado em regra de negócio.
- [x] Painel admin não alterado.
- [x] Portal do lojista não alterado.
- [x] Layout geral não alterado.
- [x] Imagens institucionais não alteradas.
- [x] Configuração da Cloudflare não alterada.
- [x] Nenhuma imagem antiga foi apagada no pacote original.
