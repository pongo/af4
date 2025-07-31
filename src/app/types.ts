export type SystemType = "af4" | "simple";

export type TaskStatus = "new" | "postponed" | "completed" | "deleted";

type BaseTask = {
  id: string;
  title: string;
  createdAt: Date;
  // updatedAt: Date;
  completedAt?: Date;
  deletedAt?: Date;
  list: ListType;
  zero?: boolean;
};
type PostponedTask = BaseTask & {
  status: "postponed";
  postponedUntil: Date;
};
export type AdditionalStatus = "readded" | "postponed";
export type CompletedTask = BaseTask & {
  status: "completed";
  additionalStatus?: AdditionalStatus;
  completedAt: Date;
};
export type DeletedTask = BaseTask & {
  status: "deleted";
  deletedAt: Date;
};
type NewTask = BaseTask & {
  status: "new";
};

export type Task = NewTask | PostponedTask | CompletedTask | DeletedTask;

export type ListType = "open" | "open-new" | "closed" | "review" | "deleted";

export type BaseCurrentList = {
  actionedCount: number;
  showNext: boolean;
  willBeMarkedForReview?: boolean;
  restoreFocus?: boolean;
};

type CurrentOpenList = BaseCurrentList & {
  list: "open";
};
type CurrentOpenNewList = BaseCurrentList & {
  list: "open-new";
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
  | CurrentOpenNewList
  | CurrentClosedList
  | CurrentReviewList
  | CurrentDeletedList;

export type TaskList = {
  id: string;
  tasks: Task[];
  current: CurrentList;
  system?: SystemType;
};

export type UserAction =
  | { type: "Next" }
  | { type: "AddTask"; title: string }
  | { type: "AddPostponedTask"; title: string }
  | { type: "ReaddTask"; id: string }
  | { type: "CompleteTask"; id: string }
  | { type: "DeleteTask"; id: string }
  | { type: "ZeroTask"; id: string }
  | { type: "PostponeTask"; id: string };

export type TaskListAction =
  | { type: "AddTask"; task: Task }
  // | { type: "ReaddTask"; id: string }
  | { type: "CompleteTask"; id: string; additionalStatus?: AdditionalStatus; completedAt: Date }
  | { type: "ChangeCurrentList"; newCurrent: CurrentList }
  | { type: "MoveAllTasks"; from: ListType; to: ListType }
  | { type: "DeleteAllTasks"; from: ListType }
  | { type: "DeleteAllDeletedTasks" }
  | { type: "MarkDeleteTask"; id: string; deletedAt: Date }
  | { type: "ZeroTask"; id: string }
  | { type: "IncreaseActionedCount" }
  | { type: "UpdateCurrentListStatus" }
  | { type: "CheckPostponedTasks" }
  | { type: "ClearZero" }
  | { type: "CleanList"; list: ListType }
  | { type: "PatchTask"; id: string; additionalStatus?: AdditionalStatus };
