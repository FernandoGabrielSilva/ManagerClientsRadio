import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const clientSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  company: z.string().optional().nullable(),
  legalName: z.string().optional().nullable(),
  tradeName: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  contactRole: z.string().optional().nullable(),
  offeredMediaType: z.string().optional().nullable(),
  videoWeekday: z.number().int().min(0).max(127),
  lastContactAt: z.string().optional().nullable(),
  contactFrequencyDays: z.number().int().min(1).max(365),
  contractStatus: z.enum(["active", "paused", "ended", "negotiation"]),
  contractStart: z.string().optional().nullable(),
  contractEnd: z.string().optional().nullable(),
  contractValue: z.number().optional().nullable(),
  contractTotalValue: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  lastVideoSentAt: z.string().optional().nullable(),
  needsAdChange: z.boolean().optional(),
  vendorId: z.string().optional().nullable(),
  responsible: z.string().optional().nullable(),
  commercialStatus: z.string().optional().nullable(),
  contactType: z.string().optional().nullable(),
  nextAction: z.string().optional().nullable(),
  nextActionDate: z.string().optional().nullable(),
  dateConference: z.string().optional().nullable(),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  image: z.string().optional().nullable(),
});

export const passwordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

export const themeSchema = z.object({
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  themeMode: z.enum(["light", "dark", "system"]),
});

export const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  start: z.string(),
  end: z.string().optional().nullable(),
  allDay: z.boolean().optional(),
  type: z.enum(["video", "contact", "contract_expiry", "custom"]),
  clientId: z.string().optional().nullable(),
});

export const reminderSchema = z.object({
  title: z.string().min(1),
  message: z.string().optional().nullable(),
  dueDate: z.string(),
  type: z.enum(["video", "contact", "ad_change", "contract_expiry", "custom"]),
  clientId: z.string().optional().nullable(),
});

export const contractSchema = z.object({
  number: z.string().optional().nullable(),
  clientId: z.string().min(1, "Cliente obrigatório"),
  vendorId: z.string().optional().nullable(),
  sellerName: z.string().optional().nullable(),
  program: z.string().optional().nullable(),
  startDate: z.string().min(1, "Data de início obrigatória"),
  durationMonths: z.number().int().min(0).optional().nullable(),
  endDate: z.string().optional().nullable(),
  mediaType: z.string().min(1, "Tipo de mídia obrigatório"),
  insertions: z.number().int().optional().nullable(),
  insertionsPerDay: z.number().int().optional().nullable(),
  insertionsPerMonth: z.number().int().optional().nullable(),
  timeSlots: z.string().optional().nullable(),
  value: z.number().optional().nullable(),
  totalValue: z.number().optional().nullable(),
  paymentInfo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
