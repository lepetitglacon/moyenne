import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "../composables/useAuth";

import LoginView from "../views/LoginView.vue";
import NoteDuJourView from "../views/NoteDuJourView.vue";
import NoterAutreView from "../views/NoterAutreView.vue";
import MerciView from "../views/MerciView.vue";
import StatsView from "../views/StatsView.vue";
import LeaderboardView from "../views/LeaderboardView.vue";
import AccountView from "../views/AccountView.vue";
import ForgotPasswordView from "../views/ForgotPasswordView.vue";
import ResetPasswordView from "../views/ResetPasswordView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", redirect: "/login" },
    { path: "/login", name: "login", component: LoginView },
    { path: "/forgot-password", name: "forgotPassword", component: ForgotPasswordView },
    { path: "/reset-password", name: "resetPassword", component: ResetPasswordView },

    { path: "/note", name: "note", component: NoteDuJourView, meta: { requiresAuth: true } },
    { path: "/noter-autre", name: "noterAutre", component: NoterAutreView, meta: { requiresAuth: true } },
    { path: "/merci", name: "merci", component: MerciView, meta: { requiresAuth: true } },
    { path: "/stats", name: "stats", component: StatsView, meta: { requiresAuth: true } },
    { path: "/leaderboard", name: "leaderboard", component: LeaderboardView, meta: { requiresAuth: true } },
    { path: "/compte", name: "compte", component: AccountView, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  const { isAuthenticated } = useAuth();

  if (to.meta.requiresAuth && !isAuthenticated.value) return { name: "login" };
  if (to.name === "login" && isAuthenticated.value) return { name: "note" };

  return true;
});

export default router;
