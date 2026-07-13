"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function NotificationList() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ["unreadNotifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch all notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: open,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "PUT" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadNotifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = unreadData?.count || 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative rounded-full hover:bg-accent cursor-pointer p-2 outline-none">
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-auto p-1 text-primary hover:text-primary/80"
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsReadMutation.mutate();
                }}
                disabled={markAllAsReadMutation.isPending}
              >
                Đánh dấu đã đọc
              </Button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Đang tải...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Không có thông báo nào.
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-1">
              {notifications.map((notif: any) => (
                <div 
                  key={notif._id}
                  className={`flex flex-col gap-1 rounded-md p-3 text-sm transition-colors hover:bg-muted ${!notif.read ? 'bg-primary/5' : ''}`}
                  onClick={() => {
                    if (!notif.read) markAsReadMutation.mutate(notif._id);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`font-semibold ${!notif.read ? 'text-primary' : ''}`}>
                      {notif.title}
                    </span>
                    {!notif.read && <span className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notif.content}
                  </p>
                  <span className="text-[10px] text-muted-foreground/80 mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: vi })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
