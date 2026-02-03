<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AppShell from "../components/AppShell.vue";
import NavMenu from "../components/NavMenu.vue";
import { useAuth } from "../composables/useAuth";

const { authFetch } = useAuth();

type LeaderboardEntry = {
  userId: number;
  username: string;
  avgRating: number;
  entryCount: number;
};

type LeaderboardPayload = {
  monthStart: string;
  monthEnd: string;
  monthly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
  topParticipants: LeaderboardEntry[];
};

const loading = ref(true);
const error = ref<string | null>(null);
const data = ref<LeaderboardPayload | null>(null);

const selectedMonth = ref<string>("");
const activeTab = ref<"monthly" | "allTime" | "participation">("monthly");

function monthFromDateYMD(ymd: string) {
  return ymd?.slice(0, 7) || "";
}

function shiftMonth(ym: string, delta: number) {
  const parts = ym.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + delta);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

async function loadLeaderboard() {
  loading.value = true;
  error.value = null;

  try {
    const month = selectedMonth.value ? `?month=${encodeURIComponent(selectedMonth.value)}` : "";
    const res = await authFetch(`/api/leaderboard${month}`);

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || "Impossible de charger le classement.");

    data.value = json as LeaderboardPayload;

    if (!selectedMonth.value && data.value?.monthStart) {
      selectedMonth.value = monthFromDateYMD(data.value.monthStart);
    }
  } catch (e: unknown) {
    error.value = (e as Error)?.message ?? "Erreur réseau.";
  } finally {
    loading.value = false;
  }
}

function prevMonth() {
  if (!selectedMonth.value) return;
  selectedMonth.value = shiftMonth(selectedMonth.value, -1);
  loadLeaderboard();
}

function nextMonth() {
  if (!selectedMonth.value) return;
  selectedMonth.value = shiftMonth(selectedMonth.value, 1);
  loadLeaderboard();
}

onMounted(() => {
  loadLeaderboard();
});

const monthLabel = computed(() => {
  if (!data.value) return "";
  const parts = data.value.monthStart.split("-").map((v) => Number(v)) as [number, number, number];
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
});

const currentList = computed(() => {
  if (!data.value) return [];
  if (activeTab.value === "monthly") return data.value.monthly;
  if (activeTab.value === "allTime") return data.value.allTime;
  return data.value.topParticipants;
});

function getMedal(index: number): string {
  if (index === 0) return "1";
  if (index === 1) return "2";
  if (index === 2) return "3";
  return String(index + 1);
}

function getMedalClass(index: number): string {
  if (index === 0) return "medal--gold";
  if (index === 1) return "medal--silver";
  if (index === 2) return "medal--bronze";
  return "";
}
</script>

<template>
  <AppShell variant="center" :showDecor="false">
    <div class="leaderboard-page">
      <header class="lb-header">
        <img class="lb-logo" src="../assets/img/tilt.png" alt="tilt" />
        <h1 class="lb-title">Classement</h1>
      </header>

      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'monthly' }"
          type="button"
          @click="activeTab = 'monthly'"
        >
          Mensuel
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'allTime' }"
          type="button"
          @click="activeTab = 'allTime'"
        >
          All-time
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'participation' }"
          type="button"
          @click="activeTab = 'participation'"
        >
          Participations
        </button>
      </div>

      <div v-if="activeTab === 'monthly'" class="month-nav">
        <button class="nav-btn" type="button" @click="prevMonth" aria-label="Mois précédent">
          ‹
        </button>
        <span class="month-label">{{ monthLabel }}</span>
        <button class="nav-btn" type="button" @click="nextMonth" aria-label="Mois suivant">
          ›
        </button>
      </div>

      <div v-if="loading" class="loading-msg">Chargement...</div>
      <div v-else-if="error" class="error-msg">{{ error }}</div>

      <template v-else-if="data">
        <div class="list-container">
          <div v-if="currentList.length === 0" class="empty-msg">
            Aucune donnée pour cette période.
          </div>

          <div
            v-for="(entry, index) in currentList"
            :key="entry.userId"
            class="lb-row"
            :class="{ 'lb-row--top3': index < 3 }"
          >
            <div class="rank" :class="getMedalClass(index)">
              {{ getMedal(index) }}
            </div>

            <div class="user-info">
              <div class="username">{{ entry.username }}</div>
              <div class="meta">
                <span v-if="activeTab === 'participation'">
                  {{ entry.entryCount }} jours
                </span>
                <span v-else>
                  {{ entry.entryCount }} entrées
                </span>
              </div>
            </div>

            <div class="score">
              <template v-if="activeTab === 'participation'">
                <span class="score-value">{{ entry.entryCount }}</span>
                <span class="score-unit">j</span>
              </template>
              <template v-else>
                <span class="score-value">{{ entry.avgRating }}</span>
                <span class="score-unit">/20</span>
              </template>
            </div>
          </div>
        </div>
      </template>

      <NavMenu />
    </div>
  </AppShell>
</template>

<style scoped>
.leaderboard-page {
  width: min(600px, 95vw);
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lb-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.lb-logo {
  width: 48px;
  height: auto;
}

.lb-title {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab {
  flex: 1;
  min-width: 100px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.75);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.08);
}

.tab.active {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.95);
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.month-label {
  font-weight: 700;
  font-size: 15px;
  text-transform: capitalize;
  min-width: 140px;
  text-align: center;
}

.loading-msg,
.error-msg,
.empty-msg {
  text-align: center;
  padding: 24px;
  opacity: 0.7;
}

.error-msg {
  color: #ff7a7a;
}

.list-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.lb-row--top3 {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}

.rank {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 14px;
  flex-shrink: 0;
}

.medal--gold {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 180, 0, 0.2) 100%);
  border: 1px solid rgba(255, 215, 0, 0.4);
  color: rgba(255, 230, 150, 0.95);
}

.medal--silver {
  background: linear-gradient(135deg, rgba(192, 192, 192, 0.25) 0%, rgba(160, 160, 160, 0.15) 100%);
  border: 1px solid rgba(192, 192, 192, 0.35);
  color: rgba(220, 220, 220, 0.95);
}

.medal--bronze {
  background: linear-gradient(135deg, rgba(205, 127, 50, 0.25) 0%, rgba(180, 100, 40, 0.15) 100%);
  border: 1px solid rgba(205, 127, 50, 0.35);
  color: rgba(230, 180, 130, 0.95);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.username {
  font-weight: 800;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 2px;
}

.score {
  text-align: right;
  flex-shrink: 0;
}

.score-value {
  font-size: 20px;
  font-weight: 900;
}

.score-unit {
  font-size: 12px;
  opacity: 0.6;
  margin-left: 2px;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .leaderboard-page {
    width: 100%;
    max-height: none;
    padding-bottom: 20px;
  }

  .lb-header {
    gap: 10px;
    justify-content: center;
  }

  .lb-logo {
    width: 40px;
  }

  .lb-title {
    font-size: 20px;
  }

  .tabs {
    flex-direction: row;
    flex-wrap: nowrap;
  }

  .tab {
    flex: 1;
    min-width: 0;
    padding: 12px 10px;
    font-size: 11px;
    border-radius: 8px;
  }

  .month-nav {
    gap: 10px;
  }

  .nav-btn {
    width: 40px;
    height: 40px;
    font-size: 20px;
    -webkit-tap-highlight-color: transparent;
  }

  .month-label {
    font-size: 14px;
    min-width: 120px;
  }

  .list-container {
    gap: 6px;
  }

  .lb-row {
    padding: 12px 12px;
    gap: 10px;
    border-radius: 10px;
  }

  .rank {
    width: 30px;
    height: 30px;
    font-size: 13px;
  }

  .username {
    font-size: 14px;
  }

  .meta {
    font-size: 10px;
  }

  .score-value {
    font-size: 18px;
  }

  .score-unit {
    font-size: 11px;
  }
}

@media (max-width: 360px) {
  .tab {
    padding: 10px 6px;
    font-size: 10px;
  }

  .username {
    font-size: 13px;
  }

  .score-value {
    font-size: 16px;
  }
}

/* Touch feedback */
@media (hover: none) and (pointer: coarse) {
  .tab:hover,
  .nav-btn:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .tab:active,
  .nav-btn:active {
    transform: scale(0.96);
    opacity: 0.8;
  }

  .lb-row:active {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
