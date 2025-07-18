export type TaskStatus = "new" | "readded" | "postponed" | "completed" | "deleted";

export type Task = {
  id: string;
  title: string;
  createdAt: Date;
  // updatedAt: Date;
  status: TaskStatus;
  postponedUntil?: Date;
  // completedAt?: Date;
  list: ListType;
  zero?: boolean;
};

export type ListType = "open" | "closed" | "review" | "postponed" | "deleted";

export type TaskList = {
  id: string;
  // parts: {
  //   open: Task[];
  //   closed: Task[];
  //   review: Task[];
  //   postponed: Task[];
  // };
  tasks: Task[];
  current: {
    list: ListType;
    actionedCount: number;
  };
};

export type UserAction =
  | { type: "Next" }
  | { type: "AddTask"; title: string }
  | { type: "ReaddTask"; id: string }
  | { type: "CompleteTask"; id: string }
  | { type: "DeleteTask"; id: string }
  | { type: "ZeroTask"; id: string };

export type TaskListAction =
  | { type: "AddTask"; task: Task }
  | { type: "ReaddTask"; id: string }
  | { type: "CompleteTask"; id: string }
  | { type: "ChangeCurrentList"; newCurrent: ListType }
  | { type: "MoveAllTasks"; from: ListType; to: ListType }
  | { type: "DeleteAllTasks"; from: ListType }
  | { type: "MarkDeleteTask"; id: string }
  | { type: "ZeroTask"; id: string };
