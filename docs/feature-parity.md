# Feature Parity — ManagerClientsRadio

Documento de referência para garantir que módulos com funcionalidades semelhantes ofereçam a mesma experiência.

## Módulos e funcionalidades

| Módulo | Rota | Lista | Busca | Filtros | Ordenação | Paginação | Seleção | Ações em massa | Visões | Criar | Editar | Detalhe | Import | Export |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Clientes | `/clients` | sim | sim | status, vendedor | sim | 10 | sim (checkbox + long-press) | arquivar, excluir | ativos/arquivados | página + dialog | dialog | sim | sim | Excel + PDF |
| Contratos | `/contracts` | sim | sim | tipo, status | sim | 10 | sim (checkbox + long-press) | arquivar, excluir | ativos/arquivados | dialog | dialog | sim | sim | Excel |
| Lembretes | `/reminders` | sim | sim | tipo, status | sim | 10 | sim (checkbox + long-press) | concluir/reabrir, arquivar, excluir | ativos/arquivados | dialog | dialog | não | não | não |
| Lixeira | `/trash` | sim | sim | tipo | não | 15 | sim (checkbox) | restaurar, excluir definitivo | clientes/contratos/lembretes | — | — | — | — | — |
| Planilha | `/spreadsheet` | visão geral | — | — | — | — | — | — | — | — | — | — | sim | sim |
| Notificações | `/notifications` | feed | — | — | — | — | — | marcar lida/todas | — | — | — | — | — | — |
| Dashboard | `/dashboard` | cards/listas | — | — | — | — | — | — | — | — | — | — | — | — |
| Configurações | `/settings` | — | — | — | — | — | — | — | abas internas | — | sim | — | — | — |

## Funcionalidades por módulo

### Dashboard (`/dashboard`)
- Stats: visitas hoje, vídeo hoje, contato atrasado, contratos a vencer, clientes ativos.
- Calendário mensal + agenda do dia alimentados pelos mesmos eventos persistidos dos clientes.
- Ações pendentes (último contato, próximo contato, próxima ação, vídeos, contatos atrasados e mudança de anúncio) derivadas dos eventos de hoje.
- Lembretes recentes ao lado dos contratos próximos do vencimento (PI, cliente e dias restantes), com filtro por quantidade de dias e lista rolável.
- Exclusão de evento personalizado e de lembrete com `AlertDialog`; eventos automáticos dos clientes não são excluíveis manualmente.

### Clientes (`/clients`, `/clients/new`, `/clients/[id]`)
- Lista com busca, filtros, sort, paginação, seleção em massa.
- Visões ativos/arquivados.
- Arquivar, excluir (soft delete), restaurar, excluir permanentemente.
- Exportar Excel/PDF; importar planilha completa (clientes/contratos/agenda a partir do dashboard).
- Criar (página e dialog), editar (dialog).
- Detalhe: avatar, dados, ações de contato/vídeo/anúncio, histórico de contato.
- Formulário completo com seções e máscaras; frequência do vídeo (`Semanal`/`Mensal`) com dias da semana condicionais.
- Lista exibe `Mensal` ou os dias semanais na coluna `Vídeo`; planilha exporta/importa `Frequência Vídeo` e `Dias Vídeo`.

### Contratos (`/contracts`, `/contracts/[id]`)
- Lista com busca, filtros, sort, paginação, seleção em massa.
- Visões ativos/arquivados.
- Arquivar, excluir, restaurar, excluir permanentemente.
- Exportar Excel; importar planilha completa (contratos a partir do dashboard).
- Criar via dialog (`/contracts/new` redireciona para `/contracts`).
- Editar via dialog.
- Detalhe em cards; upload de PDF.
- Formulário com máscara de moeda; aceita `onCancel`.

### Lembretes (`/reminders`)
- Lista com busca, filtros, sort, paginação, seleção em massa.
- Visões ativos/arquivados.
- Concluir/reabrir, arquivar, excluir, restaurar, excluir permanentemente.
- Criar/editar em dialog; exclusão individual.
- Sem import/export.

### Lixeira (`/trash`)
- Visão unificada de clientes, contratos e lembretes excluídos.
- Busca, filtro por tipo, paginação (15), seleção.
- Restaurar e excluir permanentemente.
- Sem ordenação, import/export, criação.

### Planilha (`/spreadsheet`)
- Importar modelo XLSX (6 abas) via job em background.
- Exportar Dashboard & Lembretes.
- Exportar planilha completa.
- Cards informativos das abas.

### Configurações (`/settings`)
- Abas: Perfil, Senha, Tema, Integrações, Notificações, Tarefas, Usuários (admin).
- Perfil, senha, tema (presets/cor/modo), Google Calendar, notificações, jobs, papéis.
- Abas controladas por estado (não usa `Tabs`), com `role="tablist"`, `aria-selected`, `aria-controls` e navegação por setas/Home/End.

### Notificações (`/notifications`)
- Feed de notificações; marcar como lida/todas.
- Notificações do navegador via service worker.

## Padrão compartilhado de listas (obrigatório)

Arquivos de referência:
- `components/clients/clients-table.tsx`
- `components/contracts/contract-table.tsx`
- `components/reminders/reminders-view.tsx`
- `components/trash/trash-view.tsx`

Elementos comuns:
- `Input type="search"` com `aria-label` para busca textual sobre múltiplos campos.
- `Select` de filtros (status, tipo, responsável) com `aria-label` no `SelectTrigger`.
- `SortFilter` no formato `campo|direção`; página resetada para 1 no próprio handler (sem `useEffect` + `setState`).
- Abas de visão em formato pill (`active`/`archived`) com `aria-current`.
- Paginação client-side compartilhada (`components/ui/pagination.tsx`), padrão 30 itens com seletor 10/30/50/100.
- Seleção por long-press (450ms) e checkbox no cabeçalho com estado `indeterminate` e `aria-label`.
- Barra de ações em massa quando `selected.size > 0`, com “Limpar seleção”.
- Acesso por teclado à navegação via `button` na célula identificadora (sem `cursor-pointer` na linha).
- Confirmação destrutiva via `AlertDialog`, com `try/catch/finally` e toast de erro.
- Estado vazio explícito.
- Tabela com container único de scroll (`overflow-auto`) e `min-w-[700–900px]`.
- Badges de status com variantes e texto (não apenas cor).

## Regras de paridade

1. Ao criar ou alterar um módulo de lista, comparar com Clientes, Contratos e Lembretes.
2. Reutilizar a mesma estrutura de busca, filtros, ordenação, paginação, seleção e ações em massa.
3. Não deixar um módulo sem um recurso presente nos demais sem justificativa funcional documentada aqui.
4. Diferenças permitidas:
   - Lixeira não tem ordenação/exportação por ser visão unificada de curta duração.
   - Notificações não têm paginação/exportação por serem feed simples.
   - Dashboard é composto por cards/listas, não tabela paginada.
   - Ações exclusivas (concluir lembrete, upload de PDF) não precisam existir nos outros.
5. Ao adicionar um recurso em um módulo, avaliar se os módulos equivalentes também devem recebê-lo.

## Desvios conhecidos (corrigir apenas quando o arquivo for tocado, com aprovação)

- Configurações usam abas controladas por estado em vez de `Tabs` do shadcn (com ARIA e navegação por teclado).
- Contratos não têm página dedicada de criação (`/contracts/new` redireciona).
- Cabeçalho de detalhe de cliente usa avatar circular; contrato usa ícone quadrado.
- Lembretes usam `Input type="date"` em vez de `Calendar`/`Popover`.
- Lembretes não têm exportação/importação.
- Lixeira não tem ordenação.
- Contratos não têm exportação PDF (clientes têm).

## Funcionalidades compartilhadas (globais)

- Autenticação e escopo por papel (`admin`/`vendor`).
- Soft delete/arquivamento (`deletedAt`/`archivedAt`) e lixeira unificada.
- Jobs em background para importação/sincronização.
- Notificações in-app + navegador.
- Integração Google Calendar.
- Importação/exportação XLSX/PDF com modelo unificado.
- Eventos de clientes (último contato, próximo contato, próxima ação, vídeo semanal/mensal, vencimento e mudança de anúncio) gerados/regenerados automaticamente.
