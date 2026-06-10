export type SystemType = "af4" | "simple";

export type TaskStatus = "new" | "postponed" | "completed" | "deleted";

interface BaseTask {
  id: string;
  title: string;
  createdAt: Date;
  // updatedAt: Date;
  completedAt?: Date;
  deletedAt?: Date;
  list: TaskListType;
  zero?: boolean;
}
export type PostponedTask = BaseTask & {
  status: "postponed";
  postponedUntil: Date;
};
export type AdditionalStatus = "readded" | "postponed" | "later";
export type CompletedTask = BaseTask & {
  status: "completed";
  additionalStatus?: AdditionalStatus;
  completedAt: Date;
};
export type DeletedTask = BaseTask & {
  status: "deleted";
  deletedAt: Date;
};
export type NewTask = BaseTask & {
  status: "new";
};

export type Task = NewTask | PostponedTask | CompletedTask | DeletedTask;

export type TaskListType = "open" | "open-new" | "closed" | "review" | "later" | "deleted";
export type CurrentListType = Exclude<TaskListType, "open-new" | "later">;
export type ViewListType = CurrentListType | "later";
export type ListType = TaskListType;

export interface BaseCurrentList {
  actionedCount: number;
  showNext: boolean;
  willBeMarkedForReview?: boolean;
  restoreFocus?: boolean;
}

type CurrentOpenList = BaseCurrentList & {
  list: "open";
};
type CurrentClosedList = BaseCurrentList & {
  list: "closed";
  willBeMarkedForReview: boolean;
};
type CurrentReviewList = BaseCurrentList & {
  list: "review";
  showNext: true;
};
type CurrentDeletedList = BaseCurrentList & {
  list: "deleted";
  showNext: false;
};
export type CurrentList =
  | CurrentOpenList
  | CurrentClosedList
  | CurrentReviewList
  | CurrentDeletedList;

export interface TaskList {
  id: string;
  tasks: Task[];
  current: CurrentList;
  system?: SystemType;
}

export type UserAction =
  | { type: "Next" }
  | { type: "AddTask"; title: string }
  | { type: "AddPostponedTask"; title: string }
  | { type: "ReaddTask"; id: string; title?: string }
  | { type: "PostponeTask"; id: string; title?: string }
  | { type: "LaterTask"; id: string }
  | { type: "CompleteTask"; id: string }
  | { type: "DeleteTask"; id: string }
  | { type: "ZeroTask"; id: string }
  | { type: "Cleanup"; now: Date };
