<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import NavMenu from "../components/NavMenu.vue";
import { useAuth } from "../composables/useAuth";

const router = useRouter();
const { authFetch } = useAuth();

type MonthEntry = { date: string; rating: number };

type StreakInfo = {
  currentStreak: number;
  longestStreak: number;
};

type StatsPayload = {
  today: string;
  monthStart: string;
  monthEnd: string;
  lastEntry: null | { date: string; rating: number; description: string };
  todayEntry: null | { date: string; rating: number; description: string };
  participationCount: number;
  currentMonthAvg: number | null;
  monthEntries: MonthEntry[];
  streak: StreakInfo;
};

type UserLite = { id: number; username: string };
type UserStatsPayload = StatsPayload & { user?: UserLite };

const loading = ref(true);
const error = ref<string | null>(null);

const usersLoading = ref(true);
const usersError = ref<string | null>(null);
const users = ref<UserLite[]>([]);

const stats = ref<UserStatsPayload | null>(null);

const target = ref<"me" | number>("me");
const selectedMonth = ref<string>("");

async function loadUsers() {
  usersLoading.value = true;
  usersError.value = null;

  try {
    const res = await authFetch("/api/users");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Impossible de charger la liste des utilisateurs.");
    users.value = Array.isArray(data?.users) ? (data.users as UserLite[]) : [];
  } catch (e: any) {
    usersError.value = e?.message ?? "Erreur réseau (users).";
  } finally {
    usersLoading.value = false;
  }
}

function monthFromDateYMD(ymd: string) {
  return ymd?.slice(0, 7) || "";
}

function shiftMonth(ym: string, delta: number) {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + delta);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

async function loadStatsFor(t: "me" | number) {
  loading.value = true;
  error.value = null;

  try {
    const base = t === "me" ? "/api/me/stats" : `/api/users/${t}/stats`;
    const month = selectedMonth.value ? `?month=${encodeURIComponent(selectedMonth.value)}` : "";
    const res = await authFetch(`${base}${month}`);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Impossible de charger les stats.");

    stats.value = data as UserStatsPayload;

    if (!selectedMonth.value && stats.value?.monthStart) {
      selectedMonth.value = monthFromDateYMD(stats.value.monthStart);
    }
  } catch (e: any) {
    error.value = e?.message ?? "Erreur réseau.";
  } finally {
    loading.value = false;
  }
}

function onTargetChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value;
  target.value = v === "me" ? "me" : Number(v);
  loadStatsFor(target.value);
}

function prevMonth() {
  if (!selectedMonth.value) return;
  selectedMonth.value = shiftMonth(selectedMonth.value, -1);
  loadStatsFor(target.value);
}

function nextMonth() {
  if (!selectedMonth.value) return;
  selectedMonth.value = shiftMonth(selectedMonth.value, 1);
  loadStatsFor(target.value);
}

onMounted(async () => {
  await loadUsers();
  await loadStatsFor("me");
});

function parseYMD(ymd: string): Date {
  const parts = ymd.split("-").map((v) => Number(v)) as [number, number, number];
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

const monthLabel = computed(() => {
  if (!stats.value) return "";
  const d = parseYMD(stats.value.monthStart);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
});

const monthDays = computed(() => {
  if (!stats.value) return 30;
  const start = parseYMD(stats.value.monthStart);
  const y = start.getFullYear();
  const m = start.getMonth();
  return new Date(y, m + 1, 0).getDate();
});

const firstDayOffset = computed(() => {
  if (!stats.value) return 0;
  const start = parseYMD(stats.value.monthStart);
  const jsDay = start.getDay();
  return (jsDay + 6) % 7;
});

const entriesMap = computed(() => {
  const map = new Map<string, number>();
  (stats.value?.monthEntries || []).forEach((e) => map.set(e.date, e.rating));
  if (stats.value?.todayEntry) {
    map.set(stats.value.todayEntry.date, stats.value.todayEntry.rating);
  }
  return map;
});

function dayKey(day: number) {
  if (!stats.value) return "";
  const start = parseYMD(stats.value.monthStart);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ratingToColor(rating: number) {
  const t = Math.max(0, Math.min(20, rating)) / 20;
  const r = Math.round(220 * (1 - t) + 40 * t);
  const g = Math.round(60 * (1 - t) + 200 * t);
  const b = Math.round(70 * (1 - t) + 90 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function cellStyle(day: number) {
  const key = dayKey(day);
  const rating = entriesMap.value.get(key);

  if (rating === undefined) {
    return {
      background: "rgba(255,255,255,.04)",
      border: "1px solid rgba(255,255,255,.08)",
    };
  }

  return {
    background: ratingToColor(rating),
    border: "1px solid rgba(255,255,255,.14)",
  };
}

function dayTitle(day: number) {
  const key = dayKey(day);
  const rating = entriesMap.value.get(key);
  if (rating === undefined) return "Pas de note";
  return `${rating}/20`;
}

const headerTitle = computed(() => {
  if (target.value === "me") return "Mes statistiques";
  const u = users.value.find((x) => x.id === target.value);
  return u ? `Stats de ${u.username}` : "Statistiques";
});

function goEditToday() {
  router.push({ name: "note" });
}
</script>

<template>
  <AppShell variant="center" :showDecor="false">
    <div class="stats-page">
      <header class="stats-header">
        <img class="stats-logo" src="../assets/img/tilt.png" alt="tilt" />
        <h1 class="stats-title">{{ headerTitle }}</h1>

        <div class="profile-switch" v-if="!usersLoading && !usersError">
          <select
            class="profile-select"
            :value="target === 'me' ? 'me' : String(target)"
            @change="onTargetChange"
          >
            <option value="me">Moi</option>
            <option v-for="u in users" :key="u.id" :value="String(u.id)">
              {{ u.username }}
            </option>
          </select>
          <span class="select-chevron">▾</span>
        </div>
      </header>

      <div v-if="loading" class="loading-msg">Chargement...</div>
      <div v-else-if="error" class="error-msg">{{ error }}</div>

      <template v-else-if="stats">
        <div class="stats-content">
          <div class="stats-cards">
            <div class="card card--streak">
              <div class="card-label">Streak actuel</div>
              <div class="card-value streak-value">
                {{ stats.streak?.currentStreak ?? 0 }}
                <span class="streak-icon">🔥</span>
              </div>
              <div class="card-sub">jours consécutifs</div>
            </div>

            <div class="card card--record">
              <div class="card-label">Record</div>
              <div class="card-value">
                {{ stats.streak?.longestStreak ?? 0 }}
                <span class="record-icon">🏆</span>
              </div>
              <div class="card-sub">meilleur streak</div>
            </div>

            <div class="card">
              <div class="card-label">Moyenne</div>
              <div class="card-value">
                <span v-if="stats.currentMonthAvg !== null">{{ stats.currentMonthAvg.toFixed(1) }}<small>/20</small></span>
                <span v-else>—</span>
              </div>
              <div class="card-sub">{{ monthLabel }}</div>
            </div>

            <div class="card">
              <div class="card-label">Participations</div>
              <div class="card-value">{{ stats.participationCount }}</div>
              <div class="card-sub">jours notés</div>
            </div>

            <div class="card">
              <div class="card-label">Dernière note</div>
              <div class="card-value">
                <span v-if="stats.lastEntry">{{ stats.lastEntry.rating }}<small>/20</small></span>
                <span v-else>—</span>
              </div>
              <div class="card-sub" v-if="stats.lastEntry">{{ stats.lastEntry.date }}</div>
            </div>
          </div>

          <div class="calendar-section">
            <div class="calendar-head">
              <button class="cal-nav" type="button" @click="prevMonth" aria-label="Mois précédent">‹</button>
              <span class="cal-month">{{ monthLabel }}</span>
              <button class="cal-nav" type="button" @click="nextMonth" aria-label="Mois suivant">›</button>

              <div class="cal-legend">
                <span class="legend-dot" style="background: rgb(220,60,70)"></span>
                <span class="legend-label">0</span>
                <span class="legend-dot" style="background: rgb(40,200,90)"></span>
                <span class="legend-label">20</span>
              </div>
            </div>

            <div class="calendar-weekdays">
              <div class="weekday">L</div>
              <div class="weekday">M</div>
              <div class="weekday">M</div>
              <div class="weekday">J</div>
              <div class="weekday">V</div>
              <div class="weekday">S</div>
              <div class="weekday">D</div>
            </div>

            <div class="calendar-grid">
              <div v-for="i in firstDayOffset" :key="'empty-' + i" class="cal-day empty"></div>
              <div
                v-for="d in monthDays"
                :key="'day-' + d"
                class="cal-day"
                :style="cellStyle(d)"
                :title="dayTitle(d)"
              >
                <span class="day-num">{{ d }}</span>
                <span class="day-score" v-if="entriesMap.get(dayKey(d)) !== undefined">
                  {{ entriesMap.get(dayKey(d)) }}
                </span>
              </div>
            </div>
          </div>

          <button
            v-if="target === 'me'"
            class="btn btn-primary edit-btn"
            type="button"
            @click="goEditToday"
          >
            MODIFIER MA NOTE
          </button>
        </div>
      </template>

      <NavMenu />
    </div>
  </AppShell>
</template>

<style scoped>
.stats-page {
  width: min(1100px, 95vw);
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stats-logo {
  width: 48px;
  height: auto;
}

.stats-title {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  flex: 1;
}

.profile-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.profile-select {
  appearance: none;
  height: 36px;
  padding: 0 36px 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.92);
  font-weight: 700;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  color-scheme: dark;
}

.profile-select:hover {
  background: rgba(255,255,255,.1);
}

.select-chevron {
  position: absolute;
  right: 12px;
  pointer-events: none;
  opacity: .7;
  font-size: 12px;
}

.loading-msg,
.error-msg {
  text-align: center;
  padding: 24px;
  opacity: .8;
}

.error-msg {
  color: #ff7a7a;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.card {
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  text-align: center;
}

.card--streak {
  background: linear-gradient(135deg, rgba(255,100,50,.12) 0%, rgba(255,180,50,.08) 100%);
  border-color: rgba(255,140,50,.25);
}

.card--record {
  background: linear-gradient(135deg, rgba(255,200,50,.1) 0%, rgba(255,220,100,.06) 100%);
  border-color: rgba(255,200,50,.2);
}

.card-label {
  font-size: 11px;
  opacity: .65;
  font-weight: 600;
  margin-bottom: 4px;
}

.card-value {
  font-size: 24px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.card-value small {
  font-size: 12px;
  opacity: .7;
}

.streak-value {
  color: rgba(255,180,100,.95);
}

.streak-icon,
.record-icon {
  font-size: 18px;
}

.card-sub {
  margin-top: 3px;
  font-size: 10px;
  opacity: .5;
}

.calendar-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  padding: 14px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.calendar-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.cal-nav {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.9);
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cal-nav:hover {
  background: rgba(255,255,255,.1);
}

.cal-month {
  font-weight: 700;
  font-size: 15px;
  text-transform: capitalize;
  flex: 1;
}

.cal-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: .75;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-label {
  font-size: 11px;
  font-weight: 600;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  opacity: .6;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  flex: 1;
}

.cal-day {
  border-radius: 8px;
  min-height: 42px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.cal-day.empty {
  background: transparent !important;
  border: none !important;
}

.day-num {
  font-size: 12px;
  font-weight: 700;
  opacity: .85;
}

.day-score {
  font-size: 11px;
  font-weight: 800;
  opacity: .9;
  margin-top: 2px;
}

.edit-btn {
  align-self: center;
  width: auto;
  padding: 0 32px;
  margin-top: 8px;
}

.profile-select {
  appearance: none;
  height: 36px;
  padding: 0 36px 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);

  /* dark theme */
  background: rgba(20, 22, 40, .95);
  color: rgba(255,255,255,.92);
  color-scheme: dark;

  font-weight: 700;
  font-size: 14px;
  outline: none;
  cursor: pointer;
}

.profile-select:hover {
  background: rgba(35, 38, 70, .95);
}

.profile-select:focus {
  border-color: rgba(255,255,255,.22);
  box-shadow: 0 0 0 3px rgba(180, 120, 255, .18);
}

/* Dropdown items (souvent le point “blanc sur blanc”) */
.profile-select option {
  background-color: rgb(20, 22, 40);
  color: rgba(255,255,255,.92);
}

/* Option sélectionnée / survol (support variable selon OS/navigateur) */
.profile-select option:checked {
  background-color: rgb(35, 38, 70);
  color: rgba(255,255,255,.95);
}

@media (max-width: 900px) {
  .stats-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 600px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .stats-title {
    font-size: 18px;
  }

  .card-value {
    font-size: 20px;
  }

  .streak-icon,
  .record-icon {
    font-size: 14px;
  }
}
</style>
