import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { verifyAuth } from "@/lib/auth";
import { HeaderProfile } from "@/components/HeaderProfile";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifyAuth();
  const userRole = session?.role || undefined;
  const userId = session?.userId;

  let user = null;
  if (userId) {
    await dbConnect();
    const dbUser = await User.findById(userId).select("name email avatar role");
    if (dbUser) {
      user = JSON.parse(JSON.stringify(dbUser));
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar userRole={userRole} />
      <main className="flex-1 overflow-hidden flex flex-col h-screen">
        <div className="h-14 border-b flex items-center px-4 justify-between bg-background">
          <SidebarTrigger />
          <HeaderProfile user={user} />
        </div>
        <div className="flex-1 overflow-auto p-4 bg-muted/20">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
