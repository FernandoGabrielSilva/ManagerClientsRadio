"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { z } from "zod";

type FormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  linkEmail,
  reason,
}: {
  linkEmail?: string;
  reason?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: linkEmail ?? "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const res = await signIn("credentials", { ...values, redirect: false });
    if (res?.error) {
      setError("Credenciais inválidas");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-2">
            <Radio className="h-6 w-6" />
          </div>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkEmail && reason === "google" && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              A conta <span className="font-medium">{linkEmail}</span> já existe com Google. Entre com Google para vincular e acessar a mesma conta.
            </div>
          )}
          {linkEmail && reason === "password" && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              A conta <span className="font-medium">{linkEmail}</span> já existe. Faça login com e-mail e senha; depois você pode conectar o Google em Configurações.
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" spellCheck={false} {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
          </div>
           <Button variant="outline" className="w-full" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
            Continuar com Google
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Não tem conta? <a href="/register" className="text-primary underline">Cadastre-se</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
