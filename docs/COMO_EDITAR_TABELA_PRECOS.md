# Como editar a tabela de preços do site

Arquivo usado pelo site:

`/assets/data/tabela-precos.csv`

## Como editar

1. Abra o arquivo `tabela-precos.csv` no Excel, Google Sheets ou LibreOffice.
2. Altere somente a coluna `preco`, sempre que possível.
3. Mantenha as colunas `slug_produto`, `tipo_venda` e `label_site` sem alteração, pois o site usa esses campos para localizar o produto e montar as variações.
4. Use preço sem "R$".

Exemplos aceitos:

`10,00`
`15,50`
`130,00`

## Colunas principais

- `categoria`: categoria do produto.
- `produto`: nome exibido no site.
- `slug_produto`: identificador técnico usado pelo site.
- `variacao`: tamanho, jardas ou atributo.
- `tipo_venda`: tipo da variação.
- `label_site`: texto da variação exibido no site.
- `unidade_preco`: unidade de venda.
- `quantidade_pacote`: quantidade do pacote, quando aplicável.
- `preco`: preço que será lido pelo site.
- `ativo`: use `sim` para aparecer no site e `nao` para ocultar.
- `observacao`: campo livre para observações internas.

## Regra de cuidado

Não renomeie as colunas.
Não apague o cabeçalho.
Não altere o separador `;` caso edite em editor de texto.

## Fluxo recomendado

Excel atualizado internamente → CSV atualizado → subir `tabela-precos.csv` no GitHub → site atualiza preços após deploy.
