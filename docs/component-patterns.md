# Component Patterns — ManagerClientsRadio

Padrões reais observados no projeto. Novas funcionalidades devem seguir estes padrões.

## shadcn/ui (biblioteca padrão)

Componentes em `components/ui`:

`alert`, `avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `separator`, `sheet`, `skeleton`, `sort-filter`, `switch`, `table`, `tabs`, `textarea`, `toast`, `tooltip`.

Regras:
- Exclusões/confirmações destrutivas: `AlertDialog` (obrigatório). `Dialog` só para formulários e fluxos com múltiplas decisões.
- Formulários em modal: `Dialog`.
- Menus de ações: `DropdownMenu`.
- Notificações: `toast.add` (`components/ui/toast.tsx`) + `Toaster` no `app/layout.tsx`.
- Nunca `window.alert`, `window.confirm`, `window.prompt`.
- Não instalar componentes duplicados; não alterar componentes-base sem necessidade.

## Página de lista (CRUD)

Estrutura canônica (`clients`, `contracts`):

```tsx
<div className="space-y-4">
  <Toolbar />
  <Card className="overflow-hidden">
    <CardContent className="p-0">
      <DataTable />
    </CardContent>
  </Card>
</div>
```

Toolbar (`components/clients/clients-toolbar.tsx`, `components/contracts/contracts-toolbar.tsx`):
- Ícone em tile `h-10 w-10 rounded-lg bg-primary/10 text-primary`.
- Título `text-2xl font-bold tracking-tight`.
- Contagem `text-sm text-muted-foreground` (`N clientes cadastrados`).
- Abas de visão como links pill: container `rounded-lg border p-1`, ativo `bg-primary text-primary-foreground`, inativo `text-muted-foreground hover:bg-muted`.
- Ações à direita: exportar Excel, exportar PDF (clientes), importar planilha, “Novo ...”.

Tabela (`components/clients/clients-table.tsx`, `components/contracts/contract-table.tsx`):
- Container `max-h-[420px] overflow-auto border rounded-md`, com `[&_[data-slot=table-container]]:overflow-x-visible` para manter um único container de scroll (barra horizontal sempre no limite visível da tabela).
- Container rolável com `role="region"`, `aria-label` e `tabIndex={0}` para navegação por teclado.
- `Table` com `min-w-[900px]` (clientes) / `min-w-[700px]` (contratos, lembretes).
- Cabeçalho `bg-muted/40 hover:bg-muted/40`.
- Linhas `border-b hover:bg-muted/50`, clique navega para detalhe.
- Células `px-4 py-3`; números/datas `tabular-nums`.
- Estado vazio: `border rounded-lg p-8/p-10 text-sm text-muted-foreground text-center` ou linha `colSpan`.
- Paginação client-side via `components/ui/pagination.tsx`: padrão 30 itens, seletor 10/30/50/100, “Página X de Y (N itens)” + Anterior/Próxima.

Filtros:
- `Input` de busca `w-full sm:max-w-xs`.
- `Select` de status/tipo/vendedor `w-full sm:w-40`.
- `SortFilter` (`components/ui/sort-filter.tsx`) com valor `campo|direção`; campos com ícone opcional.
- `Input` com `type="search"`/`aria-label`; `SelectTrigger` com `aria-label` e `SelectValue placeholder`.
- Filtragem/ordenação no cliente; resetar página para 1 **nos próprios handlers** de busca/filtro/ordenação (não com `useEffect` + `setState`, que dispara `react-hooks/set-state-in-effect`).

Seleção em massa:
- `Checkbox` no cabeçalho (página atual) e por linha, sempre com `aria-label`; cabeçalho usa `checked={all ? true : some ? "indeterminate" : false}`.
- Long-press 450ms na linha, ignorando `button, a, input, [role='checkbox']`; cancela se mover > 8px.
- Barra de ações quando `selected.size > 0`: contagem + “Limpar seleção” + ações contextuais (arquivar/excluir/restaurar/purge).
- Clique no mouse na linha é conveniência; o acesso por teclado se dá por um `button` na célula identificadora (`aria-label="Abrir ..."`), sem sequestrar a seleção. Remover `cursor-pointer` da linha.
- Ações em lote com `AlertDialog`; `try/catch/finally` para loading e toast de erro.

## Formulários

- React Hook Form + `zodResolver`; schemas em `lib/validators.ts`.
- Seções com cabeçalho `border-b pb-2` e título `text-sm font-semibold`.
- Grid `grid gap-4 md:grid-cols-2`; campo `space-y-2`.
- `Label` com `htmlFor` associado ao `id` do controle (`SelectTrigger`/`Switch` também recebem `id`); `aria-label` quando não há label visível.
- Erro de campo: `text-sm text-destructive` com `id="campo-error"` + `role="alert"`; controle com `aria-invalid` e `aria-describedby`.
- Todo formulário em dialog usa React Hook Form + `zodResolver` com schema em `lib/validators.ts` (inclui o formulário de lembretes).
- Máscaras locais: moeda, telefone, CPF/CNPJ (em `client-form.tsx`).
- Campos condicionais usam `watch` do React Hook Form; em `client-form.tsx`, `videoFrequency === "weekly"` controla a exibição dos dias do vídeo (`Select` + `Popover`/`Checkbox`).
- Submit: “Salvando...” + `disabled`; cancelar `variant="outline"`.
- Sucesso: `toast.add({ title: "Concluído" })`, fechar dialog, `router.refresh()`.
- Erro: `toast.add({ title: "Erro", description: res.error })`.

## Confirmações

Padrão-alvo (AlertDialog):

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
      <AlertDialogDescription>Deseja ...?</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction>Confirmar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- Destrutivo: `AlertDialogAction variant="destructive"`.
- Processando: `disabled` + “Processando...”.
- Estado atual: `clients-table`, `contract-table`, `reminders-view`, `trash-view`, `dashboard-reminders` e `dashboard-middle` usam `AlertDialog`. Em `settings-view`, `Dialog` permanece apenas para os fluxos do Google (múltiplas decisões: background/continuar).

## Dialogs

- Criar/editar: `DialogContent` com `max-w-lg` ou `max-w-3xl max-h-[90vh] overflow-y-auto`.
- Cabeçalho `DialogHeader` + `DialogTitle` (+ `DialogDescription`).
- Rodapé `DialogFooter` com Cancelar (outline) e Salvar/Confirmar.
- Fechar e limpar estado ao concluir.

## Toasts

- `toast.add({ title: "Concluído" })` para sucesso.
- `toast.add({ title: "Erro", description: mensagem })` para erro.
- `Toaster` uma única vez no `app/layout.tsx`.
- Exemplos: `clients-toolbar`, `contract-table`, `reminders-view`, `settings-view`.

## Loading

- Botão: texto de progresso + `disabled` (`Salvando...`, `Processando...`, `Gerando...`).
- Página: `Skeleton` (`components/ui/skeleton.tsx`) quando necessário.
- Jobs longos: `BackgroundJobStatus` com polling (topbar a cada 4s; status a cada 1,5s).
- `BackgroundJobStatus` expõe `role="progressbar"` com `aria-valuenow/min/max` e `role="status"` com o texto do estado; o indicador circular da topbar inclui `aria-label` com percentual e quantidade de tarefas.
- Animações usam `motion-safe:animate-spin` / `motion-reduce:transition-none`.
- Evitar spinners soltos sem contexto.

## Dashboard

- Stats e seções em `space-y-6`; títulos de seção em `text-sm font-semibold text-foreground/80`.
- Lembretes e contratos lado a lado em `grid-cols-1 lg:grid-cols-2 gap-4`.
- Calendário, agenda do dia e ações pendentes usam somente eventos persistidos (`Event`), carregados por `listEventsAction`; não existe mais lista derivada em memória no dashboard.
- Eventos de cliente obrigatórios no calendário/agenda: `Último contato:`, `Próximo contato:` e `Próxima ação:` (título vindo de `nextAction` + cliente).
- Eventos de vídeo respeitam `videoFrequency`: semanal usa a bitmask `videoWeekday`; mensal usa `lastVideoSentAt` como âncora (ou hoje, se nunca enviado).
- Eventos gerados a partir de clientes têm prefixos estáveis em `lib/client-events.ts`; alterações em cliente regeram eventos via `ensureClientContactEventsForUser` e atualizam o dashboard pelo `syncKey`.
- Ações pendentes exibem os eventos de hoje com link para o cliente; eventos automáticos não têm botão de exclusão (a origem é o cadastro do cliente).
- Exclusão de evento personalizado usa `AlertDialog` + `router.refresh()`.
- Filtro de prazo do card de contratos: `Select` igual ao da paginação (`ContractDaysFilter`), opções `5/10/15/30/60/90`, padrão `5`, aplicado via `?dias=` sem botão adicional.
- Lista do card de contratos: `max-h-[360px] overflow-auto divide-y`, `role="region"`, `aria-label` e `tabIndex={0}`; linhas com PI, cliente e badge de dias restantes.

## Empty states

- Bloco `border rounded-lg p-8/p-10 text-sm text-muted-foreground text-center`.
- Textos: “Nenhum cliente cadastrado.”, “Nenhum contrato encontrado.”, “Nenhum lembrete encontrado.”, “Lixeira vazia.”.
- Em tabela: `<TableRow><TableCell colSpan={n} className="text-center text-muted-foreground">...</TableCell></TableRow>`.

## Import/Export

- `components/import-export.tsx`: `WorkbookImportButton` com `loading`.
- Exportação: `lib/export-excel.ts`, `lib/export-workbook.ts`, `lib/export-template.ts`, `lib/export-*.ts`; PDF via `jspdf`.
- Importação longa: `startImportWorkbookJobAction` + job em background + status no topbar.
- Um único import usa as tabelas visíveis de `DASHBOARD & LEMBRETES` como fonte: visitas viram Clientes, alertas de renovação viram Contratos e `CALENDÁRIO DE VISITAS` vira Agenda.
- As abas `CADASTRO DE CLIENTES`, `PROSPECÇÃO E VISITAS` e `CONTROLE DE CONTRATOS` são detalhamento/exportação; só são usadas como fallback se o dashboard não trouxer linhas.
- Contratos sem cliente cadastrado criam cliente mínimo apenas para manter o vínculo.
- `CADASTRO DE CLIENTES` inclui `Frequência Vídeo` (`Semanal`/`Mensal`) e `Dias Vídeo` (somente semanal), sempre ao final para não deslocar colunas existentes.
- Não criar exportador próprio por página; reutilizar o serviço global.

## Navegação e layout

- `PageHeader` (`components/layout/page-header.tsx`) para páginas compostas.
- Grupos/itens vêm de `lib/navigation.ts` (`navGroups`, `isNavItemActive`); sidebar desktop e `Sheet` mobile consomem a mesma fonte.
- Item ativo: `bg-primary/10 text-primary font-medium`; ícone `h-4 w-4` com `aria-hidden`; link ativo com `aria-current="page"`.
- Sem breadcrumbs.
- Topbar `sticky h-14` com blur; notificações e jobs em `DropdownMenu`, com `aria-label` informando contagem não lida/progresso.

## Abas

- Preferir `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (`components/ui/tabs.tsx`).
- Settings mantém botões controlados por estado, mas com `role="tablist"`/`role="tab"`/`role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby` e navegação por setas/Home/End (`tabIndex` roving).
- Abas devem compartilhar estrutura e ações equivalentes.

## Responsividade

- Mobile-first; `sm`, `md`, `lg`, `xl`.
- Toolbars `flex-col sm:flex-row`; botões `w-full sm:w-auto`.
- Grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/5`.
- Tabelas `overflow-x-auto` + `min-w`.
- Truncar com `min-w-0` + `truncate`.
- Dialogs `max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)]`.

## Acessibilidade

- `Label` com `htmlFor`/`id` associada a todo campo; erros com `role="alert"` referenciados por `aria-describedby`.
- Botões de ícone com `aria-label`; ícones decorativos com `aria-hidden="true"`; `<span className="sr-only">` para cabeçalhos de ação sem texto.
- Foco visível (`focus-visible:ring-2 focus-visible:ring-ring`) em controles customizados, incluindo linhas clicáveis e presets de tema.
- Status com texto/badge, não apenas cor (ex.: “Vencido”, “Atrasado”, “Concluída”).
- Navegação por teclado em tabelas (`button` na célula identificadora), abas (setas/Home/End) e listas com `aria-current`.
- Progresso com `role="progressbar"`/`aria-valuenow`; carregamento com `role="status"`; erros com `role="alert"`.
- Movimento respeita `prefers-reduced-motion` (`motion-safe`/`motion-reduce`).
- Contraste adequado nos temas claro/escuro (tokens OKLCH em `app/globals.css`).

## Desvios conhecidos

- Settings usa abas customizadas em vez de `Tabs`; agora possuem ARIA completa e navegação por setas/Home/End.
- Lembretes usam `Input type="date"` em vez de `Calendar`/`Popover`.
- Cores pontuais sem token semântico (`text-emerald-500`, `text-amber-500`, `text-green-600`, `bg-sky-100`) permanecem em alguns badges; criar tokens `--success`/`--warning` exige pedido explícito.
- `watch()` do React Hook Form gera warning `react-hooks/incompatible-library` (aceito; o React Compiler pula a memoização desses componentes).
