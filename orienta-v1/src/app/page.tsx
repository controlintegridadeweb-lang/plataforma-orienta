import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { getCurrentUser, homeRouteForRole } from "@/lib/auth/current-user";
import { getOrganizationsForLogin } from "@/lib/organizations/login-options";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homeRouteForRole(user.role));

  const organizations = await getOrganizationsForLogin();

  return (
    <AuthSplitLayout>
      <LoginForm organizations={organizations} />
    </AuthSplitLayout>
  );
}
