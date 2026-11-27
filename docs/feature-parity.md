# Feature Parity — ManagerClientsRadio

Documento de referência para garantir que módulos com funcionalidades semelhantes ofereçam a mesma experiência.

## Módulos e funcionalidades

| Módulo | Rota | Lista | Busca | Filtros | Ordenação | Paginação | Seleção em massa | Ações em massa | Abas de visão | Criar | Editar | Detalhe | Import | Export |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Clientes | `/clients` | sim | sim | sim | sim | sim (10) | sim (long-press) | arquivar, excluir | ativos / arquivados / lixeira | sim | sim | sim | sim | sim |
| Contratos | `/contracts` | sim | sim | sim | sim | sim (10) | sim (long-press) | arquivar, excluir | ativos / arquivados / lixeira | via diálogo | sim | sim | sim | sim |
| Lembretes | `/reminders` | sim | sim | sim | sim | sim (10) | sim (long-press) | concluir, reabrir, arquivar, excluir | ativos / arquivados / lixeira | sim | sim | — | sim | sim |
| Lixeira | `/trash` | sim | — | — | — | sim (15) | sim | restaurar, excluir definitivo | clientes / contratos / lembretes | — | — | — | — | — |
| Planilhas | `/spreadsheet` | visão geral | — | — | — | — | — | importar/exportar tudo | — | — | — | — | sim | sim |
| Notificações | `/notifications` | sim | — | — | — | — | — | marcar lida / todas | — | — | — | — | — | — |
| Dashboard | `/dashboard` | cards + listas | — | — | — | — | — | — | — | — | — | — | — | — |
| Configurações | `/settings` | — | — | — | — | — | — | — | seções | — | sim | — | — | — |

## Padrão compartilhado de listas (obrigatório)
Arquivos de referência:
- `components/clients/clients-table.tsx`
- `components/contracts/contract-table.tsx`
- `components/reminders/reminders-view.tsx`
- `components/trash/trash-view.tsx`

Elementos comuns:
- `Input` de busca textual sobre múltiplos campos.
- `Select` de filtros (status, tipo, responsável).
- `SortFilter` no formato `campo|direção`.
- Abas de visão em formato pill (`active` / `archived` / `trash`).
- Paginação client-side com `PAGE_SIZE` (10 em listas principais, 15 na lixeira).
- Seleção por long-press (450ms) e checkbox no cabeçalho.
- Barra de ações em massa quando `selected.size > 0`.
- Confirmação destrutiva em diálogo.
- Estado vazio explícito.
- Tabela com `overflow-x-auto` e `min-w-[700–900px]`.
- Badges de status com variantes.

## Regras de paridade
1. Ao criar ou alterar um módulo de lista, comparar com os três módulos principais (Clientes, Contratos, Lembretes).
2. Reutilizar a mesma estrutura de busca, filtros, ordenação, paginação, seleção e ações em massa.
3. Não deixar um módulo sem um recurso presente nos demais sem justificativa funcional documentada aqui.
4. Diferenças permitidas:
   - Lixeira não possui busca/filtros por ser uma visão unificada de curta duração.
   - Notificações não possuem paginação/exportação por serem um feed simples.
   - Dashboard é composto por cards/listas, não por tabela paginada.
5. Ações exclusivas de um módulo (ex.: concluir lembrete, upload de PDF em contrato) não precisam existir nos outros.

## Desvios conhecidos (corrigir apenas quando o arquivo for tocado, com aprovação)
- `window.confirm` usado na exclusão de evento no dashboard — deve ser substituído por `AlertDialog`/`Dialog`.
- Configurações usam abas controladas por estado em vez de `Tabs` do shadcn.
- Confirmações destrutivas ainda usam `Dialog`; o padrão-alvo é `AlertDialog`.

## Funcionalidades compartilhadas (globais)
- Autenticação e escopo por papel (`admin` / `vendor`).
- Soft delete/arquivamento (`deletedAt` / `archivedAt`) e lixeira unificada.
- Jobs em background para importação/sincronização.
- Notificações in-app + navegador.
- Integração Google Calendar.
- Importação/exportação XLSX/PDF com modelo unificado.
- Eventos de contato gerados automaticamente.
