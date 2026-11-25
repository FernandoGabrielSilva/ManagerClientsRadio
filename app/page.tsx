import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-4xl px-6 py-16 space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Raysse Manager</h1>
          <p className="text-lg text-muted-foreground">
            Sistema de gestão de clientes, contratos e lembretes para agências de
            marketing e rádio. Organize sua carteira de clientes, acompanhe
            vencimentos de contratos e mantenha o calendário de contatos e vídeos
            sempre em dia.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Cadastro e acompanhamento de clientes, frequência de contato e
              histórico.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contratos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Controle de contratos, valores, vigência e vencimentos.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Agenda</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Calendário de contatos, vídeos e compromissos com integração ao
              Google Agenda.
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3">
          <Link href="/login" className={buttonVariants()}>Entrar</Link>
          <Link href="/register" className={buttonVariants({ variant: "outline" })}>Criar conta</Link>
        </div>

        <footer className="pt-8 text-sm text-muted-foreground space-x-4">
          <Link href="/privacidade" className="underline">
            Política de privacidade
          </Link>
          <Link href="/termos" className="underline">
            Termos de uso
          </Link>
        </footer>
      </section>
    </main>
  );
}