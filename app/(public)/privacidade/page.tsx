import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Raysse Manager",
  description: "Política de privacidade do Raysse Manager.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">Raysse Manager</p>
          <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">Última atualização: 23 de novembro de 2026</p>
        </header>

        <section className="space-y-3 text-sm leading-6">
          <p>
            Esta Política de Privacidade descreve como o Raysse Manager coleta, usa e protege
            informações ao utilizar o sistema.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Dados coletados</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Podemos coletar dados de conta (nome, e-mail, senha criptografada), dados operacionais
            inseridos no sistema (clientes, contratos, contatos e lembretes) e, quando autorizado,
            dados necessários para integração com o Google Calendar.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Uso das informações</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            As informações são usadas para autenticação, operação do sistema, organização de tarefas,
            notificações e sincronização de eventos com o Google Calendar quando você autoriza a
            integração.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Compartilhamento</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Não vendemos dados pessoais. O compartilhamento ocorre apenas com serviços necessários
            para o funcionamento do sistema, como infraestrutura de hospedagem, banco de dados e
            serviços do Google autorizados pelo usuário.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Segurança</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados. Nenhum
            método de transmissão ou armazenamento é totalmente seguro.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Seus direitos</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Você pode solicitar acesso, correção ou exclusão dos seus dados, conforme aplicável,
            entrando em contato com o responsável pelo sistema.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Contato</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Para dúvidas sobre privacidade, entre em contato pelo e-mail do administrador do sistema.
          </p>
        </section>

        <footer className="pt-4 border-t">
          <Link href="/login" className="text-sm text-primary underline underline-offset-4">
            Voltar ao login
          </Link>
        </footer>
      </div>
    </main>
  );
}
