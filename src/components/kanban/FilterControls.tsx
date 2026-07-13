"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/LanguageProvider";

interface FilterControlsProps {
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterSortBy: string;
  setFilterSortBy: (val: string) => void;
  filterUser: string;
  setFilterUser: (val: string) => void;
  users: any[];
}

export function FilterControls({
  filterStatus,
  setFilterStatus,
  filterSortBy,
  setFilterSortBy,
  filterUser,
  setFilterUser,
  users
}: FilterControlsProps) {
  const { t } = useLanguage();

  return (
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
  );
}
