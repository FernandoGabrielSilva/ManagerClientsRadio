import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  return <LoginForm linkEmail={sp.link} reason={sp.reason} />;
}
