import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "../composables/useAuth";

import LoginView from "../views/LoginView.vue";
import NoteDuJourView from "../views/NoteDuJourView.vue";
import NoterAutreView from "../views/NoterAutreView.vue";
import MerciView from "../views/MerciView.vue";
import ProfileView from "../views/ProfileView.vue";
import StatsView from "../views/StatsView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", redirect: "/login" },
    { path: "/login", name: "login", component: LoginView },

    { path: "/note", name: "note", component: NoteDuJourView, meta: { requiresAuth: true } },
    { path: "/noter-autre", name: "noterAutre", component: NoterAutreView, meta: { requiresAuth: true } },
    { path: "/merci", name: "merci", component: MerciView, meta: { requiresAuth: true } },
    { path: "/stats", name: "stats", component: StatsView, meta: { requiresAuth: true } },
    { path: "/profil", name: "profil", component: ProfileView, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  const { isAuthenticated } = useAuth();

  if (to.meta.requiresAuth && !isAuthenticated.value) return { name: "login" };
  if (to.name === "login" && isAuthenticated.value) return { name: "note" };

  return true;
});

export default router;
