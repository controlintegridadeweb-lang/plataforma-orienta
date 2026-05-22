import { requireRole } from "@/lib/auth/current-user";
import { ProfilePageContent } from "@/components/profile/profile-page-content";

export default async function AdminPerfilPage() {
  const user = await requireRole(["admin", "analyst"]);
  return <ProfilePageContent user={user} />;
}
