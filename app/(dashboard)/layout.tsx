import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Topbar } from "@/components/layout/topbar";


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  const notifications = await prisma.notification.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 8 });

  return (
    <ThemeProvider themeColor={user.themeColor} themeMode={user.themeMode}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar user={user} notifications={notifications} />
          <main className="flex-1 p-4 md:p-6"><div className="mx-auto w-full space-y-6">{children}</div></main>
        </div>
      </div>
    </ThemeProvider>
  );
}
