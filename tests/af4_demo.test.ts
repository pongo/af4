import { nanoid } from "nanoid";
import { expect, it, vi } from "vitest";
import { assert } from "smart-invariant";

// http://markforster.squarespace.com/blog/2009/9/5/preliminary-instructions-for-autofocus-v-4.html
// https://web.archive.org/web/20250703222427/http://markforster.squarespace.com/blog/2009/9/5/preliminary-instructions-for-autofocus-v-4.html
// http://web.archive.org/web/20111129162935/http://autofocus.cc/public/data/af4-demo.pdf
// https://web.archive.org/web/20091007112000/http://autofocus.cc/public/data/af4-demo.pdf

const startClosed = [
  "Cancel Insurance",
  "Write Henry S.",
  "Contribute to P & Y’s",
  "Buy Guillotine",
  "Weed Old Accounts",
  "Ring Ben’s Gutters",
  "Get Phoenix Insurance",
  "Investigate ways of",
  "Approaching business",
  "Photo Plus Manual",
  "Sort out domain hosti",
  "Photos for Facebook",
  "“Taxi Driver”",
  "“Fanny Cradock”",
  "“I Know Where I’m Goi",
  "“The Edge of the Worl",
];

const startOpen = [
  "Travel Agency",
  "Schedule newsletters?",
  "Restaurant L's birthday",
  "Card for L",
  "Weed Noguchi",
  "Portuguese 17",
  "Aeneid",
  "“Then She Found Me”",
  "Write E-book",
  "Write M",
  "Read Ultra Simple Gui",
  "Camera Manual",
  "Return chalk to T",
  "Brain trainer",
  "Tidy Office",
  "“Fleurs du Mal”",
  "Make Bed",
  "German 24/3",
  "Facebook",
  "Spanish 12/2",
  "Mow Lawn",
  "Sort out Google bar",
  "Blog “7 Habits of Poor",
  "“Saraband”",
  "Write",
  "Bureau Top tidy?",
  "MicroPlaza",
  "Reading List (oldest)",
  "Reading List (newest)",
  "G replied?",
  "Desk tidy?",
  "Exercise",
  "Walk",
  "Tax Return",
  "Photo Galleries",
  "Squarespace Videos",
  "Check BP",
  "Journal 10+",
  "Investment Managers",
  "RegZooka",
  "Cut Hedge",
  "NumberWatch",
  "Carswell",
  "“The Cell”",
  "Paper",
  "Comments",
  "Voicemail",
  "Fix date for lunch",
  "Email",
  "FTSE",
  "“Top Gear”",
  "Lowest Point Forecast",
  "Back Up",
  "Reading",
  "Doodle",
  "Change Wallpaper",
  "Reading List (quality)",
  "Pitch C#",
  "Wash Up",
];

type TaskStatus = "new" | "readded" | "postponed" | "completed" | "deleted";

type Task = {
  id: string;
  title: string;
  createdAt: Date;
  // updatedAt: Date;
  status: TaskStatus;
  postponedUntil?: Date;
  // completedAt?: Date;
  list: ListType;
};

type ListType = "open" | "closed" | "review" | "postponed" | "deleted";

type TaskList = {
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

function createTaskList(): TaskList {
  return {
    id: nanoid(),
    // parts: {
    //   open: [],
    //   closed: [],
    //   review: [],
    //   postponed: [],
    // },
    tasks: [],
    current: {
      list: "open",
      actionedCount: 0,
    },
  };
}

const tasklist = createTaskList();

it("create initial task list", () => {
  for (const title of startClosed) {
    // tasklist.parts.closed.push({
    tasklist.tasks.push({
      id: title, //nanoid(),
      title,
      createdAt: new Date(),
      status: "new",
      list: "closed",
    });
  }
  for (const title of startOpen) {
    tasklist.tasks.push({
      id: title, //nanoid(),
      title,
      createdAt: new Date(),
      status: "new",
      list: "open",
    });
  }

  // expect(tasklist.parts.closed.length).toBe(startClosed.length);
  // expect(tasklist.parts.open.length).toBe(startOpen.length);
  expect(tasklist.tasks.length).toBe(startClosed.length + startOpen.length);
});

type UserAction =
  | { type: "AddTask"; title: string }
  | { type: "ReaddTask"; id: string }
  | { type: "CompleteTask"; id: string }
  | { type: "Next" };
type TaskListAction =
  | { type: "AddTask"; task: Task }
  | { type: "ReaddTask"; id: string }
  | { type: "CompleteTask"; id: string }
  | { type: "ChangeCurrentList"; newCurrent: ListType }
  | { type: "MoveAllTasks"; from: ListType; to: ListType }
  | { type: "DeleteAllTasks"; from: ListType };

const now = () => new Date(1752087579584);
const createdAt = now();

it("page 5: проходит по открытому списку", () => {
  // const generateId = vi
  //   .fn()
  //   .mockImplementationOnce(() => "FIILFjcxymdmvXqSkl25J") // 1st call
  //   .mockImplementationOnce(() => "jhEyypUJWpvxSd9UcTWxO"); // 2nd call

  const actual = af4({ generateId: () => "FIILFjcxymdmvXqSkl25J", now })(tasklist, {
    type: "AddTask",
    title: "Autopager?",
  });
  expect(actual).toEqual([
    {
      type: "AddTask",
      task: {
        id: "FIILFjcxymdmvXqSkl25J",
        title: "Autopager?",
        createdAt,
        status: "new",
        list: "open",
      },
    },
  ]);
  applyActions({ generateId: () => "FIILFjcxymdmvXqSkl25J", now })(tasklist, actual);
  expect(tasklist.tasks.filter((task) => task.list === "open").length).toBe(60);
  expect(tasklist.tasks.filter((task) => task.list === "closed").length).toBe(16);

  // actual = af4({ generateId: () => "jhEyypUJWpvxSd9UcTWxO", now })(tasklist, {
  //   type: "ReaddTask",
  //   id: "Comments",
  // });
  // expect(actual).toEqual([
  //   { type: "MarkComplete", id: "Comments" },
  //   {
  //     type: "AddTask",
  //     task: {
  //       id: "jhEyypUJWpvxSd9UcTWxO",
  //       title: "Comments",
  //       createdAt,
  //       status: "new",
  //     },
  //     list: "open",
  //   },
  // ]);
  // applyActions(tasklist, actual);
  readd("Comments", "jhEyypUJWpvxSd9UcTWxO");
  expect(tasklist.tasks.filter((task) => task.list === "open").length).toBe(61);
  expect(tasklist.tasks.filter((task) => task.list === "closed").length).toBe(16);
  expect(findTask(tasklist, "Comments")?.status).toEqual("completed");

  // actual = af4({ generateId: () => "W8zqE-4u4bp6W4v_K3Zfn", now })(tasklist, {
  //   type: "ReaddTask",
  //   id: "Voicemail",
  // });
  // expect(actual).toEqual([
  //   { type: "MarkComplete", id: "Voicemail" },
  //   {
  //     type: "AddTask",
  //     task: {
  //       id: "W8zqE-4u4bp6W4v_K3Zfn",
  //       title: "Voicemail",
  //       createdAt,
  //       status: "new",
  //     },
  //     list: "open",
  //   },
  // ]);
  // applyActions(tasklist, actual);
  readd("Voicemail", "W8zqE-4u4bp6W4v_K3Zfn");
  expect(tasklist.tasks.filter((task) => task.list === "open").length).toBe(62);

  readd("Email", "6af1bWoB_IimLqS4M0bqw");
  readd("FTSE", "7r4zCSwXaREKjuY1PmR5w");
  readd("Lowest Point Forecast", "Yg1xBYrbTtSOT38FBq5mx");
  readd("Doodle", "1lq7tpon7_lb7NOgJ8gTD");
  readd("Pitch C#", "MFOiwDk6qost9P_smXxSX");
  readd("Wash Up", "ANZejsytYfrdnHoS8VUdg");
  readd("Comments", "WoFLt2-rpkkSgUYb0_pKm");
  expect(tasklist.tasks.filter((task) => task.list === "open").length).toBe(69);
});

function readd(id: string, newId: string, title?: string) {
  const actual = af4({ generateId: () => newId, now })(tasklist, {
    type: "ReaddTask",
    id,
  });
  expect(actual).toEqual([
    { type: "ReaddTask", id },
    // { type: "MarkComplete", id },
    // {
    //   type: "AddTask",
    //   task: {
    //     id: newId,
    //     title: title || id,
    //     createdAt,
    //     status: "new",
    //     list: "open",
    //   },
    // },
  ]);
  applyActions({ generateId: () => newId, now })(tasklist, actual);
}

function complete(id: string) {
  const actual = af4({ generateId: () => "", now })(tasklist, {
    type: "CompleteTask",
    id,
  });
  expect(actual).toEqual([{ type: "CompleteTask", id }]);
  applyActions({ generateId: () => "", now })(tasklist, actual);
}

function af4({ generateId, now }: { generateId: () => string; now: () => Date }) {
  return (tasklist: TaskList, action: UserAction): TaskListAction[] => {
    const result: TaskListAction[] = [];

    // for (const action of actions) {
    switch (action.type) {
      case "AddTask": {
        result.push({ type: "AddTask", task: createTask(action.title) });
        break;
      }
      case "ReaddTask": {
        result.push({ type: "ReaddTask", id: action.id });
        // result.push({ type: "MarkComplete", id: action.id });
        // const existingTask = findTask(tasklist, action.id);
        // assert(existingTask, `Task with id ${action.id} should exist`);
        // result.push({ type: "AddTask", task: createTask(existingTask.title) });
        break;
      }
      case "Next": {
        switch (tasklist.current.list) {
          case "open":
            result.push({ type: "ChangeCurrentList", newCurrent: "closed" });
            break;
          case "closed":
            if (tasklist.tasks.filter((task) => task.list === "review").length > 0) {
              result.push({ type: "ChangeCurrentList", newCurrent: "review" });
              break;
            }

            if (tasklist.current.actionedCount > 0) {
              result.push({ type: "ChangeCurrentList", newCurrent: "open" });
            } else {
              result.push({ type: "ChangeCurrentList", newCurrent: "closed" });
              result.push({ type: "MoveAllTasks", from: "closed", to: "review" });
              result.push({ type: "MoveAllTasks", from: "open", to: "closed" });
            }
            break;
          case "review":
            result.push({ type: "MoveAllTasks", from: "review", to: "deleted" });
            result.push({ type: "ChangeCurrentList", newCurrent: "closed" });
            break;
          case "postponed":
            throw new Error("Should never happen");
          default:
            throw new Error("Should never happen");
        }
        break;
      }
      case "CompleteTask": {
        result.push({ type: "CompleteTask", id: action.id });
        break;
      }
    }
    // }

    return result;
  };

  function createTask(title: string): Task {
    return {
      id: generateId(),
      title,
      createdAt: now(),
      status: "new",
      list: "open",
    };
  }
}

function findTask(tasklist: TaskList, id: string): Task | undefined {
  // return (
  //   tasklist.parts.open.find((task) => task.id === id) ||
  //   tasklist.parts.closed.find((task) => task.id === id) ||
  //   tasklist.parts.review.find((task) => task.id === id) ||
  //   tasklist.parts.postponed.find((task) => task.id === id)
  // );
  return tasklist.tasks.find((task) => task.id === id);
}

function applyActions({ generateId, now }: { generateId: () => string; now: () => Date }) {
  return (tasklist: TaskList, actions: TaskListAction[]): void => {
    for (const action of actions) {
      switch (action.type) {
        case "AddTask": {
          tasklist.tasks.push(action.task);
          break;
        }
        case "ReaddTask": {
          const task = findAndComplete(action.id);
          tasklist.tasks.push(createTask(task.title));
          break;
        }
        case "ChangeCurrentList": {
          tasklist.current.list = action.newCurrent;
          tasklist.current.actionedCount = 0;
          break;
        }
        case "CompleteTask": {
          findAndComplete(action.id);
          break;
        }
        case "MoveAllTasks": {
          assert(
            action.from !== action.to,
            `MoveAllTasks: "from" should != "to": ${action.from}, ${action.to}`,
          );
          tasklist.tasks
            .filter((task) => task.list === action.from)
            .forEach((task) => void (task.list = action.to));
          break;
        }
      }
    }

    function findAndComplete(id: string) {
      const task = findTask(tasklist, id);
      assert(task, `Task with id ${id} should exist`);
      task.status = "completed";
      tasklist.current.actionedCount++;
      return task;
    }
  };

  function createTask(title: string): Task {
    return {
      id: generateId(),
      title,
      createdAt: now(),
      status: "new",
      list: "open",
    };
  }
}

it("page 42: переходит на закрытый список", () => {
  const actual = af4({ generateId: () => "", now })(tasklist, { type: "Next" });
  expect(actual).toEqual([
    {
      type: "ChangeCurrentList",
      newCurrent: "closed",
    },
  ]);
  applyActions({ generateId: () => "", now })(tasklist, actual);
  expect(tasklist.current.list).toBe("closed");

  complete("Buy Guillotine");
  readd("Photo Plus Manual", "ML1FmGEiX18iVYMH7lLPa");
  readd("“Taxi Driver”", "9C1VG51QZuhBe1BM4-XCY");
});

it("page 97: переход с закрытого списка на открытый (60-96 пропускаем)", () => {
  const actual = af4({ generateId: () => "", now })(tasklist, { type: "Next" });
  expect(actual).toEqual([
    {
      type: "ChangeCurrentList",
      newCurrent: "open",
    },
  ]);
  applyActions({ generateId: () => "", now })(tasklist, actual);
  expect(tasklist.current.list).toBe("open");
  expect(tasklist.current.actionedCount).toBe(0);

  readd("Restaurant L's birthday", "87jw_QcmGx6H4KsPYuMHy", "L repl. re restaurant?");
});

it("page 224: переход на закрытый список", () => {
  const actual = af4({ generateId: () => "", now })(tasklist, { type: "Next" });
  expect(actual).toEqual([{ type: "ChangeCurrentList", newCurrent: "closed" }]);
  applyActions({ generateId: () => "", now })(tasklist, actual);
  expect(tasklist.current.list).toBe("closed");
  expect(tasklist.current.actionedCount).toBe(0);
});

it("page 234: отмечаем как review", () => {
  const actual = af4({ generateId: () => "", now })(tasklist, { type: "Next" });
  expect(actual).toEqual([
    { type: "ChangeCurrentList", newCurrent: "closed" },
    { type: "MoveAllTasks", from: "closed", to: "review" },
    { type: "MoveAllTasks", from: "open", to: "closed" },
  ]);
  applyActions({ generateId: () => "", now })(tasklist, actual);
  expect(tasklist.current.list).toBe("closed");
  expect(tasklist.current.actionedCount).toBe(0);
  expect(tasklist.tasks.filter((task) => task.list === "review").length).toBe(16);
  expect(tasklist.tasks.filter((task) => task.list === "closed").length).toBe(72);
  expect(tasklist.tasks.filter((task) => task.list === "open").length).toBe(0);

  readd("Check BP", "jSfeIGwMRQQ9ghA_U0bN7");
  expect(tasklist.tasks.filter((task) => task.list === "open").length).toBe(1);
});

it("page 302: переход в review", () => {
  const actual = af4({ generateId: () => "", now })(tasklist, { type: "Next" });
  expect(actual).toEqual([{ type: "ChangeCurrentList", newCurrent: "review" }]);
  applyActions({ generateId: () => "", now })(tasklist, actual);
  expect(tasklist.current.list).toBe("review");
  expect(tasklist.current.actionedCount).toBe(0);

  readd("“Fanny Cradock”", "u-dmkQgTXEFTXt7IF5njb");
  expect(tasklist.tasks.filter((task) => task.list === "open").length).toBe(2);
});

it("page 313: удаляем из review и переходим в closed", () => {
  const actual = af4({ generateId: () => "", now })(tasklist, { type: "Next" });
  expect(actual).toEqual([
    { type: "MoveAllTasks", from: "review", to: "deleted" },
    { type: "ChangeCurrentList", newCurrent: "closed" },
  ]);
  applyActions({ generateId: () => "", now })(tasklist, actual);
  expect(tasklist.current.list).toBe("closed");
  expect(tasklist.current.actionedCount).toBe(0);
  expect(tasklist.tasks.filter((task) => task.list === "review").length).toBe(0);
  expect(tasklist.tasks.filter((task) => task.list === "closed").length).toBe(72);
  expect(tasklist.tasks.filter((task) => task.list === "open").length).toBe(2);
  expect(tasklist.tasks.filter((task) => task.list === "deleted").length).toBe(16);
});
