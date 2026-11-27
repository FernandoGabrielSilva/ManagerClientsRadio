export const CLIENT_EVENT_PREFIXES = [
  "Último contato:",
  "Próximo contato:",
  "Próxima ação:",
  "Vencimento Contrato",
  "Enviar vídeo:",
  "Contatar:",
  "Sugerir mudança de anúncio:",
] as const;

export const LEGACY_CLIENT_EVENT_PREFIXES = ["Agenda:"] as const;

export const MANAGED_CLIENT_EVENT_PREFIXES = [
  ...CLIENT_EVENT_PREFIXES,
  ...LEGACY_CLIENT_EVENT_PREFIXES,
] as const;

export function isManagedClientEventTitle(title: string): boolean {
  return MANAGED_CLIENT_EVENT_PREFIXES.some((prefix) =>
    title.startsWith(prefix),
  );
}
