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
</style>
