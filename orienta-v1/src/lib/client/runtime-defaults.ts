export type RuntimeDefaults = {
  formId: string;
  organizationId: string;
  respondentUserId: string;
  adminUserId: string;
};

export function getRuntimeDefaults(): RuntimeDefaults {
  return {
    formId: process.env.NEXT_PUBLIC_DEFAULT_FORM_ID ?? "",
    organizationId: process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ?? "",
    respondentUserId: process.env.NEXT_PUBLIC_DEFAULT_RESPONDENT_USER_ID ?? "",
    adminUserId: process.env.NEXT_PUBLIC_DEFAULT_ADMIN_USER_ID ?? "",
  };
}

export function buildDevAuthHeaders(userId: string, role: "admin" | "respondent") {
  return {
    "Content-Type": "application/json",
    "x-user-id": userId,
    "x-user-role": role,
  };
}
