"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import { signIn } from "@/auth";

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { accounts: { where: { provider: "google" }, select: { id: true } } },
  });
  if (existing) {
    if (!existing.passwordHash && existing.accounts.length > 0) {
      return { error: "EMAIL_EXISTS_GOOGLE", email };
    }
    return { error: "EMAIL_EXISTS_PASSWORD", email };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash },
  });
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
}
