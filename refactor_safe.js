const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'KanbanBoard.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const importsToAdd = `import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Task } from "./kanban/types";
import { TaskCard } from "./kanban/TaskCard";
import { FilterControls } from "./kanban/FilterControls";

const CreateTaskDialog = dynamic(() => import("./kanban/CreateTaskDialog").then(m => m.CreateTaskDialog), { ssr: false });
const TaskDetailDialog = dynamic(() => import("./kanban/TaskDetailDialog").then(m => m.TaskDetailDialog), { ssr: false });
const AdminReminderDialog = dynamic(() => import("./kanban/AdminReminderDialog").then(m => m.AdminReminderDialog), { ssr: false });
const OverdueModal = dynamic(() => import("./kanban/OverdueModal").then(m => m.OverdueModal), { ssr: false });
`;

if (!content.includes('TaskCard')) {
  content = content.replace('import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";', importsToAdd);
}

// 1. Replace FilterControls block
// We'll search for the div
const filterStartStr = '<div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-lg border border-border">';
const filterEndStr = '          {/* Search bar removed per user request */}';
const filterStartIndex = content.indexOf(filterStartStr);
const filterEndIndex = content.indexOf(filterEndStr);

if (filterStartIndex !== -1 && filterEndIndex !== -1) {
  const replacement = `<FilterControls 
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterSortBy={filterSortBy}
            setFilterSortBy={setFilterSortBy}
            filterUser={filterUser}
            setFilterUser={setFilterUser}
            users={users}
          />
`;
  content = content.substring(0, filterStartIndex) + replacement + content.substring(filterEndIndex);
}

// 2. Replace CreateTaskDialog
const createStartStr = '<Dialog open={isCreating} onOpenChange={setIsCreating}>';
// It ends with </Dialog> right before {/* Task Detail Modal */}
const createEndStr = '          {/* Task Detail Modal */}';
const createStartIndex = content.indexOf(createStartStr);
const createEndIndex = content.indexOf(createEndStr);

if (createStartIndex !== -1 && createEndIndex !== -1) {
  // we must go back to the </Dialog> before the end string.
  const replacement = `<CreateTaskDialog 
            isOpen={isCreating}
            onOpenChange={setIsCreating}
            users={users}
          />
`;
  content = content.substring(0, createStartIndex) + replacement + content.substring(createEndIndex);
}

// 3. Replace TaskCard
// Find the Card onClick inside Draggable
const cardStartStr = '<Card \\n                                onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}';
// wait, whitespace can be tricky, so let's use a regex just for the Card up to </Card>
// Since Card is unique enough here inside the Draggable
const cardRegex = /<Card[\s\S]*?<\/Card>/;
// Wait, there might be multiple <Card>s. Let's find the one in Draggable
const draggablePartStartIndex = content.indexOf('<Draggable key={task._id}');
if (draggablePartStartIndex !== -1) {
  const cardStartIdx = content.indexOf('<Card', draggablePartStartIndex);
  const cardEndIdx = content.indexOf('</Card>', cardStartIdx) + '</Card>'.length;
  
  if (cardStartIdx !== -1 && cardEndIdx !== -1) {
    const replacement = `<TaskCard 
                                task={task}
                                users={users}
                                userRole={userRole}
                                isSelected={selectedTaskIds.has(task._id)}
                                isDragging={snapshot.isDragging}
                                isOverdue={isTaskOverdue(task)}
                                onSelect={toggleSelectTask}
                                onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                              />`;
    content = content.substring(0, cardStartIdx) + replacement + content.substring(cardEndIdx);
  }
}

// 4. Replace TaskDetailDialog
const detailStartStr = '{/* Task Detail Modal */}';
const detailEndStr = '{/* Overdue Reason Modal */}';
const detailStartIndex = content.indexOf(detailStartStr);
const detailEndIndex = content.indexOf(detailEndStr);

if (detailStartIndex !== -1 && detailEndIndex !== -1) {
  const replacement = `{/* Task Detail Modal */}
      <TaskDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        selectedTask={selectedTask}
        users={users}
        userRole={userRole}
        userId={userId}
        onDeleteTask={handleDeleteTask}
        onUpdateProgress={handleUpdateProgress}
        onAddComment={(taskId, comment) => addCommentMutation.mutate({ taskId, content: comment })}
        isDeleting={deleteTaskMutation.isPending}
        isAddingComment={addCommentMutation.isPending}
      />
      `;
  content = content.substring(0, detailStartIndex) + replacement + content.substring(detailEndIndex);
}

// 5. Replace Overdue Reason Modal
const overdueStartStr = '{/* Overdue Reason Modal */}';
const overdueEndStr = '{/* Admin Reminder Modal */}';
const overdueStartIndex = content.indexOf(overdueStartStr);
const overdueEndIndex = content.indexOf(overdueEndStr);

if (overdueStartIndex !== -1 && overdueEndIndex !== -1) {
  const replacement = `{/* Overdue Reason Modal */}
      <OverdueModal
        isOpen={isOverdueModalOpen}
        onOpenChange={setIsOverdueModalOpen}
        onSubmit={(reason) => {
          setOverdueReason(reason);
          handleOverdueSubmit({ preventDefault: () => {} } as React.FormEvent);
        }}
      />
      `;
  content = content.substring(0, overdueStartIndex) + replacement + content.substring(overdueEndIndex);
}

// 6. Replace Admin Reminder Modal
const adminStartStr = '{/* Admin Reminder Modal */}';
const adminEndStr = '    </div>\\n  );\\n}';
// Let's use lastIndexOf('    </div>')
const adminStartIndex = content.indexOf(adminStartStr);
const adminEndIndex = content.lastIndexOf('    </div>');

if (adminStartIndex !== -1 && adminEndIndex !== -1) {
  const replacement = `{/* Admin Reminder Modal */}
      <AdminReminderDialog 
        isOpen={isAdminReminderOpen}
        onOpenChange={setIsAdminReminderOpen}
        overdueTasksList={overdueTasksList}
      />
`;
  content = content.substring(0, adminStartIndex) + replacement + content.substring(adminEndIndex);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactoring Safe complete!');
