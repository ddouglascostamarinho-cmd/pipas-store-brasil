# Checklist de teste - Pedidos assistidos

Antes de considerar a alteração concluída, testar:

- [ ] O site abre normalmente na home.
- [ ] A loja carrega produtos e preços do CSV.
- [ ] O carrinho funciona.
- [ ] O checkout abre.
- [ ] O checkout mostra `Registro central ativo` após configurar Supabase.
- [ ] Ao criar pedido, o site registra o pedido antes de abrir WhatsApp.
- [ ] O pedido aparece no Portal do Lojista.
- [ ] O pedido aparece no Painel Admin.
- [ ] O lojista consegue alterar status do pedido.
- [ ] A mudança de status permanece após atualizar a página.
- [ ] Cliente consegue continuar fluxo pelo WhatsApp.

Se aparecer `Registro central não configurado`, conferir `assets/data/supabase-config.js`.
