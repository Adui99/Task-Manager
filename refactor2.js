const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'KanbanBoard.tsx');
let lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);

const importsToAdd = `import dynamic from "next/dynamic";
import { Task } from "./kanban/types";
import { TaskCard } from "./kanban/TaskCard";
import { FilterControls } from "./kanban/FilterControls";

const CreateTaskDialog = dynamic(() => import("./kanban/CreateTaskDialog").then(m => m.CreateTaskDialog), { ssr: false });
const TaskDetailDialog = dynamic(() => import("./kanban/TaskDetailDialog").then(m => m.TaskDetailDialog), { ssr: false });
const AdminReminderDialog = dynamic(() => import("./kanban/AdminReminderDialog").then(m => m.AdminReminderDialog), { ssr: false });
const OverdueModal = dynamic(() => import("./kanban/OverdueModal").then(m => m.OverdueModal), { ssr: false });`;

let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";')) {
    newLines.push(line);
    newLines.push(importsToAdd);
    continue;
  }

  if (line.startsWith('type Task = {')) {
    skip = true;
    continue;
  }
  if (skip && line.startsWith('};')) {
    skip = false;
    continue;
  }
  if (skip) continue;

  if (
    line.includes('const [newTaskTitle') ||
    line.includes('const [newTaskDescription') ||
    line.includes('const [newTaskPriority') ||
    line.includes('const [newTaskAssignee') ||
    line.includes('const [newTaskTeamAssignees') ||
    line.includes('const [newTaskDeadline') ||
    line.includes('const [newSendEmail') ||
    line.includes('const [isAiLoading') ||
    line.includes('const [commentContent') ||
    line.includes('const [localProgress')
  ) {
    continue; // Remove unused state
  }

  // Remove createTaskMutation block
  if (line.includes('const createTaskMutation = useMutation({')) {
    skip = true;
    continue;
  }
  if (skip && line.includes('const handleCreateTask = ')) {
    skip = false; // We were skipping mutation, now we hit handleCreateTask, wait, we want to skip that too
  }
  
  if (line.includes('const handleCreateTask = (e: React.FormEvent) => {')) {
    skip = true;
    continue;
  }
  
  if (line.includes('const handleAIAssign = async () => {')) {
    skip = true;
    continue;
  }

  if (line.includes('const handlePostComment = () => {')) {
    skip = true;
    continue;
  }

  // Stop skipping if we hit the next known declaration
  if (skip && (
      line.includes('const deleteTaskMutation = useMutation({') || 
      line.includes('const updateProgressMutation = useMutation({') ||
      line.includes('const handleOverdueSubmit = async')
  )) {
    skip = false;
  }

  if (skip) continue;

  // FilterControls
  if (line.includes('<div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-lg border border-border">')) {
    newLines.push(`          <FilterControls 
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterSortBy={filterSortBy}
            setFilterSortBy={setFilterSortBy}
            filterUser={filterUser}
            setFilterUser={setFilterUser}
            users={users}
          />`);
    skip = true;
    continue;
  }
  if (skip && line.includes('<div className="flex items-center gap-2">') && !line.includes('bg-muted')) {
    skip = false;
    newLines.push(line);
    continue;
  }
  if (skip) continue;

  // CreateTaskDialog
  if (line.includes('<Dialog open={isCreating} onOpenChange={setIsCreating}>')) {
    newLines.push(`          <CreateTaskDialog 
            isOpen={isCreating}
            onOpenChange={setIsCreating}
            users={users}
          />`);
    skip = true;
    continue;
  }
  if (skip && line.includes('</Dialog>') && newLines[newLines.length-1].includes('CreateTaskDialog')) {
    skip = false;
    continue;
  }
  if (skip) continue;

  // TaskCard
  if (line.includes('<Card') && lines[i+1] && lines[i+1].includes('onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}')) {
    newLines.push(`                              <TaskCard 
                                task={task}
                                users={users}
                                userRole={userRole}
                                isSelected={selectedTaskIds.has(task._id)}
                                isDragging={snapshot.isDragging}
                                isOverdue={isTaskOverdue(task)}
                                onSelect={toggleSelectTask}
                                onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                              />`);
    skip = true;
    continue;
  }
  if (skip && line.includes('</Card>')) {
    skip = false;
    continue;
  }
  if (skip) continue;

  // TaskDetailDialog
  if (line.includes('{/* Task Detail Modal */}')) {
    newLines.push(`      {/* Task Detail Modal */}
      <TaskDetailDialog
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
      />`);
    skip = true;
    continue;
  }
  if (skip && line.includes('{/* Overdue Reason Modal */}')) {
    skip = false;
  }
  if (skip) continue;

  // Overdue Reason Modal
  if (line.includes('{/* Overdue Reason Modal */}')) {
    newLines.push(`      {/* Overdue Reason Modal */}
      <OverdueModal
        isOpen={isOverdueModalOpen}
        onOpenChange={setIsOverdueModalOpen}
        onSubmit={(reason) => {
          setOverdueReason(reason);
          handleOverdueSubmit({ preventDefault: () => {} } as React.FormEvent);
        }}
      />`);
    skip = true;
    continue;
  }
  if (skip && line.includes('{/* Admin Reminder Modal */}')) {
    skip = false;
  }
  if (skip) continue;

  // Admin Reminder Modal
  if (line.includes('{/* Admin Reminder Modal */}')) {
    newLines.push(`      {/* Admin Reminder Modal */}
      <AdminReminderDialog 
        isOpen={isAdminReminderOpen}
        onOpenChange={setIsAdminReminderOpen}
        overdueTasksList={overdueTasksList}
      />`);
    skip = true;
    continue;
  }
  if (skip && line.includes('</Dialog>')) {
    skip = false;
    continue;
  }
  if (skip) continue;

  newLines.push(line);
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
console.log('Refactoring 2 complete!');
