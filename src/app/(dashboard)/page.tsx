import { KanbanBoard } from "@/components/KanbanBoard";
import { headers } from "next/headers";

export default async function DashboardPage() {
  const headerList = await headers();
  const userRole = headerList.get("x-user-role") || undefined;
  const userId = headerList.get("x-user-id") || undefined;

  return (
    <div className="h-full">
      <KanbanBoard userRole={userRole} userId={userId} />
    </div>
  );
}
