"use client";

import { Home, Users, Settings, Moon, Sun, LayoutDashboard, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { ChatDialog } from "./ChatDialog";
import { MessageCircle } from "lucide-react";

export function AppSidebar({ userRole }: { userRole: string | undefined }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useLanguage();
  const [chatOpen, setChatOpen] = useState(false);

  const items = [
    {
      title: t('taskBoard'),
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: t('hrManagement'),
      url: "/admin",
      icon: Users,
      adminOnly: true,
    },
  ];

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <Sidebar className="border-r border-r-border/50 [&_[data-slot=sidebar-inner]]:bg-white dark:[&_[data-slot=sidebar-inner]]:bg-card [&_[data-slot=sidebar-inner]]:text-slate-900 dark:[&_[data-slot=sidebar-inner]]:text-card-foreground">
      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 mb-6 mt-4 flex items-center gap-3">
            <div className="w-14 h-14 shrink-0 flex items-center justify-center">
              <img src="/logo.png" alt="KTD Logo" className="w-full h-full object-contain" onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="bg-indigo-600 text-white w-full h-full rounded flex items-center justify-center text-xl font-black tracking-wider">KD</div>';
              }} />
            </div>
            <span className="text-[13px] font-bold text-foreground uppercase tracking-[0.15em] truncate">Key To Destiny</span>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 mt-4">
              {items.map((item) => {
                if (item.adminOnly && userRole !== "admin" && userRole !== "vice_admin") return null;
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      isActive={isActive}
                      render={<Link href={item.url} />}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                      className={`hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-900 dark:hover:text-card-foreground text-slate-600 dark:text-muted-foreground transition-colors py-5 ${isActive ? "bg-slate-100 text-slate-900 dark:bg-muted dark:text-card-foreground font-semibold" : ""}`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => {
                    setChatOpen(true);
                    if (isMobile) setOpenMobile(false);
                  }}
                  className="hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-900 dark:hover:text-card-foreground text-slate-600 dark:text-muted-foreground transition-colors py-5"
                >
                  <div className="flex items-center gap-3 w-full">
                    <MessageCircle className="w-5 h-5" />
                    <span>{t('messages')}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mb-4 space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              render={<Link href="/settings" />}
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
              className="hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-900 dark:hover:text-card-foreground text-slate-600 dark:text-muted-foreground py-5 transition-colors"
            >
              <div className="flex items-center gap-3 w-full">
                <Settings className="w-5 h-5" />
                <span>{t('settings')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hover:bg-slate-100 dark:hover:bg-muted hover:text-slate-900 dark:hover:text-card-foreground text-slate-600 dark:text-muted-foreground py-5 transition-colors"
            >
              <div className="flex items-center gap-3 w-full">
                {mounted && theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span>{t('toggleTheme')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 py-5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full">
                <LogOut className="w-5 h-5" />
                <span>{t('logout')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <ChatDialog open={chatOpen} onOpenChange={setChatOpen} />
    </Sidebar>
  );
}
