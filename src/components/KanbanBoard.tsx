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

type Task = {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  order: number;
  progress?: number;
  deadline?: string;
  assignees?: { _id: string; name: string; avatar?: string }[] | string[];
  comments?: { _id: string; user_id: { _id: string; name: string; avatar?: string }; content: string; createdAt: string }[];
  createdAt?: string;
};

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
                              <Card 
                                onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                                className={`shadow-sm ${snapshot.isDragging ? "shadow-xl ring-2 ring-primary/40 rotate-3 scale-105" : ""} ${isTaskOverdue(task) ? 'border-destructive' : ''} transition-all duration-200`}
                              >
                                <CardContent className="p-4 cursor-grab active:cursor-grabbing bg-background relative group">
                                  {(userRole === "admin" || userRole === "vice_admin") && (
                                    <div 
                                      className={`absolute top-3 right-3 z-10 transition-opacity ${selectedTaskIds.has(task._id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-gray-300 text-destructive focus:ring-destructive cursor-pointer"
                                        checked={selectedTaskIds.has(task._id)}
                                        onChange={() => toggleSelectTask(task._id)}
                                      />
                                    </div>
                                  )}
                                  <div className="flex justify-between items-start mb-2 pr-6">
                                    <div className="flex gap-1.5 flex-wrap">
                                      <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                                        {task.priority}
                                      </Badge>
                                      {isTaskOverdue(task) && (
                                        <Badge variant="destructive" className="text-[10px] animate-pulse">{t('overdue')}</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <h4 className="font-medium text-sm mb-1 line-clamp-2">{task.title}</h4>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                      {task.description}
                                    </p>
                                  )}
                                  
                                  <div className="mb-3 flex items-center gap-2">
                                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                      <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${task.progress || 0}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-medium min-w-[20px] text-right">{task.progress || 0}%</span>
                                  </div>
                                  
                                  <div className="flex justify-between items-end mt-3 min-h-[24px]">
                                    <div className="flex flex-col gap-1">
                                      {task.createdAt && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-md">
                                          <Calendar className="w-3 h-3" />
                                          <span>Giao: {new Date(task.createdAt).toLocaleString("vi-VN", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        </div>
                                      )}
                                      {task.deadline && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-md">
                                          <Calendar className="w-3 h-3" />
                                          <span>Hạn: {new Date(task.deadline).toLocaleString("vi-VN", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        </div>
                                      )}
                                    </div>
                                    {task.assignees && task.assignees.length > 0 && (
                                      <div className="flex justify-end items-center -space-x-2">
                                        {task.assignees.map((assignee: any, idx: number) => {
                                          const assigneeObj = typeof assignee === 'string' 
                                            ? users.find(u => String(u._id) === assignee) 
                                            : assignee;
                                          const assigneeName = assigneeObj?.name || String(assignee);
                                          
                                          return assigneeObj?.avatar ? (
                                            <Avatar key={idx} className="w-6 h-6 border-2 border-background shadow-sm">
                                              <AvatarImage src={assigneeObj.avatar} />
                                            </Avatar>
                                          ) : (
                                            <div key={idx} className="w-6 h-6 rounded-full bg-muted border-2 border-background shadow-sm flex items-center justify-center overflow-hidden z-10" title={assigneeName}>
                                              <span className="text-[8px] font-medium">{assigneeName.substring(0,2).toUpperCase()}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
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
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh] overflow-hidden">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedTask.title}</DialogTitle>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant={selectedTask.priority === 'high' ? 'destructive' : selectedTask.priority === 'medium' ? 'default' : 'secondary'} className="uppercase">
                    {selectedTask.priority}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {selectedTask.status}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto pr-4 mt-4 min-h-0">
                <div className="space-y-6">
                  {/* Info section */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedTask.assignees && selectedTask.assignees.length > 0 && (
                      <div>
                        <span className="text-muted-foreground block mb-1">{t('assignee')}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedTask.assignees.map((assignee: any, idx: number) => {
                            const assigneeObj = typeof assignee === 'string'
                              ? users.find(u => String(u._id) === assignee)
                              : assignee;
                            const assigneeName = assigneeObj?.name || String(assignee);
                            return (
                              <div key={idx} className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border">
                                {assigneeObj?.avatar ? (
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={assigneeObj.avatar} />
                                  </Avatar>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-muted border flex items-center justify-center overflow-hidden">
                                    <span className="text-[8px] font-medium">{assigneeName.substring(0,2).toUpperCase()}</span>
                                  </div>
                                )}
                                <span className="text-xs font-medium">{assigneeName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {selectedTask.createdAt && (
                      <div>
                        <span className="text-muted-foreground block mb-1">Giao việc</span>
                        <div className="flex items-center gap-2 font-medium">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(selectedTask.createdAt).toLocaleString("vi-VN", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </div>
                    )}
                    {selectedTask.deadline && (
                      <div>
                        <span className="text-muted-foreground block mb-1">{t('deadline')}</span>
                        <div className="flex items-center gap-2 font-medium">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(selectedTask.deadline).toLocaleString("vi-VN", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedTask.description && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">{t('desc')}</h4>
                      <p className="text-sm whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-sm">{t('progress')}</h4>
                      <span className="text-sm font-medium">{selectedTask.progress || 0}%</span>
                    </div>
                    {(() => {
                      const isAssignee = selectedTask.assignees?.some(a => (typeof a === "string" ? a : (a as any)._id) === userId);
                      const isAdmin = userRole === "admin" || userRole === "vice_admin";
                      const canEditProgress = isAdmin || isAssignee;
                      
                      return (
                        <div className="flex items-center gap-4">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            value={localProgress}
                            disabled={!canEditProgress}
                            onChange={(e) => setLocalProgress(parseInt(e.target.value))}
                            onPointerUp={() => handleUpdateProgress(selectedTask._id, localProgress)}
                            className={`flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer ${!canEditProgress ? 'opacity-50 cursor-not-allowed' : 'accent-primary'}`}
                          />
                        </div>
                      )
                    })()}
                  </div>

                  <Separator />

                  {/* Comments section */}
                  <div>
                    <h4 className="font-semibold text-sm mb-4">{t('comments')}</h4>
                    <div className="space-y-4 mb-4">
                      {selectedTask.comments?.map(comment => (
                        <div key={comment._id} className="flex gap-3">
                          {comment.user_id?.avatar && (
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarImage src={comment.user_id.avatar} />
                            </Avatar>
                          )}
                          <div className="flex-1 bg-muted/30 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-sm">{comment.user_id?.name || t('unknownUser')}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString("vi-VN")}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                      {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          {t('noComments')}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Textarea 
                          placeholder={`${t('addComment')}...`} 
                          value={commentContent}
                          onChange={e => setCommentContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (commentContent.trim() && !addCommentMutation.isPending) {
                                handlePostComment();
                              }
                            }
                          }}
                          className="min-h-[80px] resize-none"
                        />
                      </div>
                      <Button onClick={handlePostComment} disabled={addCommentMutation.isPending || !commentContent.trim()}>
                        {t('post')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {userRole === "admin" && (
                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <Button variant="destructive" onClick={() => handleDeleteTask(selectedTask._id)} disabled={deleteTaskMutation.isPending}>
                    {t('deleteTask')}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Overdue Reason Modal */}
      <Dialog open={isOverdueModalOpen} onOpenChange={(open) => { if (!open) { setIsOverdueModalOpen(false); setPendingOverdueAction(null); setOverdueReason(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <span className="w-2 h-2 bg-destructive rounded-full animate-pulse"></span>
              {t('overdueTitle')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOverdueSubmit} className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t('overdueDescription')} <strong>Done</strong>.
            </p>
            <div className="space-y-2">
              <Label>{t('overdueReasonLabel')}</Label>
              <Textarea 
                placeholder={t('overduePlaceholder')} 
                value={overdueReason}
                onChange={e => setOverdueReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit">{t('confirmBtn')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    {/* Admin Reminder Modal */}
      <Dialog open={isAdminReminderOpen} onOpenChange={setIsAdminReminderOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>✉️</span> {t('adminReminderTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {overdueTasksList.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noOverdueTasks')}</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t('selectTasksToSend')}</p>
                <div className="flex gap-2 mb-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedReminderTaskIds(new Set(overdueTasksList.map(t => t._id)))}>
                    {t('selectAll')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedReminderTaskIds(new Set())}>
                    {t('deselectAll')}
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                  {overdueTasksList.map(task => (
                    <div key={task._id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md">
                      <input 
                        type="checkbox"
                        id={`reminder-${task._id}`} 
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        checked={selectedReminderTaskIds.has(task._id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedReminderTaskIds);
                          if (e.target.checked) newSet.add(task._id);
                          else newSet.delete(task._id);
                          setSelectedReminderTaskIds(newSet);
                        }}
                      />
                      <label htmlFor={`reminder-${task._id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                        {task.title}
                        <span className="block text-xs text-muted-foreground mt-1 font-normal">
                          Assignees: {task.assignees?.map((a: any) => typeof a === "string" ? a : a.name).join(", ") || 'N/A'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    disabled={selectedReminderTaskIds.size === 0 || isSendingReminders}
                    onClick={async () => {
                      try {
                        setIsSendingReminders(true);
                        const res = await fetch("/api/tasks/send-reminders", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ taskIds: Array.from(selectedReminderTaskIds) })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          toast.success(
                            lang === 'vi' 
                              ? `Đã gửi ${data.usersNotified} email nhắc nhở.` 
                              : `Sent ${data.usersNotified} reminder emails.`
                          );
                          setIsAdminReminderOpen(false);
                        } else {
                          toast.error(data.message || "Error sending reminders");
                        }
                      } catch(e) {
                        toast.error("Error sending reminders");
                      } finally {
                        setIsSendingReminders(false);
                      }
                    }}
                  >
                    {isSendingReminders ? t('loading') : t('sendSelectedReminders')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
