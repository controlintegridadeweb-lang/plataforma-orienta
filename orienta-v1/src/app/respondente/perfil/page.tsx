import { requireRole } from "@/lib/auth/current-user";
import { ProfilePageContent } from "@/components/profile/profile-page-content";

export default async function RespondentePerfilPage() {
  const user = await requireRole(["respondent"]);
  return <ProfilePageContent user={user} />;
}
