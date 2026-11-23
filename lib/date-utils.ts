import { addDays, isBefore, startOfDay, differenceInDays, format, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function nextContactDate(lastContact: Date | null, frequencyDays: number): Date {
  const base = lastContact ? new Date(lastContact) : new Date();
  const utcMidnight = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  return addDays(utcMidnight, frequencyDays);
}

export function isContactOverdue(lastContact: Date | null, frequencyDays: number, now = new Date()): boolean {
  const due = nextContactDate(lastContact, frequencyDays);
  const utcNowMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return isBefore(due, utcNowMidnight);
}

export function daysSinceContact(lastContact: Date | null, now = new Date()): number | null {
  if (!lastContact) return null;
  return differenceInDays(now, new Date(lastContact));
}

export function daysUntil(date: Date | null, now = new Date()): number | null {
  if (!date) return null;
  return differenceInDays(new Date(date), now);
}

export function isContractExpiringSoon(contractEnd: Date | null, days = 30, now = new Date()): boolean {
  if (!contractEnd) return false;
  const end = new Date(contractEnd);
  return !isBefore(end, startOfDay(now)) && differenceInDays(end, now) <= days;
}

export function formatDate(date: Date | null | undefined, fmt = "dd/MM/yyyy"): string {
  if (!date) return "—";
  const d = new Date(date);
  const utcAsLocal = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return format(utcAsLocal, fmt, { locale: ptBR });
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function videoDayThisWeek(weekday: number, now = new Date()): Date {
  const today = startOfDay(now);
  const diff = (weekday - getDay(today) + 7) % 7;
  return addDays(today, diff);
}

export function isVideoDueToday(weekday: number, now = new Date()): boolean {
  return (weekday & (1 << getDay(now))) !== 0;
}

export function weekdayLabel(weekday: number): string {
  const days = WEEKDAYS.filter((_, i) => (weekday & (1 << i)) !== 0);
  return days.length ? days.join(", ") : "—";
}
