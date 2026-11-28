<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Regras obrigatórias do projeto — ManagerClientsRadio

Estas regras valem para **todas** as implementações futuras. Não é necessário repeti-las a cada tarefa.

## Documentação de referência (consultar ANTES de implementar)

| Arquivo | Quando consultar |
|---|---|
| `docs/architecture.md` | Arquitetura, autenticação, camada de dados, funcionalidades compartilhadas. |
| `docs/design-system.md` | Cores, tipografia, espaçamentos, layout, responsividade, tokens. |
| `docs/component-patterns.md` | Formulários, tabelas, diálogos, filtros, toasts, import/export, loading. |
| `docs/feature-parity.md` | Funcionalidades por módulo e paridade entre abas/listas. |

Antes de criar ou alterar uma página/componente, leia os documentos relacionados e siga o padrão existente.

## 1. Design system obrigatório

- Preserve o padrão visual existente; **não invente um estilo novo por funcionalidade**.
- Use exclusivamente os tokens de `app/globals.css` (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--radius`, etc.). Não introduza cores, sombras ou espaçamentos fora do design system.
- Tipografia: Plus Jakarta Sans (`--font-jakarta`); tamanhos e pesos conforme páginas existentes.
- Ícones: `lucide-react` apenas.
- Componentes visuais compartilhados: `PageHeader`, `Card`, `Button`, `Table`, `Badge`, `Dialog`, `Select`, `Input`, `Popover`, `Sheet`, `DropdownMenu`, `Calendar`, `Tooltip`, `Toaster`.
- Páginas de referência visual:
  - Listas: `/clients`, `/contracts`, `/reminders`.
  - Detalhes: `/clients/[id]`, `/contracts/[id]`.
  - Cards/indicadores: `/dashboard`.
  - Formulários: `components/clients/client-form.tsx` e `components/contracts/contract-form.tsx`.
- Novas páginas devem reutilizar a estrutura de `PageHeader` + conteúdo em `space-y-4/6` + grids responsivos.

## 2. shadcn/ui obrigatório

O projeto usa shadcn/ui como biblioteca padrão. Regra permanente:

- **Exclusões com confirmação:** `AlertDialog`.
- **Formulários em janelas modais:** `Dialog`.
- **Menus de ações:** `DropdownMenu`.
- **Notificações:** sistema de toast existente (`toast.add(...)` + `Toaster`).
- **Campos:** componentes de formulário existentes (`Input`, `Label`, `Textarea`, `Select`, `Checkbox`, `Switch`).
- **Tabelas:** reutilizar o padrão de tabela existente (`Table` + padrão de lista).
- **Botões:** `Button` do projeto, com as variantes existentes.
- **Seletores, calendários, tooltips e demais elementos:** componentes shadcn/ui já existentes.

Proibido:
- `window.alert()` e `window.confirm()`.
- Implementar componente próprio quando já existir solução shadcn/ui adequada.
- Instalar componentes duplicados ou bibliotecas de UI concorrentes.
- Modificar os componentes-base de `components/ui/` sem necessidade justificada.

## 3. Paridade entre abas/módulos

- Consulte `docs/feature-parity.md` antes de criar ou alterar listas/módulos.
- Compare funcionalidades com Clientes, Contratos e Lembretes.
- Reutilize a mesma estrutura e os mesmos componentes (busca, filtros, ordenação, paginação, seleção em massa, ações em massa, abas de visão, confirmação, estado vazio).
- Não deixe um módulo sem recurso já existente em outro sem justificativa funcional registrada em `docs/feature-parity.md`.

## 4. Reutilização obrigatória

Antes de desenvolver:

1. Pesquise componentes em `components/` (incluindo `components/ui/`).
2. Pesquise hooks e utilitários em `hooks/` e `lib/`.
3. Pesquise server actions em `app/actions/`.
4. Pesquise regras de negócio e validações em `lib/validators.ts` e no `prisma/schema.prisma`.
5. Verifique se já existe implementação compartilhada (tabela, diálogo, import/export, jobs, notificações, eventos, Google Calendar).

Não crie sistemas independentes para funcionalidades que deveriam ser globais. Se precisar generalizar algo, faça de forma compartilhada e atualize a documentação.

## 5. Padrões obrigatórios para novas funcionalidades

Toda nova implementação deve seguir automaticamente:

- Design system existente e tokens.
- Componentes shadcn/ui.
- Formulários: React Hook Form + Zod (`lib/validators.ts`), erros via `toast` ou `text-destructive`.
- Tabelas: padrão de busca + filtros + `SortFilter` + paginação + seleção + ações em massa.
- Filtros e pesquisa conforme `docs/component-patterns.md`.
- Confirmações destrutivas via `AlertDialog`.
- Carregamento: botões com estado de envio e `BackgroundJobStatus` para jobs.
- Notificações: toast existente.
- Responsividade: grids `sm/md/lg`, tabelas com scroll horizontal, botões `w-full sm:w-auto`.
- Acessibilidade: `Label` associado, `aria-label` em botões de ícone, navegação por teclado.

## 6. Manutenção da documentação

- Ao criar um novo padrão reutilizável, atualize o documento correspondente em `docs/`.
- Ao adicionar/remover funcionalidade de um módulo, atualize `docs/feature-parity.md`.
- Não altere padrões existentes por iniciativa própria. Se a mudança for necessária, apresente a proposta e peça confirmação.

## 7. Checklist rápido antes de finalizar

- [ ] Consultei `docs/architecture.md`, `docs/design-system.md`, `docs/component-patterns.md` e `docs/feature-parity.md`.
- [ ] Reutilizei componentes/hooks/actions existentes.
- [ ] Usei shadcn/ui (sem `window.alert`/`window.confirm`).
- [ ] Mantive o design system e a responsividade.
- [ ] Garanti paridade com módulos equivalentes.
- [ ] Atualizei a documentação se criei um novo padrão.

<!-- project-rules -->
# AGENTS.md — ManagerClientsRadio

> Arquivo gerado automaticamente pelo bootstrap do OpenCode.
> O marcador `<!-- project-rules -->` indica que as regras já foram aplicadas. Não remova.
> Leia este arquivo e os documentos de `docs/` antes de qualquer implementação.

## 1. Visão geral

- **Projeto:** ManagerClientsRadio
- **Stack detectada:** TypeScript + Next.js, React, React DOM, Tailwind CSS
- **Tipo:** Frontend web
- **Linguagem principal:** TypeScript
- **Gerenciador de pacotes:** pnpm
- **Interface:** Web
- **Banco de dados:** Prisma
- **Testes:** Não detectado

## 2. Comandos do projeto

| Ação | Comando |
|---|---|
| Instalar dependências | `pnpm install` |
| Desenvolvimento | `pnpm run dev` |
| Build | `pnpm run build` |
| Lint | `pnpm run lint` |

> Se algum comando estiver incorreto, corrija esta tabela e `docs/conventions.md`.

## 3. Regras gerais obrigatórias

- Leia `AGENTS.md` e `docs/architecture.md` antes de implementar.
- Reutilize código, utilitários, serviços, componentes e padrões existentes antes de criar novos.
- Siga o formatador, linter, type checker e test runner já configurados no projeto.
- Não adicione dependências, bibliotecas ou padrões arquiteturais sem necessidade comprovada.
- Trate erros explicitamente; não engula exceções.
- Valide entradas em boundaries (API, CLI, formulários, arquivos, filas).
- Nunca commite secrets, tokens, chaves ou dados sensíveis.
- Adicione ou atualize testes para comportamentos novos ou alterados.
- Mantenha logs úteis, sem dados sensíveis.
- Quando estabelecer um padrão reutilizável, atualize `docs/`.
- Não altere padrões existentes por iniciativa própria; mudanças exigem pedido explícito.

## 4. Convenções da stack

- Use TypeScript estrito; evite `any` sem justificativa.
- Prefira tipos explícitos em APIs públicas e boundaries.
- Trate erros como `unknown` e faça narrowing; não use `catch (e: any)`.
- Use o formatador/linter configurado (ESLint, Prettier, Biome).
- Prefira módulos ES e funções pequenas.
- Use o linter/formatter configurado no projeto.
- Trate erros explicitamente; não engula promises rejeitadas.
- Evite estado global mutável e efeitos colaterais escondidos.
- App Router: Server Components por padrão; use `"use client"` só quando necessário.
- Mutações via Server Actions ou Route Handlers; valide a entrada.
- Use `revalidatePath`/`revalidateTag` após mutações.
- Não acesse segredos em componentes client.
- Prefira componentes funcionais e hooks.
- Evite estado derivado; calcule durante o render.
- Use keys estáveis em listas.
- Mantenha efeitos colaterais em `useEffect` com dependências corretas.

## 5. Regras de interface

### Design system
- Leia `docs/design-system.md` antes de criar qualquer tela.
- Reutilize tokens, cores, tipografia, espaçamentos, raios, sombras, ícones e layouts existentes.
- Não invente um estilo novo por funcionalidade.
- Preserve o padrão das páginas de referência do projeto.

### Componentes
- Use a biblioteca padrão do projeto (shadcn/ui quando aplicável).
- `AlertDialog` para confirmações destrutivas; `Dialog` para formulários; `DropdownMenu` para ações; toast existente para notificações.
- Nunca use `window.alert`, `window.confirm` ou `window.prompt`.
- Não instale componentes duplicados nem altere componentes-base sem necessidade.

### Paridade
- Módulos/abas semelhantes devem ter os mesmos recursos (busca, filtros, ordenação, paginação, seleção, ações em massa, import/export, estados vazios, confirmações).
- Diferenças exigem justificativa em `docs/feature-parity.md`.

### Novas funcionalidades
- Siga automaticamente: design system, componentes padrão, formulários, tabelas, filtros, confirmações, loading, notificações, responsividade e acessibilidade.
- Use React Hook Form + Zod quando o projeto usar esse padrão.

## 6. Documentação do projeto

| Documento | Quando consultar |
|---|---|
| `docs/architecture.md` | Arquitetura, camadas, fluxo de dados e funcionalidades compartilhadas. |
| `docs/conventions.md` | Convenções da linguagem, framework, formatação, lint, testes e erros. |
| `docs/testing.md` | Estratégia e convenções de testes. |
| `docs/design-system.md` | Tokens, tipografia, cores, espaçamento, layout e páginas de referência. |
| `docs/component-patterns.md` | Tabelas, formulários, diálogos, notificações, loading e estados vazios. |
| `docs/feature-parity.md` | Funcionalidades por módulo/aba e diferenças intencionais. |

## 7. Checklist antes de concluir

- [ ] Li `AGENTS.md` e os documentos relevantes de `docs/`.
- [ ] Reutilizei código, componentes, serviços e padrões existentes.
- [ ] Segui as convenções da linguagem/framework e o formatador/linter.
- [ ] Adicionei/atualizei testes para o comportamento alterado.
- [ ] Tratei erros, bordas e entradas inválidas.
- [ ] Atualizei a documentação se criei um padrão reutilizável.
- [ ] Verifiquei que não adicionei secrets ou dados sensíveis.
- [ ] (UI) Verifiquei responsividade, acessibilidade, loading, vazio e erro.
