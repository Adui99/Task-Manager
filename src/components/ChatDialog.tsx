"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageProvider";
import { X } from "lucide-react";

export function ChatDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Not logged in");
      return res.json();
    },
    enabled: open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: open,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedUser?._id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const res = await fetch(`/api/messages?userId=${selectedUser._id}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedUser && open,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedUser._id, content }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUser?._id] });
      setMessage("");
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !selectedUser || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message);
  };

  const otherUsers = users.filter((u: any) => u._id !== currentUser?._id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[700px] flex max-h-[80vh] min-h-[60vh] gap-0 p-0 overflow-hidden">
        {/* Left Column: User List */}
        <div className="w-1/3 border-r bg-muted/20 flex flex-col h-full">
          <div className="p-4 border-b font-semibold bg-muted/40">
            {t("messages")}
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {otherUsers.map((u: any) => (
                <button
                  key={u._id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                    selectedUser?._id === u._id ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  <Avatar className="w-10 h-10 border">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback>{u.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-background">
          {selectedUser ? (
            <>
              <div className="p-4 border-b flex items-center gap-3 bg-muted/10 shadow-sm z-10 relative">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback>{selectedUser.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="font-medium text-sm flex-1">{selectedUser.name}</div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full" 
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    {t("noMessages")}
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isMine = msg.sender_id === currentUser?._id;
                    return (
                      <div key={msg._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className={`text-[10px] mt-1 opacity-70 ${isMine ? "text-right" : "text-left"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="p-3 border-t bg-muted/10 flex gap-2 items-end">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("typeMessage")}
                  className="min-h-[40px] max-h-[120px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button 
                  onClick={handleSend} 
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="mb-1"
                >
                  {t("send")}
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              {t("selectUserToChat")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
