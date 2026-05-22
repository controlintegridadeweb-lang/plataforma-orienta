import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { ProfileShell } from "@/components/profile/profile-shell";
import type { CurrentUser } from "@/lib/auth/current-user";
import { roleLabels } from "@/lib/config/navigation";

const PROFILE_DESCRIPTION =
  "Atualize seus dados pessoais, visualize vínculos da conta e altere sua senha de acesso.";

export function ProfilePageContent({ user }: { user: CurrentUser }) {
  return (
    <ProfileShell
      title="Meu Perfil"
      description={PROFILE_DESCRIPTION}
      roleLabel={roleLabels[user.role]}
    >
      <ProfileEditForm user={user} />
    </ProfileShell>
  );
}
