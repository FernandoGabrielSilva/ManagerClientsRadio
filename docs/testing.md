# Testes — ManagerClientsRadio

## Comando

```bash
não definido
```

## Estratégia

- **Unitários:** funções, regras de negócio e transformações puras.
- **Integração:** banco, filas, APIs internas e serviços.
- **E2E:** fluxos críticos do usuário, quando aplicável.

## Convenções

- Nomeie testes pelo comportamento esperado.
- Um teste deve falhar por um motivo claro.
- Use fixtures/factories para dados de teste.
- Não dependa de serviços externos sem mock, stub ou container.
- Testes devem ser determinísticos e independentes da ordem.
- Cubra caminhos de erro e bordas, não apenas o caminho feliz.

## Cobertura

> Defina a meta de cobertura e o que não precisa ser coberto.
