"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";

interface OverdueModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
}

export function OverdueModal({ isOpen, onOpenChange, onSubmit }: OverdueModalProps) {
  const { t } = useLanguage();
  const [overdueReason, setOverdueReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overdueReason.trim()) {
      toast.error(t('overdueReasonRequired'));
      return;
    }
    onSubmit(overdueReason);
    setOverdueReason("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOverdueReason("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse"></span>
            {t('overdueTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
  );
}
