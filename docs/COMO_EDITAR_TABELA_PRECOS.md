# Como atualizar preços

A partir da versão de setembro de 2026, a fonte de preços é a tabela psb_catalog_products no Supabase. A vitrine e o registro do pedido usam os mesmos dados.

Entre no painel administrativo e abra **Preços do catálogo**. Escolha o produto, edite os valores e pressione **Salvar preços**. O painel confirma quando o banco gravou a alteração. Se outra sessão alterou o produto, recarregue antes de salvar. As faixas de rabiolas também são editáveis nesse painel.

O CSV assets/data/tabela-precos.csv fica preservado como referência da importação inicial. Alterá-lo sozinho não altera os preços publicados. Os 32 produtos/291 variações atuais foram importados junto com as faixas de quantidade já existentes.

Pedidos históricos mantêm seus valores originais. Novos pedidos têm produto, variação, vendedor, quantidade, preço e subtotal verificados pelo servidor.
