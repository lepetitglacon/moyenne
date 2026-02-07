<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { useAuth } from "../composables/useAuth";

const router = useRouter();
const route = useRoute();
const { logout } = useAuth();

function isActive(name: string) {
  return route.name === name;
}

function go(name: string) {
  router.push({ name });
}

function handleLogout() {
  logout();
  router.push({ name: "login" });
}
</script>

<template>
  <nav class="nav-menu">
    <button
      class="nav-item"
      :class="{ active: isActive('note') }"
      type="button"
      @click="go('note')"
    >
      Noter
    </button>
    <button
      class="nav-item"
      :class="{ active: isActive('stats') }"
      type="button"
      @click="go('stats')"
    >
      Stats
    </button>
    <button
      class="nav-item"
      :class="{ active: isActive('leaderboard') }"
      type="button"
      @click="go('leaderboard')"
    >
      Classement
    </button>
    <button
      class="nav-item"
      :class="{ active: isActive('compte') }"
      type="button"
      @click="go('compte')"
    >
      Compte
    </button>
    <button
      class="nav-item nav-item--logout"
      type="button"
      @click="handleLogout"
    >
      Logout
    </button>
  </nav>
</template>

<style scoped>
.nav-menu {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-item {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  padding: 10px 16px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.28);
  color: rgba(255, 255, 255, 0.95);
}

.nav-item--logout {
  opacity: 0.7;
}

.nav-item--logout:hover {
  opacity: 1;
}

/* Mobile: Fixed bottom navigation */
@media (max-width: 600px) {
  .nav-menu {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    margin: 0;
    padding: 12px 12px calc(12px + env(safe-area-inset-bottom, 0px));
    background: rgba(6, 8, 26, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0;
    gap: 6px;
    z-index: 1000;
    flex-wrap: nowrap;
    justify-content: space-around;
  }

  .nav-item {
    flex: 1;
    text-align: center;
    padding: 12px 8px;
    font-size: 12px;
    border-radius: 10px;
    min-width: 0;
  }

  .nav-item--logout {
    flex: 0 0 auto;
    padding: 12px 14px;
  }
}

/* Touch feedback */
@media (hover: none) and (pointer: coarse) {
  .nav-item:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .nav-item:active {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(0.96);
  }

  .nav-item.active:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}
</style>
