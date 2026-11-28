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
  getBackgroundJobsAction,
  startDeleteSyncedGoogleEventsJobAction,
  startSyncGoogleIntegrationJobAction,
  updateAutoClearJobsAction,
} from "@/app/actions/background-jobs";
import { BackgroundJobStatus } from "@/components/settings/background-job-status";

export function SettingsView({
  user,
  users,
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
    autoClearCompletedJobs: boolean;
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
      queueMicrotask(() => {
        setBrowserEnabled(localStorage.getItem("browserNotifEnabled") !== "false");
      });
    }
  }, []);
  const [confirmDeleteGoogle, setConfirmDeleteGoogle] = useState(false);
  const [confirmSyncGoogle, setConfirmSyncGoogle] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobTitle, setActiveJobTitle] = useState<string | null>(null);
  const [autoClearCompletedJobs, setAutoClearCompletedJobs] = useState(user.autoClearCompletedJobs);
  const [busy, setBusy] = useState<string | null>(null);

  function errorMessage(error: unknown, fallback = "Erro inesperado.") {
    return error instanceof Error ? error.message : fallback;
  }

  useEffect(() => {
    getBackgroundJobsAction().then((jobs) => {
      const running = jobs.find((j) => j.status === "pending" || j.status === "running");
      if (running) { setActiveJobId(running.id); setActiveJobTitle(running.title); }
    }).catch(() => {
      toast.add({ title: "Erro", description: "Não foi possível carregar as tarefas em segundo plano." });
    });
  }, []);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("profile");
    try {
      const fd = new FormData(e.currentTarget);
      const res = await updateProfileAction({
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        image: String(fd.get("image") ?? "") || null,
      });
      if (res?.error) toast.add({ title: "Erro", description: res.error });
      else {
        toast.add({ title: "Perfil atualizado" });
        router.refresh();
      }
    } catch (error) {
      toast.add({ title: "Erro", description: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy("password");
    try {
      const fd = new FormData(form);
      const res = await changePasswordAction({
        currentPassword: String(fd.get("current") ?? ""),
        newPassword: String(fd.get("new") ?? ""),
      });
      if (res?.error) toast.add({ title: "Erro", description: res.error });
      else {
        toast.add({ title: "Senha alterada" });
        form.reset();
      }
    } catch (error) {
      toast.add({ title: "Erro", description: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function saveTheme() {
    setBusy("theme");
    try {
      const res = await updateThemeAction({ themeColor: color, themeMode: mode });
      if (res?.error) throw new Error(res.error);
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
    } catch (error) {
      toast.add({ title: "Erro", description: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function saveNotifs(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("notifications");
    try {
      const fd = new FormData(e.currentTarget);
      const res = await updateNotificationPrefsAction({
        notificationsEnabled: fd.get("notificationsEnabled") === "on",
        autoCreateEvents: fd.get("autoCreateEvents") === "on",
        defaultContactFrequency: Number(fd.get("freq") || 14),
        googleCalendarId: String(fd.get("calId") ?? "") || null,
      });
      if (!res?.success) toast.add({ title: "Erro", description: "Não foi possível salvar as preferências." });
      else {
        toast.add({ title: "Preferências salvas" });
        router.refresh();
      }
    } catch (error) {
      toast.add({ title: "Erro", description: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function saveGooglePrefs(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("google");
    try {
      const fd = new FormData(e.currentTarget);
      const res = await updateNotificationPrefsAction({
        autoCreateEvents: fd.get("autoCreateEvents") === "on",
        googleCalendarId: String(fd.get("calId") ?? "") || null,
      });
      if (!res?.success) toast.add({ title: "Erro", description: "Não foi possível salvar a integração." });
      else {
        toast.add({ title: "Integração salva" });
        router.refresh();
      }
    } catch (error) {
      toast.add({ title: "Erro", description: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function enableBrowserNotifications(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.add({ title: "Navegador não suporta notificações" });
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        localStorage.setItem("browserNotifEnabled", "true");
        setBrowserEnabled(true);
        new Notification("Raysse Manager", { body: "Notificações do navegador ativadas." });
        toast.add({ title: "Notificações ativadas" });
        return true;
      }
      toast.add({ title: "Permissão negada" });
      return false;
    } catch {
      toast.add({ title: "Erro", description: "Não foi possível ativar as notificações do navegador." });
      return false;
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
    setBusy("test-notification");
    try {
      if (Notification.permission !== "granted") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast.add({ title: "Permissão negada" });
          return;
        }
      }
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("Raysse Manager - Teste", { body: "Esta é uma notificação de teste." });
        } catch {
          new Notification("Raysse Manager - Teste", { body: "Esta é uma notificação de teste." });
        }
      } else {
        new Notification("Raysse Manager - Teste", { body: "Esta é uma notificação de teste." });
      }
      toast.add({ title: "Notificação de teste enviada" });
    } catch {
      toast.add({ title: "Erro", description: "Não foi possível enviar a notificação de teste." });
    } finally {
      setBusy(null);
    }
  }

  async function startDeleteSyncedGoogleEvents(closeDialog = false) {
    if (activeJobId) { if (closeDialog) setConfirmDeleteGoogle(false); return; }
    setBusy("delete-google-events");
    try {
      const res = await startDeleteSyncedGoogleEventsJobAction();
      setActiveJobId(res.jobId);
      setActiveJobTitle("Apagar eventos do site no Google");
      if (closeDialog) setConfirmDeleteGoogle(false);
      toast.add({ title: "Remoção iniciada", description: "Acompanhe o progresso abaixo." });
    } catch (error) {
      toast.add({ title: "Erro", description: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function startSyncGoogle(closeDialog = false) {
    if (activeJobId) { if (closeDialog) setConfirmSyncGoogle(false); return; }
    setBusy("sync-google");
    try {
      const res = await startSyncGoogleIntegrationJobAction();
      setActiveJobId(res.jobId);
      setActiveJobTitle("Sincronizar Google Agenda");
      if (closeDialog) setConfirmSyncGoogle(false);
      toast.add({ title: "Sincronização iniciada", description: "Acompanhe o progresso abaixo." });
    } catch (error) {
      toast.add({ title: "Erro", description: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function disconnectGoogle() {
    setBusy("disconnect-google");
    try {
      const res = await disconnectGoogleAction();
      if (!res?.success) {
        toast.add({ title: "Erro", description: "Não foi possível desconectar o Google." });
      } else {
        toast.add({ title: "Google desconectado" });
        router.refresh();
      }
    } catch (error) {
      toast.add({ title: "Erro", description: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function changeUserRole(id: string, role: "admin" | "vendor") {
    setBusy(`role-${id}`);
    try {
      const res = await updateUserRoleAction(id, role);
      if (!res?.success) {
        toast.add({ title: "Erro", description: "Não foi possível atualizar a permissão." });
      } else {
        toast.add({ title: "Permissão atualizada" });
        router.refresh();
      }
    } catch (error) {
      toast.add({ title: "Erro", description: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  const tabs = [
    { key: "profile", label: "Perfil", icon: User },
    { key: "password", label: "Senha", icon: Lock },
    { key: "theme", label: "Tema", icon: Palette },
    { key: "integrations", label: "Integrações", icon: Plug },
    { key: "notifications", label: "Notificações", icon: Bell },
    { key: "jobs", label: "Tarefas", icon: Loader2 },
    ...(user.role === "admin"
      ? [{ key: "users", label: "Usuários", icon: UsersIcon }]
      : []),
  ];

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    const next = tabs[nextIndex];
    setTab(next.key);
    document.getElementById(`settings-tab-${next.key}`)?.focus();
  }

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
        <nav aria-label="Seções de configurações" role="tablist" className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0">
          {tabs.map((t, index) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                id={`settings-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="settings-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.key)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "bg-primary/10 text-primary font-medium shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {t.label}
              </button>
            );
          })}
        </nav>

        <div
          id="settings-panel"
          role="tabpanel"
          aria-labelledby={`settings-tab-${tab}`}
          tabIndex={0}
          className="flex-1 min-w-0 bg-card p-4 sm:p-6 lg:p-8 rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tab === "profile" && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Editar perfil</h2>
              <form
                onSubmit={saveProfile}
                className="flex flex-col gap-4 max-w-xl"
              >
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Nome</Label>
                  <Input
                    id="profile-name"
                    name="name"
                    defaultValue={user.name ?? ""}
                    className="w-full bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={user.email}
                    className="w-full bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-image">Foto (URL)</Label>
                  <Input
                    id="profile-image"
                    name="image"
                    type="url"
                    defaultValue={user.image ?? ""}
                    className="w-full bg-background border-input"
                  />
                </div>
                <div>
                  <Button type="submit" disabled={busy === "profile"}>
                    {busy === "profile" ? "Salvando..." : "Salvar"}
                  </Button>
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
                    <Label htmlFor="password-current">Senha atual</Label>
                    <Input
                      id="password-current"
                      name="current"
                      type="password"
                      autoComplete="current-password"
                      className="w-full bg-background border-input"
                    />
                  </div>
                )}
                {!user.hasPassword && <input type="hidden" name="current" value="" />}
                <div className="space-y-2">
                  <Label htmlFor="password-new">Nova senha</Label>
                  <Input
                    id="password-new"
                    name="new"
                    type="password"
                    autoComplete="new-password"
                    className="w-full bg-background border-input"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy === "password"}>
                    {busy === "password" ? "Salvando..." : "Salvar"}
                  </Button>
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
                  <Label id="theme-presets-label" className="mb-2 block">Presets</Label>
                  <div className="flex flex-wrap gap-3" role="group" aria-labelledby="theme-presets-label">
                    {THEME_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        aria-pressed={color === p.color}
                        onClick={() => {
                          setColor(p.color);
                          applyThemeColor(p.color);
                        }}
                        className="flex flex-col items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          className="h-8 w-8 rounded-full border"
                          style={{ background: p.color }}
                          aria-hidden="true"
                        />
                        <span className="text-xs text-muted-foreground">
                          {p.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme-custom-color">Cor customizada</Label>
                  <input
                    id="theme-custom-color"
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
                  <Label htmlFor="theme-mode">Modo</Label>
                  <Select
                    value={mode}
                    onValueChange={(v: string | null) =>
                      setMode(v === "system" ? "system" : v === "dark" ? "dark" : "light")
                    }
                  >
                    <SelectTrigger id="theme-mode" className="w-40 bg-background border-input">
                      <SelectValue placeholder="Claro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">Sistema (automático)</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveTheme} disabled={busy === "theme"}>
                  {busy === "theme" ? "Salvando..." : "Salvar tema"}
                </Button>
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
                  <Button onClick={() => router.push("/api/auth/signin/google?callbackUrl=/settings")}>
                    Conectar Google
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => setConfirmSyncGoogle(true)} disabled={!!activeJobId || busy === "sync-google"}>
                        Sincronizar agora
                      </Button>
                      <Button variant="destructive" onClick={() => setConfirmDeleteGoogle(true)} disabled={!!activeJobId || busy === "delete-google-events"}>
                        Apagar eventos do site no Google
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={disconnectGoogle}
                        disabled={busy === "disconnect-google"}
                      >
                        {busy === "disconnect-google" ? "Desconectando..." : "Desconectar"}
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
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="integrations-auto-create">Criar eventos automaticamente</Label>
                    <Switch
                      id="integrations-auto-create"
                      name="autoCreateEvents"
                      checked={autoCreateEvents}
                      onCheckedChange={setAutoCreateEvents}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="integrations-calendar-id">Google Calendar ID</Label>
                    <Input
                      id="integrations-calendar-id"
                      name="calId"
                      defaultValue={user.googleCalendarId ?? "primary"}
                      className="w-full bg-background border-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use <code>primary</code> para o calendário principal da conta Google conectada.
                    </p>
                  </div>
                  <div>
                    <Button type="submit" disabled={busy === "google"}>
                      {busy === "google" ? "Salvando..." : "Salvar integração"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-6">
              <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Preferências de notificação
              </h2>
              <form
                onSubmit={saveNotifs}
                className="flex flex-col gap-4 max-w-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="notifications-enabled">Notificações ativadas</Label>
                  <Switch
                    id="notifications-enabled"
                    name="notificationsEnabled"
                    checked={notificationsEnabled}
                    onCheckedChange={(v) => {
                      if (!v) {
                        setNotificationsEnabled(false);
                        return;
                      }
                      void enableBrowserNotifications().then((granted) => setNotificationsEnabled(granted));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="notifications-browser">Notificações do navegador</Label>
                  <Switch
                    id="notifications-browser"
                    checked={browserEnabled}
                    onCheckedChange={(v) => {
                      if (v) void enableBrowserNotifications();
                      else disableBrowserNotifications();
                    }}
                  />
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testBrowserNotification}
                    disabled={busy === "test-notification"}
                  >
                    {busy === "test-notification" ? "Enviando..." : "Testar notificação"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notifications-frequency">Frequência padrão de contato (dias)</Label>
                  <Input
                    id="notifications-frequency"
                    name="freq"
                    type="number"
                    min={1}
                    defaultValue={user.defaultContactFrequency}
                    className="w-full bg-background border-input"
                  />
                </div>
                <div>
                  <Button type="submit" disabled={busy === "notifications"}>
                    {busy === "notifications" ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
              </div>

            </div>
          )}

          {tab === "jobs" && (
            <div className="space-y-4 max-w-md">
              <h2 className="text-lg font-semibold">Tarefas em segundo plano</h2>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="jobs-auto-clear">Limpar automaticamente quando concluído</Label>
                <Switch
                  id="jobs-auto-clear"
                  checked={autoClearCompletedJobs}
                  disabled={busy === "auto-clear"}
                  onCheckedChange={async (v) => {
                    setAutoClearCompletedJobs(v);
                    setBusy("auto-clear");
                    try {
                      await updateAutoClearJobsAction(v);
                      toast.add({ title: "Preferência salva" });
                    } catch (error) {
                      setAutoClearCompletedJobs(!v);
                      toast.add({ title: "Erro", description: errorMessage(error) });
                    } finally {
                      setBusy(null);
                    }
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">O progresso aparece na bolinha do header. Use “Limpar concluídas” dentro da bolinha para remover tarefas finalizadas.</p>
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
                      value={u.role}
                      disabled={busy === `role-${u.id}`}
                      onValueChange={(v: string | null) =>
                        changeUserRole(u.id, v === "admin" ? "admin" : "vendor")
                      }
                    >
                      <SelectTrigger
                        aria-label={`Permissão de ${u.name ?? u.email}`}
                        className="w-full sm:w-32 bg-background border-input"
                      >
                        <SelectValue placeholder="Vendedor" />
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
            <Button
              variant="outline"
              onClick={() => startDeleteSyncedGoogleEvents(true)}
              disabled={!!activeJobId || busy === "delete-google-events"}
            >
              {busy === "delete-google-events" ? "Iniciando..." : "Executar em segundo plano"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => startDeleteSyncedGoogleEvents(false)}
              disabled={!!activeJobId || busy === "delete-google-events"}
            >
              Continuar
            </Button>
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
            <Button
              variant="outline"
              onClick={() => startSyncGoogle(true)}
              disabled={!!activeJobId || busy === "sync-google"}
            >
              {busy === "sync-google" ? "Iniciando..." : "Executar em segundo plano"}
            </Button>
            <Button
              onClick={() => startSyncGoogle(false)}
              disabled={!!activeJobId || busy === "sync-google"}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
