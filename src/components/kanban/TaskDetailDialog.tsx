"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/components/LanguageProvider";
import { Task } from "./types";

interface TaskDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTask: Task | null;
  users: any[];
  userId?: string;
  userRole?: string;
  onDeleteTask: (taskId: string) => void;
  onUpdateProgress: (taskId: string, progress: number) => void;
  onAddComment: (taskId: string, content: string) => void;
  isDeleting: boolean;
  isAddingComment: boolean;
}

export function TaskDetailDialog({
  isOpen,
  onOpenChange,
  selectedTask,
  users,
  userId,
  userRole,
  onDeleteTask,
  onUpdateProgress,
  onAddComment,
  isDeleting,
  isAddingComment
}: TaskDetailDialogProps) {
  const { t } = useLanguage();
  const [localProgress, setLocalProgress] = useState<number>(0);
  const [commentContent, setCommentContent] = useState("");

  useEffect(() => {
    if (selectedTask) {
      setLocalProgress(selectedTask.progress || 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask?._id, selectedTask?.progress]);

  const handlePostComment = () => {
    if (!commentContent.trim() || !selectedTask) return;
    onAddComment(selectedTask._id, commentContent);
    setCommentContent("");
  };

  if (!selectedTask) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh] overflow-hidden">
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
                      onPointerUp={() => onUpdateProgress(selectedTask._id, localProgress)}
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
                        if (commentContent.trim() && !isAddingComment) {
                          handlePostComment();
                        }
                      }
                    }}
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <Button onClick={handlePostComment} disabled={isAddingComment || !commentContent.trim()}>
                  {t('post')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {userRole === "admin" && (
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="destructive" onClick={() => onDeleteTask(selectedTask._id)} disabled={isDeleting}>
              {t('deleteTask')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
