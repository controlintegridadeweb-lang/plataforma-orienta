import { requireRole } from "@/lib/auth/current-user";
import { ProfilePageContent } from "@/components/profile/profile-page-content";

export default async function AnalistaPerfilPage() {
  const user = await requireRole(["analyst"]);
  return <ProfilePageContent user={user} />;
}
