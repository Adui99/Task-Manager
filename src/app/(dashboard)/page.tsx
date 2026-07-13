import { KanbanBoard } from "@/components/KanbanBoard";
import { verifyAuth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await verifyAuth();
  const userRole = session?.role || undefined;
  const userId = session?.userId || undefined;

  return (
    <div className="h-full">
      <KanbanBoard userRole={userRole} userId={userId} />
    </div>
  );
}
