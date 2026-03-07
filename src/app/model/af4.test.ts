import { nanoid } from "nanoid";
import { describe, expect, it } from "vitest";
import type { PostponedTask, TaskList } from "../types.ts";
import { makeAf4 } from "./af4.ts";
import { findTask } from "./utils.ts";

function createTaskList(): TaskList {
  return {
    id: nanoid(),
    tasks: [],
    current: {
      list: "open",
      actionedCount: 0,
      showNext: false,
    },
    system: "af4",
  };
}

// http://markforster.squarespace.com/blog/2009/9/5/preliminary-instructions-for-autofocus-v-4.html
// https://web.archive.org/web/20250703222427/http://markforster.squarespace.com/blog/2009/9/5/preliminary-instructions-for-autofocus-v-4.html
// http://web.archive.org/web/20111129162935/http://autofocus.cc/public/data/af4-demo.pdf
// https://web.archive.org/web/20091007112000/http://autofocus.cc/public/data/af4-demo.pdf
describe("AF4 demo", () => {
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

  const now = () => new Date(1752087579584);
  const createdAt = now();

  it("page 5: проходит по открытому списку", () => {
    // const generateId = vi
    //   .fn()
    //   .mockImplementationOnce(() => "FIILFjcxymdmvXqSkl25J") // 1st call
    //   .mockImplementationOnce(() => "jhEyypUJWpvxSd9UcTWxO"); // 2nd call

    makeAf4({ generateId: () => "FIILFjcxymdmvXqSkl25J", now })(tasklist, {
      type: "AddTask",
      title: "Autopager?",
    });
    expect(tasklist.tasks[tasklist.tasks.length - 1]).toEqual({
      id: "FIILFjcxymdmvXqSkl25J",
      title: "Autopager?",
      createdAt,
      status: "new",
      list: "open",
    });
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
    readd("Comments", "Comments__jhEyypUJWpvxSd9UcTWxO");
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 61, // 60
      openNew: 0, // 1
      closed: 16,
      review: 0,
      deleted: 0,
    });
    expect(findTask(tasklist, "Comments").status).toEqual("completed");

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
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 62, // 60
      openNew: 0, // 2
      closed: 16,
      review: 0,
      deleted: 0,
    });

    readd("Email", "6af1bWoB_IimLqS4M0bqw");
    readd("FTSE", "7r4zCSwXaREKjuY1PmR5w");
    readd("Lowest Point Forecast", "Yg1xBYrbTtSOT38FBq5mx");
    readd("Doodle", "1lq7tpon7_lb7NOgJ8gTD");
    readd("Pitch C#", "MFOiwDk6qost9P_smXxSX");
    readd("Wash Up", "ANZejsytYfrdnHoS8VUdg");
    readd("Comments", "Comments__WoFLt2-rpkkSgUYb0_pKm");
    readd("Comments__jhEyypUJWpvxSd9UcTWxO", "Comments__ui5O29bDKJPU1g2s695U3");
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 69, // 60
      openNew: 0, // 9
      closed: 16,
      review: 0,
      deleted: 0,
    });
  });

  function readd(id: string, newId: string, title?: string) {
    makeAf4({ generateId: () => newId, now })(tasklist, {
      type: "ReaddTask",
      id,
      title,
    });
  }

  function complete(id: string) {
    makeAf4({ generateId: () => "", now })(tasklist, {
      type: "CompleteTask",
      id,
    });
  }

  it("page 42: переходит на закрытый список", () => {
    makeAf4({ generateId: () => "", now })(tasklist, { type: "Next" });
    expect(tasklist.current.list).toBe("closed");

    complete("Buy Guillotine");
    readd("Photo Plus Manual", "ML1FmGEiX18iVYMH7lLPa");
    readd("“Taxi Driver”", "9C1VG51QZuhBe1BM4-XCY");
  });

  it("page 97: переход с закрытого списка на открытый (60-96 пропускаем)", () => {
    makeAf4({ generateId: () => "", now })(tasklist, { type: "Next" });
    expect(tasklist.current.list).toBe("open");
    expect(tasklist.current.actionedCount).toBe(0);

    readd("Restaurant L's birthday", "87jw_QcmGx6H4KsPYuMHy", "L repl. re restaurant?");
  });

  it("page 224: переход на закрытый список", () => {
    makeAf4({ generateId: () => "", now })(tasklist, { type: "Next" });
    expect(tasklist.current.list).toBe("closed");
    expect(tasklist.current.actionedCount).toBe(0);
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 72, // 71
      openNew: 0, // 1
      closed: 16,
      review: 0,
      deleted: 0,
    });
  });

  it("page 234: отмечаем как review", () => {
    makeAf4({ generateId: () => "", now })(tasklist, { type: "Next" });
    expect(tasklist.current).toStrictEqual({
      actionedCount: 0,
      list: "open",
      showNext: false,
    });
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 72,
      openNew: 0,
      closed: 0,
      review: 16,
      deleted: 0,
    });

    readd("Check BP", "jSfeIGwMRQQ9ghA_U0bN7");
    expect(tasklist.tasks.filter((task) => task.list === "open").length).toBe(1);
  });

  it("page 302: переход в review", () => {
    makeAf4({ generateId: () => "", now })(tasklist, { type: "Next" });
    expect(tasklist.current.list).toBe("review");
    expect(tasklist.current.actionedCount).toBe(0);

    readd("“Fanny Cradock”", "u-dmkQgTXEFTXt7IF5njb");
    expect(tasklist.tasks.filter((task) => task.list === "open").length).toBe(2);
  });

  it("page 313: удаляем из review и переходим в closed", () => {
    expect(tasklist.tasks.length).toBe(90);
    expect(tasklist.tasks.filter((task) => task.list === "review").length).toBe(16);
    makeAf4({ generateId: () => "", now })(tasklist, { type: "Next" });
    expect(tasklist.current).toStrictEqual({
      actionedCount: 0,
      list: "closed",
      showNext: true,
      willBeMarkedForReview: true,
    });
    expect(tasklist.tasks.length).toBe(90 - 16);
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 2,
      openNew: 0,
      closed: 72,
      review: 0,
      deleted: 0,
    });
  });
});

function tasksCountByLists(tasklist: TaskList) {
  return {
    open: tasklist.tasks.filter((task) => task.list === "open").length,
    openNew: tasklist.tasks.filter((task) => task.list === "open-new").length,
    closed: tasklist.tasks.filter((task) => task.list === "closed").length,
    review: tasklist.tasks.filter((task) => task.list === "review").length,
    deleted: tasklist.tasks.filter((task) => task.list === "deleted").length,
  };
}

function tasksCountByStatuses(tasklist: TaskList) {
  return {
    new: tasklist.tasks.filter((task) => task.status === "new").length,
    completed: tasklist.tasks.filter((task) => task.status === "completed").length,
    postponed: tasklist.tasks.filter((task) => task.status === "postponed").length,
    deleted: tasklist.tasks.filter((task) => task.status === "deleted").length,
  };
}

describe("Postponed tasks", () => {
  it("should move postponed task to open when time comes", () => {
    const tasklist = createTaskList();
    const now = new Date("2025-01-01T18:59:39.584Z");
    makeAf4({ generateId: () => "postponed-task", now: () => now })(tasklist, {
      type: "AddPostponedTask",
      title: "Postponed Task",
    });
    expect(tasksCountByStatuses(tasklist)).toEqual({
      new: 0,
      completed: 0,
      postponed: 1,
      deleted: 0,
    });
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 1,
      openNew: 0,
      closed: 0,
      review: 0,
      deleted: 0,
    });

    // move time forward
    const postponedUntil = findTask<PostponedTask>(tasklist, "postponed-task").postponedUntil;
    const later = new Date(postponedUntil.getTime() + 1000);
    makeAf4({ generateId: () => "postponed-task", now: () => later })(tasklist, {
      type: "Cleanup",
      now: later,
    });
    expect(tasksCountByStatuses(tasklist)).toEqual({
      new: 1,
      completed: 0,
      postponed: 0,
      deleted: 0,
    });

    expect(findTask(tasklist, "postponed-task")).toEqual({
      id: "postponed-task",
      title: "Postponed Task",
      createdAt: later,
      status: "new",
      list: "open",
    });
  });

  it("postponed moves when have closed list tasks", () => {
    const tasklist = createTaskList();
    addTask("Open Task 1");
    addTask("Open Task 2");
    next(); // move to closed
    expect(tasklist.current.list).toBe("closed");
    addTask("Closed Task 1");
    addTask("Closed Task 2");

    addPostponedTask("Postponed Task", new Date("2025-01-01T18:59:39.584Z"));
    next(new Date("2025-01-01T19:00:00Z")); // move to open
    expect(tasklist.current.list).toBe("open");
    expect(tasksCountByStatuses(tasklist)).toEqual({
      completed: 0,
      deleted: 0,
      new: 4,
      postponed: 1,
    });
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 5,
      openNew: 0,
      closed: 0,
      review: 0,
      deleted: 0,
    });

    cleanup(new Date("2025-01-01T19:03:00Z"));
    expect(tasksCountByStatuses(tasklist)).toEqual({
      completed: 0,
      deleted: 0,
      new: 4,
      postponed: 1,
    });
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 5,
      openNew: 0,
      closed: 0,
      review: 0,
      deleted: 0,
    });

    // next day
    cleanup(new Date("2025-01-02T00:03:00Z"));
    expect(tasksCountByStatuses(tasklist)).toEqual({
      completed: 0,
      deleted: 0,
      new: 5,
      postponed: 0,
    });
    expect(tasksCountByLists(tasklist)).toEqual({
      open: 5,
      openNew: 0,
      closed: 0,
      review: 0,
      deleted: 0,
    });

    // addPostponedTask("Postponed Task open list", new Date("2025-01-01T19:02:00Z"));
    // cleanup(new Date("2025-01-01T19:03:00Z"));
    // expect(tasksCountByStatuses(tasklist)).toEqual({
    //   new: 5,
    //   completed: 0,
    //   postponed: 1,
    //   deleted: 0,
    // });
    // expect(tasksCountByLists(tasklist)).toEqual({
    //   open: 6,
    //   openNew: 0,
    //   closed: 0,
    //   review: 0,
    //   deleted: 0,
    // });

    function addTask(id: string) {
      makeAf4({ generateId: () => id, now: () => new Date() })(tasklist, {
        type: "AddTask",
        title: id,
      });
    }

    function next(date: Date = new Date()) {
      makeAf4({ generateId: () => "", now: () => date })(tasklist, { type: "Next" });
    }

    function addPostponedTask(id: string, date: Date) {
      makeAf4({ generateId: () => id, now: () => date })(tasklist, {
        type: "AddPostponedTask",
        title: id,
      });
    }

    function cleanup(date: Date) {
      makeAf4({ generateId: () => "postponed-task", now: () => date })(tasklist, {
        type: "Cleanup",
        now: date,
      });
    }
  });
});
