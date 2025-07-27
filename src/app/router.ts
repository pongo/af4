import { createRouter, createWebHistory } from "vue-router";
import { useTaskListLabels } from "@/app/composables/useTaskListLabels";
import TaskListPage from "@/pages/TaskList/TaskListPage.vue";

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
      redirect() {
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
      beforeEnter(to) {
        if (!getTaskListLabel(to.params.id as string)) {
          return `/tl/new/${to.params.id}`;
        }
        return true;
      },
    },
  ],
});

export default router;
