"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/current-user";
import {
  removeUserAdmin,
  sendPasswordResetLinkAdmin,
  updateUserProfileAdmin,
} from "@/lib/admin/users-service";

const EDITABLE_ROLES: AppRole[] = ["analyst", "respondent"];

export async function saveUserProfileAction(formData: FormData) {
  await requireRole(["admin"]);
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) {
    throw new Error("Identificador do usuário ausente.");
  }

  const fullNameRaw = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as AppRole;
  const orgRaw = String(formData.get("organizationId") ?? "").trim();

  if (!EDITABLE_ROLES.includes(role)) {
    throw new Error("Papel inválido.");
  }
  if (!orgRaw) {
    throw new Error("Selecione uma organização para analistas e respondentes.");
  }

  await updateUserProfileAdmin({
    userId,
    fullName: fullNameRaw ? fullNameRaw : null,
    role,
    organizationId: orgRaw,
  });

  revalidatePath("/admin/usuarios");
}

export async function resetPasswordAction(formData: FormData) {
  await requireRole(["admin"]);
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return;

  const { recoveryLink } = await sendPasswordResetLinkAdmin(userId);

  if (recoveryLink) {
    redirect(`/admin/usuarios?recovery=${encodeURIComponent(recoveryLink)}`);
  }
  redirect("/admin/usuarios?recoveryNotice=no_link");
}

export async function removeUserAction(formData: FormData) {
  const actor = await requireRole(["admin"]);
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return;

  await removeUserAdmin(actor.userId, userId);
  revalidatePath("/admin/usuarios");
}
