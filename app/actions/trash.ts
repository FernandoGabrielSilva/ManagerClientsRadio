"use server";

import { revalidatePath } from "next/cache";
import { restoreClientsAction, permanentDeleteClientsAction } from "./clients";
import { restoreContractsAction, permanentDeleteContractsAction } from "./contracts";
import { restoreRemindersAction, permanentDeleteRemindersAction } from "./reminders";

export type TrashItemRef = { kind: "client" | "contract" | "reminder"; id: string };

export async function restoreTrashItemsAction(items: TrashItemRef[]) {
  const byKind = { client: [] as string[], contract: [] as string[], reminder: [] as string[] };
  for (const it of items) byKind[it.kind].push(it.id);
  if (byKind.client.length) await restoreClientsAction(byKind.client);
  if (byKind.contract.length) await restoreContractsAction(byKind.contract);
  if (byKind.reminder.length) await restoreRemindersAction(byKind.reminder);
  revalidatePath("/trash");
  revalidatePath("/clients");
  revalidatePath("/contracts");
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function purgeTrashItemsAction(items: TrashItemRef[]) {
  const byKind = { client: [] as string[], contract: [] as string[], reminder: [] as string[] };
  for (const it of items) byKind[it.kind].push(it.id);
  if (byKind.client.length) await permanentDeleteClientsAction(byKind.client);
  if (byKind.contract.length) await permanentDeleteContractsAction(byKind.contract);
  if (byKind.reminder.length) await permanentDeleteRemindersAction(byKind.reminder);
  revalidatePath("/trash");
  return { success: true };
}
