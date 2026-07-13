"use client";

import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/components/LanguageProvider";
import { Task } from "./types";

interface TaskCardProps {
  task: Task;
  users: any[];
  userRole?: string;
  isSelected: boolean;
  isDragging: boolean;
  isOverdue: boolean;
  onSelect: (taskId: string) => void;
  onClick: () => void;
}

export function TaskCard({
  task,
  users,
  userRole,
  isSelected,
  isDragging,
  isOverdue,
  onSelect,
  onClick
}: TaskCardProps) {
  const { t } = useLanguage();

  return (
    <Card 
      onClick={onClick}
      className={`shadow-sm ${isDragging ? "shadow-xl ring-2 ring-primary/40 rotate-3 scale-105" : ""} ${isOverdue ? 'border-destructive' : ''} transition-all duration-200`}
    >
      <CardContent className="p-4 cursor-grab active:cursor-grabbing bg-background relative group">
        {(userRole === "admin" || userRole === "vice_admin") && (
          <div 
            className={`absolute top-3 right-3 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={e => e.stopPropagation()}
          >
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-gray-300 text-destructive focus:ring-destructive cursor-pointer"
              checked={isSelected}
              onChange={() => onSelect(task._id)}
            />
          </div>
        )}
        <div className="flex justify-between items-start mb-2 pr-6">
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="text-[10px] uppercase">
              {task.priority}
            </Badge>
            {isOverdue && (
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
  );
}
