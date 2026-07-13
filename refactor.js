const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'KanbanBoard.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add imports
const importsToAdd = `import dynamic from "next/dynamic";
import { Task } from "./kanban/types";
import { TaskCard } from "./kanban/TaskCard";
import { FilterControls } from "./kanban/FilterControls";

const CreateTaskDialog = dynamic(() => import("./kanban/CreateTaskDialog").then(m => m.CreateTaskDialog), { ssr: false });
const TaskDetailDialog = dynamic(() => import("./kanban/TaskDetailDialog").then(m => m.TaskDetailDialog), { ssr: false });
const AdminReminderDialog = dynamic(() => import("./kanban/AdminReminderDialog").then(m => m.AdminReminderDialog), { ssr: false });
const OverdueModal = dynamic(() => import("./kanban/OverdueModal").then(m => m.OverdueModal), { ssr: false });
`;

content = content.replace('import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";\n', 'import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";\n' + importsToAdd);

// Remove the inline Task type
const typeTaskRegex = /type Task = \{[\s\S]*?\};\n/;
content = content.replace(typeTaskRegex, '');

// Remove unused state
content = content.replace(/  const \[newTaskTitle.*?;\n/g, '');
content = content.replace(/  const \[newTaskDescription.*?;\n/g, '');
content = content.replace(/  const \[newTaskPriority.*?;\n/g, '');
content = content.replace(/  const \[newTaskAssignee.*?;\n/g, '');
content = content.replace(/  const \[newTaskTeamAssignees.*?;\n/g, '');
content = content.replace(/  const \[newTaskDeadline.*?;\n/g, '');
content = content.replace(/  const \[newSendEmail.*?;\n/g, '');
content = content.replace(/  const \[isAiLoading.*?;\n/g, '');
content = content.replace(/  const \[commentContent.*?;\n/g, '');
content = content.replace(/  const \[localProgress.*?;\n/g, '');

// Remove CreateTask mutation and handlers
content = content.replace(/  const createTaskMutation = useMutation\(\{[\s\S]*?\}\);\n\n/g, '');
content = content.replace(/  const handleCreateTask = \([\s\S]*?\}\);\n  \};\n\n/g, '');
content = content.replace(/  const handleAIAssign = async \([\s\S]*?\}\n  \};\n\n/g, '');

// Remove comment state syncing
content = content.replace(/  \/\/ Sync localProgress when opening a task detail\n  useEffect\(\(\) => \{\n    if \(selectedTask\) \{\n      setLocalProgress\(selectedTask\.progress \|\| 0\);\n    \}\n  \}, \[selectedTask\?\._id\]\);\n\n/, '');

// Replace Filter Controls
const filterReplacement = `<FilterControls 
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterSortBy={filterSortBy}
            setFilterSortBy={setFilterSortBy}
            filterUser={filterUser}
            setFilterUser={setFilterUser}
            users={users}
          />`;

content = content.replace(
  /<div className="flex items-center gap-2 bg-muted\/30 p-1\.5 rounded-lg border border-border">[\s\S]*?<\/div>\s*<div className="flex items-center gap-2">/,
  `${filterReplacement}\n\n          <div className="flex items-center gap-2">`
);

// Replace CreateTaskDialog
const createModalReplacement = `<CreateTaskDialog 
            isOpen={isCreating}
            onOpenChange={setIsCreating}
            users={users}
          />`;

content = content.replace(
  /<Dialog open=\{isCreating\} onOpenChange=\{setIsCreating\}>[\s\S]*?<\/Dialog>/,
  createModalReplacement
);

// Replace TaskCard
const taskCardReplacement = `<TaskCard 
                                task={task}
                                users={users}
                                userRole={userRole}
                                isSelected={selectedTaskIds.has(task._id)}
                                isDragging={snapshot.isDragging}
                                isOverdue={isTaskOverdue(task)}
                                onSelect={toggleSelectTask}
                                onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                              />`;

content = content.replace(
  /<Card[\s\S]*?onClick=\{\(\) => \{ setSelectedTask\(task\); setIsDetailOpen\(true\); \}\}[\s\S]*?<\/Card>/,
  taskCardReplacement
);

// Replace TaskDetailDialog
const detailModalReplacement = `<TaskDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        selectedTask={selectedTask}
        users={users}
        userRole={userRole}
        userId={userId}
        onDeleteTask={handleDeleteTask}
        onUpdateProgress={handleUpdateProgress}
        onAddComment={(taskId, content) => addCommentMutation.mutate({ taskId, content })}
        isDeleting={deleteTaskMutation.isPending}
        isAddingComment={addCommentMutation.isPending}
      />`;

content = content.replace(
  /\{?\/\* Task Detail Modal \*\/\}?\s*<Dialog open=\{isDetailOpen\} onOpenChange=\{setIsDetailOpen\}>[\s\S]*?<\/Dialog>/,
  `{/* Task Detail Modal */}\n      ${detailModalReplacement}`
);

// Remove handlePostComment
content = content.replace(/  const handlePostComment = \(\) => \{[\s\S]*?\};\n\n/, '');

// Replace Overdue Modal
const overdueModalReplacement = `<OverdueModal
        isOpen={isOverdueModalOpen}
        onOpenChange={setIsOverdueModalOpen}
        onSubmit={(reason) => {
          setOverdueReason(reason);
          // Small hack: handleOverdueSubmit expects an event, but we can call it directly and pass a fake event
          handleOverdueSubmit({ preventDefault: () => {} } as React.FormEvent);
        }}
      />`;

content = content.replace(
  /\{?\/\* Overdue Reason Modal \*\/\}?\s*<Dialog open=\{isOverdueModalOpen\}[\s\S]*?<\/Dialog>/,
  `{/* Overdue Reason Modal */}\n      ${overdueModalReplacement}`
);

// Replace Admin Reminder Modal
const adminReminderReplacement = `<AdminReminderDialog 
        isOpen={isAdminReminderOpen}
        onOpenChange={setIsAdminReminderOpen}
        overdueTasksList={overdueTasksList}
      />`;

content = content.replace(
  /\{?\/\* Admin Reminder Modal \*\/\}?\s*<Dialog open=\{isAdminReminderOpen\} onOpenChange=\{setIsAdminReminderOpen\}>[\s\S]*?<\/Dialog>/,
  `{/* Admin Reminder Modal */}\n      ${adminReminderReplacement}`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactoring complete!');
