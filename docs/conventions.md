# Convenções — ManagerClientsRadio

## Linguagem e framework

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

## Gerenciador de pacotes

pnpm

## Formatação e lint

> Use o formatador e o linter já configurados no projeto. Não introduza outro sem justificativa.

## Testes

- Framework: Não detectado
- Comando: `não definido`

## Tratamento de erros

> Descreva o padrão do projeto: tipos de erro, mensagens, logs e o que é exposto ao usuário.

## Nomenclatura e organização

> Descreva o padrão de nomes de arquivos, pastas, funções, classes, testes e commits.

## Dependências

> Regras para adicionar, atualizar ou remover dependências.
