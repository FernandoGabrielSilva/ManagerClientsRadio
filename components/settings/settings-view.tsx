"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Palette,
  Plug,
  Bell,
  Users as UsersIcon,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { THEME_PRESETS } from "@/lib/color-utils";

import { applyThemeColor } from "@/lib/color-utils";
import {
  updateProfileAction,
  changePasswordAction,
  updateThemeAction,
  updateNotificationPrefsAction,
  disconnectGoogleAction,
  updateUserRoleAction,
} from "@/app/actions/settings";
import {
  startDeleteSyncedGoogleEventsJobAction,
  startSyncGoogleIntegrationJobAction,
} from "@/app/actions/background-jobs";
import { BackgroundJobStatus } from "@/components/settings/background-job-status";

export function SettingsView({
  user,
  users,
  notifications = [],
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    themeColor: string;
    themeMode: string;
    googleCalendarConnected: boolean;
    notificationsEnabled: boolean;
    autoCreateEvents: boolean;
    defaultContactFrequency: number;
    googleCalendarId: string | null;
    role?: string;
    hasPassword: boolean;
  };
  users?: { id: string; name: string | null; email: string; role: string }[];
  notifications?: { id: string; title: string; message: string; read: boolean; createdAt: Date | string }[];
}) {
  const router = useRouter();
  const [color, setColor] = useState(user.themeColor);
  const [notificationsEnabled, setNotificationsEnabled] = useState(user.notificationsEnabled);
  const [autoCreateEvents, setAutoCreateEvents] = useState(user.autoCreateEvents);
  const [mode, setMode] = useState<"light" | "dark" | "system">(
    user.themeMode === "system" ? "system" : user.themeMode === "dark" ? "dark" : "light",
  );
  const [tab, setTab] = useState("profile");
  const [browserEnabled, setBrowserEnabled] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBrowserEnabled(localStorage.getItem("browserNotifEnabled") !== "false");
    }
  }, []);
  const [confirmDeleteGoogle, setConfirmDeleteGoogle] = useState(false);
  const [confirmSyncGoogle, setConfirmSyncGoogle] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobTitle, setActiveJobTitle] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await updateProfileAction({
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      image: (fd.get("image") as string) || null,
    });
    if (res?.error) toast.add({ title: "Erro", description: res.error });
    else {
      toast.add({ title: "Perfil atualizado" });
      router.refresh();
    }
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await changePasswordAction({
      currentPassword: fd.get("current") as string,
      newPassword: fd.get("new") as string,
    });
    if (res?.error) toast.add({ title: "Erro", description: res.error });
    else toast.add({ title: "Senha alterada" });
  }

  async function saveTheme() {
    await updateThemeAction({ themeColor: color, themeMode: mode });
    const preset = THEME_PRESETS.find((p) => p.color === color);
    document.documentElement.classList.forEach((c) => {
      if (c.startsWith("theme-")) document.documentElement.classList.remove(c);
    });
    if (preset) {
      const cls =
        preset.name === "Padrão"
          ? "theme-default"
          : "theme-" + preset.name.toLowerCase().replace(/[^a-z]/g, "");
      document.documentElement.classList.add(cls);
    } else {
      applyThemeColor(color);
    }
    if (mode === "system") {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } else if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("themeColor", color);
    localStorage.setItem("themeMode", mode);
    router.refresh();
    toast.add({ title: "Tema salvo" });
  }

  async function saveNotifs(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await updateNotificationPrefsAction({
      notificationsEnabled: fd.get("notificationsEnabled") === "on",
      autoCreateEvents: fd.get("autoCreateEvents") === "on",
      defaultContactFrequency: Number(fd.get("freq") || 14),
      googleCalendarId: (fd.get("calId") as string) || null,
    });
    toast.add({ title: "Preferências salvas" });
  }

  async function saveGooglePrefs(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await updateNotificationPrefsAction({
      autoCreateEvents: fd.get("autoCreateEvents") === "on",
      googleCalendarId: (fd.get("calId") as string) || null,
    });
    toast.add({ title: "Integração salva" });
    router.refresh();
  }

  async function enableBrowserNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.add({ title: "Navegador não suporta notificações" });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.setItem("browserNotifEnabled", "true");
      setBrowserEnabled(true);
      new Notification("Raysse Manager", { body: "Notificações do navegador ativadas." });
      toast.add({ title: "Notificações ativadas" });
    } else {
      toast.add({ title: "Permissão negada" });
    }
  }

  function disableBrowserNotifications() {
    localStorage.setItem("browserNotifEnabled", "false");
    setBrowserEnabled(false);
    toast.add({ title: "Notificações do navegador desativadas" });
  }

  async function testBrowserNotification() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.add({ title: "Navegador não suporta notificações" });
      return;
    }
    if (Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.add({ title: "Permissão negada" });
        return;
      }
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification("Raysse Manager - Teste", { body: "Esta é uma notificação de teste." }))
        .catch(() => new Notification("Raysse Manager - Teste", { body: "Esta é uma notificação de teste." }));
    } else {
      new Notification("Raysse Manager - Teste", { body: "Esta é uma notificação de teste." });
    }
    toast.add({ title: "Notificação de teste enviada" });
  }

  async function startDeleteSyncedGoogleEvents(closeDialog = false) {
    if (activeJobId) { if (closeDialog) setConfirmDeleteGoogle(false); return; }
    const res = await startDeleteSyncedGoogleEventsJobAction();
    setActiveJobId(res.jobId);
    setActiveJobTitle("Apagar eventos do site no Google");
    if (closeDialog) setConfirmDeleteGoogle(false);
    toast.add({ title: "Remoção iniciada", description: "Acompanhe o progresso abaixo." });
  }

  async function startSyncGoogle(closeDialog = false) {
    if (activeJobId) { if (closeDialog) setConfirmSyncGoogle(false); return; }
    const res = await startSyncGoogleIntegrationJobAction();
    setActiveJobId(res.jobId);
    setActiveJobTitle("Sincronizar Google Agenda");
    if (closeDialog) setConfirmSyncGoogle(false);
    toast.add({ title: "Sincronização iniciada", description: "Acompanhe o progresso abaixo." });
  }

  const tabs = [
    { key: "profile", label: "Perfil", icon: User },
    { key: "password", label: "Senha", icon: Lock },
    { key: "theme", label: "Tema", icon: Palette },
    { key: "integrations", label: "Integrações", icon: Plug },
    { key: "notifications", label: "Notificações", icon: Bell },
    ...(user.role === "admin"
      ? [{ key: "users", label: "Usuários", icon: UsersIcon }]
      : []),
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seu perfil, tema e integrações.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <aside className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all text-left whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-primary/10 text-primary font-medium shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </aside>

        <div className="flex-1 min-w-0 bg-card p-4 sm:p-6 lg:p-8 rounded-xl border border-border">
          {tab === "profile" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Editar perfil</h2>
              <form
                onSubmit={saveProfile}
                className="flex flex-col gap-4 max-w-xl"
              >
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    name="name"
                    defaultValue={user.name ?? ""}
                    className="w-full bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    className="w-full bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Foto (URL)</Label>
                  <Input
                    name="image"
                    defaultValue={user.image ?? ""}
                    className="w-full bg-background border-input"
                  />
                </div>
                <div>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </div>
          )}

          {tab === "password" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{user.hasPassword ? "Trocar senha" : "Definir senha"}</h2>
              {!user.hasPassword && (
                <p className="text-sm text-muted-foreground max-w-md">
                  Sua conta foi criada com Google. Defina uma senha para também entrar com e-mail e senha.
                </p>
              )}
              <form
                onSubmit={savePassword}
                className="flex flex-col gap-4 max-w-md"
              >
                {user.hasPassword && (
                  <div className="space-y-2">
                    <Label>Senha atual</Label>
                    <Input
                      name="current"
                      type="password"
                      className="w-full bg-background border-input"
                    />
                  </div>
                )}
                {!user.hasPassword && <input type="hidden" name="current" value="" />}
                <div className="space-y-2">
                  <Label>Nova senha</Label>
                  <Input
                    name="new"
                    type="password"
                    className="w-full bg-background border-input"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
              <p className="text-xs text-muted-foreground max-w-md">
                Com &quot;Criar eventos automaticamente&quot; ativo, novos eventos do site são criados no Google Agenda e remoções no site também removem no Google.
              </p>
            </div>
          )}

          {tab === "theme" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Tema</h2>
              <div className="space-y-6 max-w-xl">
                <div>
                  <Label className="mb-2 block">Presets</Label>
                  <div className="flex flex-wrap gap-3">
                    {THEME_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => {
                          setColor(p.color);
                          applyThemeColor(p.color);
                        }}
                        className="flex flex-col items-center gap-1"
                      >
                        <span
                          className="h-8 w-8 rounded-full border"
                          style={{ background: p.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor customizada</Label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      document.documentElement.classList.forEach((c) => {
                        if (c.startsWith("theme-"))
                          document.documentElement.classList.remove(c);
                      });
                      applyThemeColor(e.target.value);
                    }}
                    className="h-10 w-20 rounded border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modo</Label>
                  <Select
                    value={mode}
                    onValueChange={(v: string | null) =>
                      setMode(v === "system" ? "system" : v === "dark" ? "dark" : "light")
                    }
                  >
                    <SelectTrigger className="w-40 bg-background border-input">
                      <SelectValue>{(v: any) => v === "system" ? "Sistema (automático)" : v === "dark" ? "Escuro" : "Claro"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">Sistema (automático)</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveTheme}>Salvar tema</Button>
              </div>
            </div>
          )}

          {tab === "integrations" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Google Calendar</h2>
              <div className="space-y-3 max-w-xl">
                <p className="text-sm">
                  Status:{" "}
                  {user.googleCalendarConnected ? "Conectado" : "Desconectado"}
                </p>
                {!user.googleCalendarConnected ? (
                  <Button
                    onClick={() =>
                      (window.location.href =
                        "/api/auth/signin/google?callbackUrl=/settings")
                    }
                  >
                    Conectar Google
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => setConfirmSyncGoogle(true)} disabled={!!activeJobId}>
                        Sincronizar agora
                      </Button>
                      <Button variant="destructive" onClick={() => setConfirmDeleteGoogle(true)} disabled={!!activeJobId}>
                        Apagar eventos do site no Google
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          await disconnectGoogleAction();
                          router.refresh();
                        }}
                      >
                        Desconectar
                      </Button>
                    </div>
                    {activeJobId && (
                      <BackgroundJobStatus
                        jobId={activeJobId}
                        onDone={(job) => {
                          toast.add({
                            title: job.status === "completed" ? "Tarefa concluída" : "Tarefa finalizada",
                            description: job.message ?? job.title,
                          });
                          setActiveJobId(null);
                          router.refresh();
                        }}
                      />
                    )}
                  </div>
                )}
                <form onSubmit={saveGooglePrefs} className="flex flex-col gap-4 max-w-md pt-4">
                  <div className="flex items-center justify-between">
                    <Label>Criar eventos automaticamente</Label>
                    <Switch
                      name="autoCreateEvents"
                      checked={autoCreateEvents}
                      onCheckedChange={setAutoCreateEvents}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Google Calendar ID</Label>
                    <Input
                      name="calId"
                      defaultValue={user.googleCalendarId ?? "primary"}
                      className="w-full bg-background border-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use <code>primary</code> para o calendário principal da conta Google conectada.
                    </p>
                  </div>
                  <div>
                    <Button type="submit">Salvar integração</Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Preferências de notificação
              </h2>
              <form
                onSubmit={saveNotifs}
                className="flex flex-col gap-4 max-w-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <Label>Notificações ativadas</Label>
                  <Switch
                    name="notificationsEnabled"
                    checked={notificationsEnabled}
                    onCheckedChange={(v) => {
                      setNotificationsEnabled(v);
                      if (v) enableBrowserNotifications();
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label>Notificações do navegador</Label>
                  <Switch
                    checked={browserEnabled}
                    onCheckedChange={(v) => {
                      if (v) enableBrowserNotifications();
                      else disableBrowserNotifications();
                    }}
                  />
                </div>
                <div>
                  <Button type="button" variant="outline" onClick={testBrowserNotification}>
                    Testar notificação
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Frequência padrão de contato (dias)</Label>
                  <Input
                    name="freq"
                    type="number"
                    defaultValue={user.defaultContactFrequency}
                    className="w-full bg-background border-input"
                  />
                </div>
                <div>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </div>
          )}

          {tab === "users" && user.role === "admin" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Usuários e permissões</h2>
              <div className="space-y-2 max-w-2xl">
                {(users ?? []).map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border rounded-md p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {u.name ?? u.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </div>
                    </div>
                    <Select
                      defaultValue={u.role}
                      onValueChange={(v: string | null) =>
                        updateUserRoleAction(
                          u.id,
                          (v ?? "vendor") as "admin" | "vendor",
                        ).then(() => router.refresh())
                      }
                    >
                      <SelectTrigger className="w-full sm:w-32 bg-background border-input">
                        <SelectValue>{(v: any) => v === "admin" ? "Admin" : "Vendedor"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="vendor">Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>



      <Dialog open={confirmDeleteGoogle} onOpenChange={setConfirmDeleteGoogle}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apagar eventos do site no Google Agenda</DialogTitle>
            <DialogDescription>
              Serão removidos apenas os eventos criados pelo site (que possuem vínculo no banco). Eventos já existentes no Google Agenda não serão afetados. Os eventos locais serão mantidos.
            </DialogDescription>
          </DialogHeader>
          {activeJobId && activeJobTitle === "Apagar eventos do site no Google" && <BackgroundJobStatus jobId={activeJobId} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteGoogle(false)}>Fechar</Button>
            <Button variant="outline" onClick={() => startDeleteSyncedGoogleEvents(true)} disabled={!!activeJobId}>Executar em segundo plano</Button>
            <Button variant="destructive" onClick={() => startDeleteSyncedGoogleEvents(false)} disabled={!!activeJobId}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmSyncGoogle} onOpenChange={setConfirmSyncGoogle}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sincronizar Google Agenda</DialogTitle>
            <DialogDescription>
              Remove do Google apenas eventos vinculados ao site e, se a criação automática estiver ativa, recria os eventos locais. Nada fora dos vínculos do site é apagado.
            </DialogDescription>
          </DialogHeader>
          {activeJobId && activeJobTitle === "Sincronizar Google Agenda" && <BackgroundJobStatus jobId={activeJobId} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSyncGoogle(false)}>Fechar</Button>
            <Button variant="outline" onClick={() => startSyncGoogle(true)} disabled={!!activeJobId}>Executar em segundo plano</Button>
            <Button onClick={() => startSyncGoogle(false)} disabled={!!activeJobId}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
