"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  users: any[];
}

export function CreateTaskDialog({ isOpen, onOpenChange, users }: CreateTaskDialogProps) {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("unassigned");
  const [newTaskTeamAssignees, setNewTaskTeamAssignees] = useState<string[]>([]);
  const [newTaskDeadline, setNewTaskDeadline] = useState<string>("");
  const [newSendEmail, setNewSendEmail] = useState<boolean>(true);
  const [isAiLoading, setIsAiLoading] = useState(false);

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
      onOpenChange(false);
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
      const data = await res.json();
      if (res.ok) {
        if (data.priority) setNewTaskPriority(data.priority);
        if (data.assignee) {
          if (data.assignee === "team" && data.teamMembers) {
            setNewTaskAssignee("team");
            setNewTaskTeamAssignees(data.teamMembers);
          } else {
            setNewTaskAssignee(data.assignee);
          }
        }
        if (data.deadline) {
          const d = new Date(data.deadline);
          const offset = d.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0,16);
          setNewTaskDeadline(localISOTime);
        }
        toast.success(lang === "vi" ? "AI đã gợi ý xong!" : "AI suggestion completed!");
      } else {
        toast.error("Lỗi khi AI phân tích");
      }
    } catch(e) {
      toast.error("Lỗi khi kết nối AI");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
  );
}
