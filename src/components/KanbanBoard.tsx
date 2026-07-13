"use client";
import { Calendar } from "lucide-react";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Task } from "./kanban/types";
import { TaskCard } from "./kanban/TaskCard";
import { FilterControls } from "./kanban/FilterControls";

const CreateTaskDialog = dynamic(() => import("./kanban/CreateTaskDialog").then(m => m.CreateTaskDialog), { ssr: false });
const TaskDetailDialog = dynamic(() => import("./kanban/TaskDetailDialog").then(m => m.TaskDetailDialog), { ssr: false });
const AdminReminderDialog = dynamic(() => import("./kanban/AdminReminderDialog").then(m => m.AdminReminderDialog), { ssr: false });
const OverdueModal = dynamic(() => import("./kanban/OverdueModal").then(m => m.OverdueModal), { ssr: false });


export function KanbanBoard({ userRole, userId }: { userRole?: string, userId?: string }) {
  const { t, lang, setLang } = useLanguage();
  const queryClient = useQueryClient();

  const COLUMNS = [
    { id: "todo", title: t('todo'), color: "bg-indigo-600" },
    { id: "in-progress", title: t('inProgress'), color: "bg-amber-500" },
    { id: "done", title: t('done'), color: "bg-emerald-500" },
  ];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("unassigned");
  const [newTaskTeamAssignees, setNewTaskTeamAssignees] = useState<string[]>([]);
  const [newTaskDeadline, setNewTaskDeadline] = useState<string>("");
  const [newSendEmail, setNewSendEmail] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [localProgress, setLocalProgress] = useState<number>(0);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const [isAdminReminderOpen, setIsAdminReminderOpen] = useState(false);
  const [overdueTasksList, setOverdueTasksList] = useState<Task[]>([]);
  const [selectedReminderTaskIds, setSelectedReminderTaskIds] = useState<Set<string>>(new Set());
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [overdueReason, setOverdueReason] = useState("");
  const [pendingOverdueAction, setPendingOverdueAction] = useState<any>(null);

  const isTaskOverdue = (task: Task) => {
    if (!task.deadline || task.status === "done") return false;
    const now = new Date();
    const deadlineDate = new Date(task.deadline);
    return deadlineDate.getTime() < now.getTime();
  };

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSortBy, setFilterSortBy] = useState<string>("deadline");
  const [filterUser, setFilterUser] = useState<string>("all");

  const { data: serverTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error("Lỗi tải công việc từ máy chủ");
      return data;
    }
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Lỗi tải người dùng");
      return res.json();
    }
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (serverTasks) {
      setTasks(serverTasks);
    }
  }, [serverTasks]);

  const reorderMutation = useMutation({
    mutationFn: async (itemsToUpdate: any[]) => {
      const res = await fetch("/api/tasks/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToUpdate })
      });
      if (!res.ok) throw new Error("Lỗi đồng bộ");
      return res.json();
    },
    onError: () => {
      toast.error("Lỗi đồng bộ");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const onDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic Update
    const newTasks = Array.from(tasks);
    
    const movedTaskIndex = newTasks.findIndex(t => t._id === draggableId);
    if (movedTaskIndex === -1) return;
    
    const movedTaskRaw = newTasks[movedTaskIndex];
    if (destination.droppableId === "done" && isTaskOverdue(movedTaskRaw)) {
      setPendingOverdueAction({ movedTask: { ...movedTaskRaw }, source, destination, draggableId });
      setIsOverdueModalOpen(true);
      return;
    }

    if (destination.droppableId === "done" && movedTaskRaw.progress !== 100) {
      toast.error(lang === "vi" 
        ? "Công việc phải đạt tiến độ 100% mới được chuyển sang Hoàn thành." 
        : "Task must reach 100% progress to be marked as Done.");
      return;
    }

    const [movedTask] = newTasks.splice(movedTaskIndex, 1);
    movedTask.status = destination.droppableId;

    const destTasks = newTasks.filter(t => t.status === destination.droppableId).sort((a,b) => a.order - b.order);
    destTasks.splice(destination.index, 0, movedTask);

    const updatedDestTasks = destTasks.map((t, idx) => ({ ...t, order: idx }));
    
    const remainingTasks = newTasks.filter(t => t.status !== destination.droppableId);
    const finalTasks = [...remainingTasks, ...updatedDestTasks];
    
    setTasks(finalTasks);

    // Sync to server
    const itemsToUpdate = updatedDestTasks.map(t => ({ _id: t._id, status: t.status, order: t.order }));
    reorderMutation.mutate(itemsToUpdate);
  };

  const createTaskMutation = useMutation({
    mutationFn: async (newTaskData: any) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTaskData)
      });
      if (!res.ok) throw new Error("Tạo lỗi");
      return res.json();
    },
    onSuccess: () => {
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskPriority("medium");
      setNewTaskAssignee("unassigned");
      setNewTaskTeamAssignees([]);
      setNewTaskDeadline("");
      setNewSendEmail(true);
      setIsCreating(false);
      toast.success("Tạo thành công");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Tạo lỗi")
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      toast.error("Vui lòng nhập tên công việc");
      return;
    }
    if (!newTaskPriority) {
      toast.error("Vui lòng chọn mức độ ưu tiên");
      return;
    }
    if (newTaskAssignee === "unassigned") {
      toast.error("Vui lòng chọn người phụ trách");
      return;
    }
    
    let assignees: string[] = [];
    if (newTaskAssignee === "team") {
      if (newTaskTeamAssignees.length === 0) {
        toast.error("Vui lòng chọn ít nhất một thành viên cho Team");
        return;
      }
      assignees = newTaskTeamAssignees;
    } else if (newTaskAssignee !== "unassigned") {
      assignees = [newTaskAssignee];
    }

    if (!newTaskDeadline) {
      toast.error("Vui lòng chọn hạn chót");
      return;
    }
    
    createTaskMutation.mutate({ 
      title: newTaskTitle,
      description: newTaskDescription,
      priority: newTaskPriority,
      assignees: assignees.length > 0 ? assignees : undefined,
      deadline: newTaskDeadline || undefined,
      sendEmail: newSendEmail
    });
  };

  const handleAIAssign = async () => {
    if (!newTaskTitle.trim()) {
      toast.error("Vui lòng nhập tên công việc trước");
      return;
    }
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/tasks/ai-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle, description: newTaskDescription })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.assignees && data.assignees.length > 0) {
          if (data.assignees.length === 1) {
            setNewTaskAssignee(String(data.assignees[0]));
          } else {
            setNewTaskAssignee("team");
            setNewTaskTeamAssignees(data.assignees.map(String));
          }
          toast.success(`AI Đề xuất: ${data.name}`);
        } else {
          toast.info(data.message || "Không có đề xuất phù hợp");
        }
      } else {
        toast.error("Không thể lấy đề xuất AI");
      }
    } catch (e) {
      toast.error("Lỗi kết nối AI");
    } finally {
      setIsAiLoading(false);
    }
  };

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi khi xóa");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Đã xóa công việc");
      setIsDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Lỗi kết nối")
  });

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Bạn có chắc muốn xóa công việc này?")) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      const res = await fetch("/api/tasks/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds })
      });
      if (!res.ok) throw new Error("Lỗi khi xóa hàng loạt");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Đã xóa các công việc được chọn");
      setSelectedTaskIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Lỗi kết nối")
  });

  const handleBulkDelete = () => {
    if (selectedTaskIds.size === 0) return;
    if (confirm(`${t('confirmBulkDelete')} ${selectedTaskIds.size} ${t('selectedTasks')}?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedTaskIds));
    }
  };

  const handleOverdueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overdueReason.trim()) {
      toast.error(t('overdueReasonRequired'));
      return;
    }
    const { movedTask, destination, source } = pendingOverdueAction;
    
    // Optimistic Update
    const newTasks = Array.from(tasks);
    const movedTaskIndex = newTasks.findIndex(t => t._id === movedTask._id);
    if (movedTaskIndex !== -1) {
      newTasks.splice(movedTaskIndex, 1);
    }
    movedTask.status = "done";

    const destTasks = newTasks.filter(t => t.status === "done").sort((a,b) => a.order - b.order);
    destTasks.splice(destination.index, 0, movedTask);
    const updatedDestTasks = destTasks.map((t, idx) => ({ ...t, order: idx }));
    
    const remainingTasks = newTasks.filter(t => t.status !== "done");
    const finalTasks = [...remainingTasks, ...updatedDestTasks];
    setTasks(finalTasks);
    setIsOverdueModalOpen(false);

    try {
      await addCommentMutation.mutateAsync({ taskId: movedTask._id, content: `**${t('overdueReasonLabel')}:** ${overdueReason}` });
      const itemsToUpdate = updatedDestTasks.map(t => ({ _id: t._id, status: t.status, order: t.order }));
      reorderMutation.mutate(itemsToUpdate);
      toast.success(t('overdueSuccessMsg'));
    } catch (e) {
      toast.error("Lỗi khi cập nhật");
    }
    setOverdueReason("");
    setPendingOverdueAction(null);
  };

  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSelectAll = (taskIds: string[]) => {
    setSelectedTaskIds(prev => {
      if (prev.size === taskIds.length && taskIds.every(id => prev.has(id))) {
        return new Set();
      }
      return new Set(taskIds);
    });
  };

  const addCommentMutation = useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string, content: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Lỗi gửi bình luận");
      return res.json();
    },
    onSuccess: () => {
      setCommentContent("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => toast.error("Lỗi gửi bình luận")
  });

  const handlePostComment = () => {
    if (!commentContent.trim() || !selectedTask) return;
    addCommentMutation.mutate({ taskId: selectedTask._id, content: commentContent });
  };

  const updateProgressMutation = useMutation({
    mutationFn: async ({ taskId, progress }: { taskId: string, progress: number }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress })
      });
      if (!res.ok) throw new Error("Lỗi cập nhật tiến độ");
      return res.json();
    },
    onError: () => {
      toast.error("Không thể cập nhật tiến độ");
      queryClient.invalidateQueries({ queryKey: ["tasks"] }); // revert optimistic UI
    }
  });

  const handleUpdateProgress = (taskId: string, newProgress: number) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, progress: newProgress } : t));
    if (selectedTask && selectedTask._id === taskId) {
      setSelectedTask({ ...selectedTask, progress: newProgress });
    }
    
    // Optimistically update cache to prevent serverTasks from reverting the state
    queryClient.setQueryData(["tasks"], (old: Task[] | undefined) => {
      if (!old) return old;
      return old.map(t => t._id === taskId ? { ...t, progress: newProgress } : t);
    });

    updateProgressMutation.mutate({ taskId, progress: newProgress });
  };

  // Sync localProgress when opening a task detail
  useEffect(() => {
    if (selectedTask) {
      setLocalProgress(selectedTask.progress || 0);
    }
  }, [selectedTask?._id]);

  useEffect(() => {
    if (selectedTask && serverTasks) {
      const updated = serverTasks.find(t => t._id === selectedTask._id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTask)) {
        setSelectedTask(updated);
      }
    }
  }, [serverTasks, selectedTask]);

  if (!isMounted) return null;
  if (tasksLoading) return <div className="flex h-full items-center justify-center text-muted-foreground">{t('loading')}</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">KTD Workspace</h1>
        
        <div className="flex items-center gap-4">
          {/* Language Toggle */}
          <Button variant="outline" size="sm" onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')} className="h-9 px-3">
            {lang === 'vi' ? 'EN' : 'VI'}
          </Button>

          {/* Filter & Sort Controls */}
          <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-lg border border-border">
            <span className="text-xs font-semibold text-muted-foreground pl-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </span>
            <Select value={filterStatus} onValueChange={(val) => val && setFilterStatus(val)}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                <SelectValue placeholder={t('all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="todo">{t('todo')}</SelectItem>
                <SelectItem value="in-progress">{t('inProgress')}</SelectItem>
                <SelectItem value="done">{t('done')}</SelectItem>
                <SelectItem value="overdue">{t('overdue')}</SelectItem>
              </SelectContent>
            </Select>

            {filterStatus && filterStatus !== "all" && (
              <>
                <Select value={filterSortBy} onValueChange={(val) => val && setFilterSortBy(val)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder={t('sortByDeadline')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deadline">{t('sortByDeadline')}</SelectItem>
                    <SelectItem value="progress">{t('sortByProgress')}</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterUser} onValueChange={(val) => val && setFilterUser(val)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                    <SelectValue placeholder="All users">
                      {filterUser === "all" ? t('all') : users.find(u => u._id === filterUser)?.name || filterUser}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('all')}</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterSortBy("");
                    setFilterUser("all");
                  }}
                  className="h-8 text-xs"
                >
                  {t('clearFilter')}
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(userRole === "admin" || userRole === "vice_admin") && (
              <Button variant="outline" onClick={() => {
                const overdue = tasks.filter(t => isTaskOverdue(t));
                setOverdueTasksList(overdue);
                setSelectedReminderTaskIds(new Set(overdue.map(t => t._id)));
                setIsAdminReminderOpen(true);
              }}>
                {t('sendRemindersBtn')}
              </Button>
            )}
            {selectedTaskIds.size > 0 && (userRole === "admin" || userRole === "vice_admin") && (
              <Button variant="destructive" onClick={handleBulkDelete}>
                {t('delete')} {selectedTaskIds.size} {t('selectedTasks')}
              </Button>
            )}
            <Button onClick={() => setIsCreating(true)}>+ {t('addTask')}</Button>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('createTask')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('taskName')}</Label>
                  <Input 
                    placeholder={`${t('taskName')}...`} 
                    value={newTaskTitle} 
                    onChange={e => setNewTaskTitle(e.target.value)} 
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('taskDesc')}</Label>
                  <Textarea 
                    placeholder={`${t('taskDesc')}...`} 
                    value={newTaskDescription} 
                    onChange={e => setNewTaskDescription(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('priority')}</Label>
                    <Select value={newTaskPriority} onValueChange={(val) => val && setNewTaskPriority(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('priority')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('low')}</SelectItem>
                        <SelectItem value="medium">{t('medium')}</SelectItem>
                        <SelectItem value="high">{t('high')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('assignee')}</Label>
                    <div className="flex gap-2">
                      <Select value={newTaskAssignee} onValueChange={(val) => val && setNewTaskAssignee(val)}>
                        <SelectTrigger className="flex-1">
                          <span className="truncate">
                            {newTaskAssignee === "unassigned" 
                              ? t('unassigned') 
                              : newTaskAssignee === "team"
                                ? "Team"
                                : users.find(u => String(u._id) === newTaskAssignee)?.name || newTaskAssignee}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">{t('unassigned')}</SelectItem>
                          <SelectItem value="team">Team (Nhiều người)</SelectItem>
                          {users.map(u => (
                            <SelectItem key={u._id} value={String(u._id)}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {newTaskAssignee === "team" && (
                    <div className="space-y-2 col-span-2">
                      <Label>Chọn thành viên Team</Label>
                      <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-[150px] overflow-y-auto">
                        {users.map(u => (
                          <div key={u._id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`team-${u._id}`}
                              checked={newTaskTeamAssignees.includes(String(u._id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTaskTeamAssignees(prev => [...prev, String(u._id)]);
                                } else {
                                  setNewTaskTeamAssignees(prev => prev.filter(id => id !== String(u._id)));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor={`team-${u._id}`} className="text-sm font-normal cursor-pointer">
                              {u.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>{t('deadline')}</Label>
                    <Input 
                      type="datetime-local"
                      value={newTaskDeadline}
                      onChange={e => setNewTaskDeadline(e.target.value)}
                      min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="sendEmail" 
                    checked={newSendEmail} 
                    onChange={(e) => setNewSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                    {t('sendEmailLabel')}
                  </Label>
                </div>

                <Button type="button" variant="outline" className="w-full" onClick={handleAIAssign} disabled={isAiLoading}>
                  {isAiLoading ? t('loading') : `🤖 ${t('autoSuggest')}`}
                </Button>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? t('loading') : t('createBtn')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {(!filterStatus || filterStatus === "all" || filterStatus === "none") ? (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 h-full overflow-x-auto pb-4">
          {COLUMNS.map(column => {
            const columnTasks = tasks
              .filter(t => t.status === column.id)
              .filter(t => {
                if (filterUser === "all") return true;
                if (!t.assignees) return false;
                return t.assignees.some(a => {
                  const aid = typeof a === "string" ? a : (a as any)._id;
                  return aid === filterUser;
                });
              })
              .sort((a,b) => a.order - b.order);
            
            return (
              <div key={column.id} className="flex-shrink-0 w-80 bg-muted/40 rounded-xl p-4 flex flex-col">
                <h3 className={`font-semibold mb-4 text-sm flex items-center gap-2 rounded-full px-4 py-3 text-white ${column.color}`}>
                  <div className="bg-white/20 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 border-0 text-[11px]">
                    {columnTasks.length}
                  </div>
                  {column.title}
                </h3>
                
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 overflow-y-auto space-y-3 min-h-[150px] p-1 ${snapshot.isDraggingOver ? "bg-muted/60 rounded-lg" : ""}`}
                    >
                      {columnTasks.map((task, index) => {
                        const isAssignedToMe = task.assignees?.some(a => (typeof a === "string" ? a : (a as any)._id) === userId) || false;
                        const isAdmin = userRole === "admin" || userRole === "vice_admin";
                        const canDrag = isAdmin || isAssignedToMe;
                        
                        return (
                        <Draggable key={task._id} draggableId={task._id} index={index} isDragDisabled={!canDrag}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TaskCard 
                                task={task}
                                users={users}
                                userRole={userRole}
                                isSelected={selectedTaskIds.has(task._id)}
                                isDragging={snapshot.isDragging}
                                isOverdue={isTaskOverdue(task)}
                                onSelect={toggleSelectTask}
                                onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                              />
                            </div>
                          )}
                        </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
      ) : (() => {
        let filtered = tasks;
        if (filterStatus === "overdue") {
          filtered = tasks.filter(t => isTaskOverdue(t));
        } else if (filterStatus !== "all") {
          filtered = tasks.filter(t => t.status === filterStatus);
        }
        filtered = filtered.filter(t => {
          if (filterUser === "all") return true;
          if (!t.assignees) return false;
          return t.assignees.some(a => {
            const aid = typeof a === "string" ? a : (a as any)._id;
            return aid === filterUser;
          });
        });
        if (filterSortBy === "deadline") {
          filtered.sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          });
        } else if (filterSortBy === "progress") {
          filtered.sort((a, b) => (b.progress || 0) - (a.progress || 0));
        }

        return (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex-1 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs sticky top-0 z-10 shadow-sm">
                <tr>
                  {(userRole === "admin" || userRole === "vice_admin") && (
                    <th className="px-6 py-3 font-medium w-12">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-destructive focus:ring-destructive cursor-pointer"
                        checked={filtered.length > 0 && filtered.every(t => selectedTaskIds.has(t._id))}
                        onChange={() => toggleSelectAll(filtered.map(t => t._id))}
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 font-medium">{t('taskName')}</th>
                  <th className="px-6 py-3 font-medium">{t('assignee')}</th>
                  <th className="px-6 py-3 font-medium">{t('priority')}</th>
                  <th className="px-6 py-3 font-medium">{t('deadline')}</th>
                  <th className="px-6 py-3 font-medium">{t('progress')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(task => {
                  let assigneesUI = <span className="text-muted-foreground">{t('unassigned')}</span>;
                  if (task.assignees && task.assignees.length > 0) {
                    assigneesUI = (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center -space-x-2">
                          {task.assignees.map((assignee: any, idx: number) => {
                            const obj = typeof assignee === 'string' ? users.find(u => String(u._id) === assignee) : assignee;
                            const name = obj?.name || String(assignee);
                            return obj?.avatar ? (
                              <Avatar key={idx} className="w-6 h-6 border shadow-sm">
                                <AvatarImage src={obj.avatar} />
                              </Avatar>
                            ) : (
                              <div key={idx} className="w-6 h-6 rounded-full bg-muted border shadow-sm flex items-center justify-center overflow-hidden z-10" title={name}>
                                <span className="text-[8px] font-medium">{name.substring(0,2).toUpperCase()}</span>
                              </div>
                            );
                          })}
                        </div>
                        {task.assignees.length === 1 && (
                          <span className="text-muted-foreground hidden sm:inline">
                            {typeof task.assignees[0] === 'string' ? users.find(u => String(u._id) === task.assignees![0])?.name || String(task.assignees[0]) : (task.assignees[0] as any).name}
                          </span>
                        )}
                        {task.assignees.length > 1 && (
                          <span className="text-muted-foreground hidden sm:inline text-xs">
                            Team ({task.assignees.length})
                          </span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <tr key={task._id} className={`hover:bg-muted/30 transition-colors cursor-pointer group ${isTaskOverdue(task) ? 'bg-destructive/10' : ''}`} onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}>
                      {(userRole === "admin" || userRole === "vice_admin") && (
                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-destructive focus:ring-destructive cursor-pointer"
                            checked={selectedTaskIds.has(task._id)}
                            onChange={() => toggleSelectTask(task._id)}
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 font-medium text-foreground max-w-[300px] truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </td>
                      <td className="px-6 py-4">
                        {assigneesUI}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                          {task.priority === 'high' ? t('high') : task.priority === 'medium' ? t('medium') : t('low')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {task.deadline ? new Date(task.deadline).toLocaleString("vi-VN", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted rounded-full h-2 max-w-[100px] overflow-hidden">
                            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${task.progress || 0}%` }}></div>
                          </div>
                          <span className="text-xs font-medium min-w-[2rem] text-right">{task.progress || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={(userRole === "admin" || userRole === "vice_admin") ? 6 : 5} className="px-6 py-12 text-center text-muted-foreground">
                      {t('noTasks')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Task Detail Modal */}
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
      {/* Overdue Reason Modal */}
      <OverdueModal
        isOpen={isOverdueModalOpen}
        onOpenChange={setIsOverdueModalOpen}
        onSubmit={(reason) => {
          setOverdueReason(reason);
          handleOverdueSubmit({ preventDefault: () => {} } as React.FormEvent);
        }}
      />
      {/* Admin Reminder Modal */}
      <AdminReminderDialog 
        isOpen={isAdminReminderOpen}
        onOpenChange={setIsAdminReminderOpen}
        overdueTasksList={overdueTasksList}
      />
    </div>
  );
}
