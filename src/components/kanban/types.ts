export type Task = {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  order: number;
  progress?: number;
  deadline?: string;
  assignees?: { _id: string; name: string; avatar?: string }[] | string[];
  comments?: { _id: string; user_id: { _id: string; name: string; avatar?: string }; content: string; createdAt: string }[];
  createdAt?: string;
};
