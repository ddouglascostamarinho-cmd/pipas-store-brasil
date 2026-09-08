# Piloto de catálogo — setembro de 2026

Implementação para revisão, antes de aplicar o tratamento às demais fotos.

- Fundo claro #f1f0e8 nas áreas de produto, preservando preto/amarelo e fotografias institucionais.
- Mucha, Carretilhas Madeira e Rabiola Cotoco Curta fita 10cm: imagens de apresentação em categorias, destaques e galeria. Originais preservadas na segunda miniatura.
- Mucha tem transparência alfa; carretilhas e rabiola têm fundo claro incorporado. Não apresentar os três arquivos como recortes com transparência.
- Ferramenta integrada image_gen; conversão WebP com Sharp. As versões inicialmente rejeitadas tinham quadriculado incorporado. Imagens com IA são de apresentação; conferir fidelidade com a fotografia original antes da publicação.
- Catálogo com abertura mais compacta e busca destacada.
- Texto de homologação esclarece a autorização da loja vendedora.
- Seletores dependentes de tamanho, apresentação e rabiola usam os rótulos exatos e preços do catálogo. Formatos desconhecidos conservam o seletor original. Não há alteração no preço, nas permissões ou nas regras de envio.
- Descrições evitam materiais e acessórios não confirmados e preços fixos no texto. Guia explica o pedido assistido no WhatsApp antes do pagamento.

Validação: 11 testes de interface/lógica (8 existentes e 3 novos), 34 verificações existentes de banco em PGlite local; nenhuma escrita em produção. Revisão visual no navegador em desktop e largura de 390 px; pacote de 50 cm sem/com rabiola atualiza 40/60 reais conforme tabela sincronizada.

Prompts finais (image_gen integrado):

## mucha

Use case: background-extraction. Edit target: supplied original product photograph for Pipas Store, mucha. Remove ONLY the environment/background and external display fixtures, leaving the exact photographed product(s) as a clean cutout on a genuinely transparent alpha background. Preserve exact artwork, lettering, colors, shape, proportions, textures and small details. Do not redesign or invent parts. Preserve kite strings and paper texture. Remove wall and external black wall hanger. Composition: square canvas, whole subject centered with 10% transparent safe margin, no clipping. No ground, shadow, gradient, text overlay, border or checkerboard baked into pixels. This is an e-commerce faithful background removal, not a new illustration.

## carretilhas-madeira

Use case: background-extraction. Edit target: supplied original product photograph for Pipas Store, carretilhas-madeira. Remove ONLY the environment/background and external display fixtures, leaving the exact photographed product(s) as a clean cutout on a perfectly uniform solid warm ivory background, exactly RGB(241,240,232), hex #f1f0e8. Preserve exact artwork, lettering, colors, shape, proportions, textures and small details. Do not redesign or invent parts. Keep ALL FOUR reels in their original arrangement, including their holes. Remove shop shelves and counter, background visible through holes should be ivory. Composition: square canvas, whole subject centered with 10% ivory safe margin, no clipping. No ground, shadow, gradient, text overlay, border or checkerboard. Background MUST be solid #f1f0e8 everywhere around and between products. Do NOT draw a transparency grid. This is an e-commerce faithful background removal, not a new illustration.

## rabiola-cotoco-curta-fita-10cm

Use case: background-extraction. Edit target: supplied original product photograph for Pipas Store, rabiola-cotoco-curta-fita-10cm. Remove ONLY the environment/background and external display fixtures, leaving the exact photographed product(s) as a clean cutout on a perfectly uniform solid warm ivory background, exactly RGB(241,240,232), hex #f1f0e8. Preserve exact artwork, lettering, colors, shape, proportions, textures and small details. Do not redesign or invent parts. Keep the blue ribbons and their original arrangement. Remove wall and cardboard support. Composition: square canvas, whole subject centered with 10% ivory safe margin, no clipping. No ground, shadow, gradient, text overlay, border or checkerboard. Background MUST be solid #f1f0e8 everywhere around and between products. Do NOT draw a transparency grid. This is an e-commerce faithful background removal, not a new illustration.

