const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'KanbanBoard.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const importsToAdd = `import dynamic from "next/dynamic";
import { Task } from "./kanban/types";
import { TaskCard } from "./kanban/TaskCard";
import { FilterControls } from "./kanban/FilterControls";

const CreateTaskDialog = dynamic(() => import("./kanban/CreateTaskDialog").then(m => m.CreateTaskDialog), { ssr: false });
const TaskDetailDialog = dynamic(() => import("./kanban/TaskDetailDialog").then(m => m.TaskDetailDialog), { ssr: false });
const AdminReminderDialog = dynamic(() => import("./kanban/AdminReminderDialog").then(m => m.AdminReminderDialog), { ssr: false });
const OverdueModal = dynamic(() => import("./kanban/OverdueModal").then(m => m.OverdueModal), { ssr: false });
`;

if (!content.includes('TaskCard')) {
  content = content.replace(/import \{ useQuery, useMutation, useQueryClient \} from "@tanstack\/react-query";[\r\n]+/, match => match + importsToAdd + '\n');
}

// Remove the inline Task type which handles \r\n
const typeTaskRegex = /type Task = \{[\s\S]*?\};[\r\n]+/;
content = content.replace(typeTaskRegex, '');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed imports!');
