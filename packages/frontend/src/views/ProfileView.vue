<script setup lang="ts">
import { ref } from "vue";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth";
import { useRouter } from "vue-router";

const activeTab = ref<"profil" | "leaderboard">("profil");
const { logout } = useAuth();
const router = useRouter();

function doLogout() {
  logout();
  router.push({ name: "login" });
}

// Exemple simple de jours (1..31) pour faire le rendu
const days = Array.from({ length: 31 }, (_, i) => i + 1);

// Couleurs “pastilles” (placeholder)
function dayClass(day: number) {
  // petit pattern pour ressembler à la capture (tu ajusteras plus tard)
  if ([15, 22].includes(day)) return "day day--orange";
  if ([11, 31].includes(day)) return "day day--green";
  if ([12, 16].includes(day)) return "day day--gray";
  return "day day--teal";
}
</script>

<template>
  <AppShell variant="wide" :showDecor="false">
    <header class="topbar">
      <div class="topbar-left">
        <img class="topbar-logo" src="../assets/img/tilt.png" alt="tilt" />
        <button
          class="topbar-link"
          :class="{ 'is-active': activeTab === 'profil' }"
          @click="activeTab = 'profil'"
        >
          Mon profil
        </button>
        <button
          class="topbar-link"
          :class="{ 'is-active': activeTab === 'leaderboard' }"
          @click="activeTab = 'leaderboard'"
        >
          Leaderboard
        </button>
      </div>

      <button class="topbar-logout" @click="doLogout">Déconnexion</button>
    </header>

    <main class="profile-wrap">
      <section v-if="activeTab === 'profil'" class="profile-grid">
        <div class="stat-card">
          <div class="stat-title">Ma moyenne</div>
          <div class="stat-value">4.5</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Nombre de participations</div>
          <div class="stat-value">31</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">Best Streak</div>
          <div class="stat-value">11</div>
        </div>

        <div class="section">
          <div class="section-title">Janvier 2026</div>
          <div class="days">
            <button
              v-for="d in days"
              :key="d"
              type="button"
              :class="dayClass(d)"
            >
              {{ d }}
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Succès</div>
          <div class="section-empty">À venir</div>
        </div>

        <div class="section">
          <div class="section-title">Badges</div>
          <div class="section-empty">À venir</div>
        </div>
      </section>

      <section v-else class="leaderboard">
        <div class="section-title">Leaderboard</div>
        <div class="section-empty">À venir</div>
      </section>
    </main>
  </AppShell>
</template>
