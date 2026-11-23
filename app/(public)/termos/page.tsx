import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Serviço | ManagerClientsRadio",
  description: "Termos de serviço do ManagerClientsRadio.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">ManagerClientsRadio</p>
          <h1 className="text-3xl font-bold tracking-tight">Termos de Serviço</h1>
          <p className="text-sm text-muted-foreground">Última atualização: 23 de novembro de 2026</p>
        </header>

        <section className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            Ao acessar ou usar o ManagerClientsRadio, você concorda com estes Termos de Serviço.
            Se não concordar, não utilize o sistema.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Uso do serviço</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            O sistema destina-se à gestão de clientes, contratos, contatos e rotinas operacionais.
            Você é responsável pelas informações inseridas e pelo uso adequado da conta.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Conta e segurança</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Mantenha suas credenciais confidenciais. Você é responsável por atividades realizadas
            com sua conta. Informe imediatamente qualquer uso não autorizado.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Integrações de terceiros</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Integrações como Google Calendar dependem de autorização do usuário e dos termos/políticas
            dos respectivos provedores. O funcionamento pode variar conforme disponibilidade desses
            serviços.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Disponibilidade e alterações</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            O serviço pode ser atualizado, modificado ou interrompido a qualquer momento. Podemos
            alterar estes termos, publicando a versão atualizada nesta página.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Limitação de responsabilidade</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            O serviço é fornecido “como está”, na medida permitida por lei. Não garantimos operação
            ininterrupta ou livre de erros.
          </p>
        </section>

        <footer className="pt-4 border-t flex gap-4 text-sm">
          <Link href="/privacidade" className="text-primary underline underline-offset-4">
            Política de Privacidade
          </Link>
          <Link href="/login" className="text-primary underline underline-offset-4">
            Voltar ao login
          </Link>
        </footer>
      </div>
    </main>
  );
}
