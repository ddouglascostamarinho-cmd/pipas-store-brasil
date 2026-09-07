# Baseline anterior à atualização

Os arquivos JSON documentam as migrations já aplicadas e o esquema consultado antes da atualização. Não são scripts para reaplicar sobre produção. O snapshot de colunas não inclui a identity do campo psb_security_audit_log.id; o teste isolado a reproduz explicitamente como GENERATED ALWAYS.

O SQL 01_pedidos_assistidos.sql é legado e não deve ser reaplicado. As permissões atuais estão documentadas neste baseline, e as novas mudanças estão em migrations.
