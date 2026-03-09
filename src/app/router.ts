import { createRouter, createWebHistory } from "vue-router";
import { useTaskListLabels } from "@/app/composables/useTaskListLabels";
import { db } from "@/app/db";
import { dispatch } from "@/app/model/dispatch";
import TaskListPage from "@/pages/TaskList/TaskListPage.vue";
import type { TaskList } from "@/app/types";

declare module "vue-router" {
  interface RouteMeta {
    taskListData?: TaskList;
  }
}

const { taskListLabels, getTaskListLabel } = useTaskListLabels();

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  /* scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: "smooth",
      };
    }

    return { top: 0 };
  }, */
  routes: [
    {
      path: "/",
      redirect: "/tl",
    },
    {
      path: "/tl",
      component: { render: () => null },
      beforeEnter() {
        if (taskListLabels.value.length > 0) {
          return `/tl/${taskListLabels.value[0].id}`;
        }
        return "/tl/new";
      },
    },
    {
      path: "/tl/new/:id?",
      name: "CreateNewTaskList",
      component: () => import("@/pages/CreateNewTaskListPage.vue"),
      beforeEnter() {
        document.title = "New list";
      },
    },
    {
      path: "/tl/:id",
      name: "TaskList",
      component: TaskListPage,
      props(route) {
        const list = getTaskListLabel(route.params.id as string);
        if (!list) return false;
        document.title = list.name;
        return { name: list.name };
      },
    },
  ],
});

router.beforeEach(async (to) => {
  if (to.name === "TaskList") {
    const id = to.params.id as string;

    if (!getTaskListLabel(id)) {
      // It might be a newly created list, try to reload labels
      await db.updateTaskListLabels();

      if (!getTaskListLabel(id)) {
        return `/tl/new/${id}`;
      }
    }

    // Preload the data into the route meta to avoid flicker on remount
    try {
      const data = await db.getTaskList(id);
      dispatch(data, { type: "Cleanup", now: new Date() });
      to.meta.taskListData = data;
    } catch (e) {
      console.error("Failed to preload task list:", e);
    }
  }
});

export default router;
