"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "vi" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  vi: {
    // Kanban Board
    all: "Tất cả",
    todo: "Cần làm",
    inProgress: "Đang tiến hành",
    done: "Đã xong",
    sortByDeadline: "Sắp xếp: Deadline",
    sortByProgress: "Sắp xếp: Tiến độ",
    clearFilter: "Xóa lọc",
    addTask: "Thêm công việc",
    createTask: "Tạo công việc mới",
    taskName: "Tên công việc",
    taskDesc: "Mô tả công việc",
    priority: "Mức độ",
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
    assignee: "Người thực hiện",
    unassigned: "Chưa phân công",
    deadline: "Deadline",
    autoSuggest: "Gợi ý tự động AI",
    createBtn: "Tạo công việc",
    cancel: "Hủy",
    progress: "Tiến độ công việc",
    comments: "Bình luận",
    addComment: "Viết bình luận...",
    post: "Gửi",
    loading: "Đang tải bảng công việc...",
    noTasks: "Không có công việc nào",
    desc: "Mô tả",
    unknownUser: "Người dùng không xác định",
    noComments: "Chưa có bình luận nào.",
    deleteTask: "Xóa công việc",
    
    // Sidebar
    taskBoard: "Bảng công việc",
    hrManagement: "Quản lý nhân sự",
    settings: "Cài đặt",
    logout: "Đăng xuất",
    toggleTheme: "Đổi giao diện",

    // Admin
    addUser: "Thêm nhân sự",
    createAccount: "Thêm tài khoản mới",
    name: "Họ và tên",
    email: "Email",
    password: "Mật khẩu",
    role: "Vai trò",
    user: "Người dùng",
    admin: "Quản trị viên",
    skills: "Kỹ năng (cách nhau dấu phẩy)",
    save: "Lưu",
    action: "Thao tác",
    edit: "Sửa",
    delete: "Xóa",
    confirmDelete: "Bạn có chắc chắn muốn xóa nhân sự này?",

    // Overdue & Bulk actions
    overdue: "Quá hạn",
    selectedTasks: "công việc đã chọn",
    confirmBulkDelete: "Bạn có chắc muốn xóa",
    sendRemindersBtn: "✉️ Nhắc nhở",
    overdueTitle: "Công việc trễ hạn",
    overdueDescription: "Công việc này đã trễ hạn so với deadline. Vui lòng nhập lý do hoàn thành trễ trước khi chuyển sang trạng thái",
    overdueReasonLabel: "Lý do trễ hạn",
    overduePlaceholder: "Ví dụ: Cần chờ phản hồi từ đối tác...",
    confirmBtn: "Xác nhận",
    overdueSuccessMsg: "Đã ghi nhận hoàn thành trễ hạn",
    overdueReasonRequired: "Vui lòng nhập lý do trễ hạn",
    sendEmailLabel: "Gửi thông báo qua Email",
    adminReminderTitle: "Quản lý nhắc nhở quá hạn",
    noOverdueTasks: "Hiện không có công việc nào bị quá hạn.",
    selectTasksToSend: "Chọn các công việc để gửi email nhắc nhở:",
    sendSelectedReminders: "Gửi email",
    selectAll: "Chọn tất cả",
    deselectAll: "Bỏ chọn tất cả",

    // Chat
    messages: "Tin nhắn",
    noMessages: "Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!",
    typeMessage: "Nhập tin nhắn...",
    send: "Gửi",
    selectUserToChat: "Chọn một người để bắt đầu trò chuyện",
  },
  en: {
    // Kanban Board
    all: "All",
    todo: "To Do",
    inProgress: "In Progress",
    done: "Done",
    sortByDeadline: "Sort by: Deadline",
    sortByProgress: "Sort by: Progress",
    clearFilter: "Clear",
    addTask: "Add Task",
    createTask: "Create New Task",
    taskName: "Task Name",
    taskDesc: "Task Description",
    priority: "Priority",
    low: "Low",
    medium: "Medium",
    high: "High",
    assignee: "Assignee",
    unassigned: "Unassigned",
    deadline: "Deadline",
    autoSuggest: "AI Auto Suggest",
    createBtn: "Create Task",
    cancel: "Cancel",
    progress: "Task Progress",
    comments: "Comments",
    addComment: "Write a comment...",
    post: "Post",
    loading: "Loading board...",
    noTasks: "No tasks found",
    desc: "Description",
    unknownUser: "Unknown user",
    noComments: "No comments yet.",
    deleteTask: "Delete Task",
    
    // Sidebar
    taskBoard: "Task Board",
    hrManagement: "HR Management",
    settings: "Settings",
    logout: "Logout",
    toggleTheme: "Toggle Theme",

    // Admin
    addUser: "Add User",
    createAccount: "Create New Account",
    name: "Full Name",
    email: "Email",
    password: "Password",
    role: "Role",
    user: "User",
    admin: "Admin",
    skills: "Skills (comma separated)",
    save: "Save",
    action: "Actions",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this user?",

    // Overdue & Bulk actions
    overdue: "Overdue",
    selectedTasks: "selected tasks",
    confirmBulkDelete: "Are you sure you want to delete",
    sendRemindersBtn: "✉️ Reminders",
    overdueTitle: "Overdue Task",
    overdueDescription: "This task is past its deadline. Please enter a reason for the delay before moving it to",
    overdueReasonLabel: "Reason for delay",
    overduePlaceholder: "e.g., Waiting for partner's response...",
    confirmBtn: "Confirm",
    overdueSuccessMsg: "Overdue completion recorded",
    overdueReasonRequired: "Please enter a reason for the delay",
    sendEmailLabel: "Send Email Notification",
    adminReminderTitle: "Overdue Reminders Management",
    noOverdueTasks: "There are currently no overdue tasks.",
    selectTasksToSend: "Select tasks to send email reminders:",
    sendSelectedReminders: "Send emails",
    selectAll: "Select All",
    deselectAll: "Deselect All",

    // Chat
    messages: "Messages",
    noMessages: "No messages yet. Start chatting!",
    typeMessage: "Type a message...",
    send: "Send",
    selectUserToChat: "Select a user to start chatting",
  }
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "vi",
  setLang: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("vi");

  useEffect(() => {
    const saved = localStorage.getItem("app-lang");
    if (saved === "vi" || saved === "en") {
      setLang(saved as Language);
    }
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("app-lang", newLang);
  };

  const t = (key: string) => {
    return (translations[lang] as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
