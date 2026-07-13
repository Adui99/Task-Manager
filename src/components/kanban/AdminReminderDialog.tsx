"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import { Task } from "./types";

interface AdminReminderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  overdueTasksList: Task[];
}

export function AdminReminderDialog({ isOpen, onOpenChange, overdueTasksList }: AdminReminderDialogProps) {
  const { t, lang } = useLanguage();
  const [selectedReminderTaskIds, setSelectedReminderTaskIds] = useState<Set<string>>(new Set());
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedReminderTaskIds(new Set(overdueTasksList.map(t => t._id)));
    }
  }, [isOpen, overdueTasksList]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                            ? `Đã gửi thông báo cho ${data.usersNotified} người dùng.` 
                            : `Sent notifications to ${data.usersNotified} users.`
                        );
                        onOpenChange(false);
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
  );
}
