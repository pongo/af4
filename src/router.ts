import { createRouter, createWebHistory } from "vue-router";
import { useTaskListLabels } from "@/useTaskListLabels.ts";

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
        const { taskListLabels } = useTaskListLabels();
        if (taskListLabels.value.length > 0) {
          return `/tl/${taskListLabels.value[0].id}`;
        }
        return "/tl/new";
      },
    },
    {
      path: "/tl/new/:id?",
      name: "CreateNewTaskList",
      component: () => import("@/pages/CreateNewTaskList.vue"),
    },
    {
      path: "/tl/:id",
      name: "TaskList",
      component: () => import("@/pages/TaskListPage.vue"),
      beforeEnter: (to) => {
        if (!localStorage.getItem(`af4-${to.params.id}`)) return `/tl/new/${to.params.id}`;
        return true;
      },
    },
  ],
});

export default router;
