<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth";

const router = useRouter();
const { authFetch } = useAuth();

type MonthEntry = { date: string; rating: number };

type StatsPayload = {
  today: string;
  monthStart: string;
  monthEnd: string;
  lastEntry: null | { date: string; rating: number; description: string };
  todayEntry:
    | null
    | { date: string; rating: number; description: string; createdAt?: string };
  monthAvg: number;
  monthCount: number;
  monthEntries: MonthEntry[];
};

type UserLite = { id: string; username: string };

const loading = ref(false);
const error = ref("");

const stats = ref<StatsPayload | null>(null);

const users = ref<UserLite[]>([]);
const target = ref<string>("me");

const selectedMonth = ref<string>("");

const showUsers = ref(false);

async function loadUsers() {
  error.value = "";
  try {
    const res = await authFetch("/api/users");
    if (!res.ok) throw new Error("Impossible de charger la liste des utilisateurs");
    users.value = (await res.json()) as UserLite[];
  } catch (e: any) {
    error.value = e?.message || "Erreur inconnue";
  }
}

async function loadStatsFor(userId: string) {
  loading.value = true;
  error.value = "";
  try {
    const monthParam = selectedMonth.value ? `&month=${encodeURIComponent(selectedMonth.value)}` : "";
    const res = await authFetch(`/api/stats?user=${encodeURIComponent(userId)}${monthParam}`);
    if (!res.ok) throw new Error("Impossible de charger les statistiques");
    const payload = (await res.json()) as StatsPayload;
    stats.value = payload;

    // si aucune sélection, on se cale sur le mois retourné
    if (!selectedMonth.value && payload?.monthStart) {
      selectedMonth.value = payload.monthStart.slice(0, 7); // "YYYY-MM"
    }
  } catch (e: any) {
    error.value = e?.message || "Erreur inconnue";
  } finally {
    loading.value = false;
  }
}

function goProfile() {
  router.push("/profile");
}

function toggleUsers() {
  showUsers.value = !showUsers.value;
}

function selectUser(id: string) {
  target.value = id;
  showUsers.value = false;
  loadStatsFor(target.value);
}

function shiftMonth(yyyyMM: string, delta: number) {
  const m = yyyyMM.match(/^([0-9]{4})-([0-9]{2})$/);
  if (!m) return yyyyMM;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo)) return yyyyMM;

  const d = new Date(y, mo - 1 + delta, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
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

// -------- Helpers calendrier --------
function parseYMD(ymd: string): Date {
  // Format attendu: YYYY-MM-DD
  const m = ymd.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
  if (!m) return new Date(NaN);

  const yy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);

  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return new Date(NaN);
  return new Date(yy, mm - 1, dd);
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
  const jsDay = start.getDay(); // 0=dimanche..6=samedi
  return (jsDay + 6) % 7; // lundi=0..dimanche=6
});

const entriesMap = computed(() => {
  const map = new Map<string, number>();
  if (!stats.value) return map;
  for (const e of stats.value.monthEntries || []) map.set(e.date, e.rating);
  return map;
});

function dayKey(day: number) {
  if (!stats.value) return "";
  const d = parseYMD(stats.value.monthStart);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function cellStyle(day: number) {
  const key = dayKey(day);
  const v = entriesMap.value.get(key);

  // pas de note
  if (v === undefined) return {};

  // 0..20 -> teintes (reprend la logique "style du site" via classes + opacité)
  const ratio = Math.max(0, Math.min(1, v / 20));
  const alpha = 0.15 + ratio * 0.65;

  return {
    background: `rgba(255, 255, 255, ${alpha})`,
    borderColor: `rgba(255, 255, 255, ${Math.min(0.9, alpha + 0.15)})`,
  };
}

const todayKey = computed(() => stats.value?.today || "");

function isToday(day: number) {
  const key = dayKey(day);
  return key === todayKey.value;
}

function ratingLabel(v: number) {
  return `${v}/20`;
}
</script>

<template>
  <AppShell variant="center" :showDecor="false">
    <div class="page-center">
      <div class="header">
        <div class="title">Stats</div>

        <div class="actions">
          <button class="btn btn-ghost" type="button" @click="toggleUsers">
            Profils
          </button>
          <button class="btn btn-ghost" type="button" @click="goProfile">
            Profil
          </button>
        </div>
      </div>

      <div v-if="loading" class="step-subtitle">Chargement…</div>
      <div v-else-if="error" class="step-subtitle error">{{ error }}</div>

      <template v-else>
        <div class="panel">
          <div class="panel-head">
            <button class="nav-arrow" type="button" @click="prevMonth" aria-label="Mois précédent">
              ‹
            </button>

            <div class="month">{{ monthLabel }}</div>

            <button class="nav-arrow" type="button" @click="nextMonth" aria-label="Mois suivant">
              ›
            </button>
          </div>

          <div class="kpis">
            <div class="kpi">
              <div class="kpi-label">Moyenne</div>
              <div class="kpi-value">{{ stats?.monthAvg?.toFixed(2) }}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Entrées</div>
              <div class="kpi-value">{{ stats?.monthCount }}</div>
            </div>
          </div>

          <div class="calendar">
            <div class="dow">L</div>
            <div class="dow">M</div>
            <div class="dow">M</div>
            <div class="dow">J</div>
            <div class="dow">V</div>
            <div class="dow">S</div>
            <div class="dow">D</div>

            <div
              v-for="i in firstDayOffset"
              :key="'pad-' + i"
              class="day pad"
            />

            <div
              v-for="d in monthDays"
              :key="'day-' + d"
              class="day"
              :class="{ today: isToday(d), filled: entriesMap.get(dayKey(d)) !== undefined }"
              :style="cellStyle(d)"
              :title="entriesMap.get(dayKey(d)) !== undefined ? ratingLabel(entriesMap.get(dayKey(d))!) : 'Pas de note'"
            >
              <div class="day-number">{{ d }}</div>
              <div v-if="entriesMap.get(dayKey(d)) !== undefined" class="day-score">
                {{ entriesMap.get(dayKey(d)) }}/20
              </div>
            </div>
          </div>

          <div v-if="stats?.lastEntry" class="last">
            <div class="last-title">Dernière entrée</div>
            <div class="last-row">
              <div class="last-date">{{ stats.lastEntry.date }}</div>
              <div class="last-rating">{{ stats.lastEntry.rating }}/20</div>
            </div>
            <div class="last-desc">{{ stats.lastEntry.description }}</div>
          </div>
        </div>

        <div v-if="showUsers" class="users">
          <div class="users-title">Choisir un profil</div>

          <button
            class="user"
            type="button"
            :class="{ active: target === 'me' }"
            @click="selectUser('me')"
          >
            <span class="user-name">Moi</span>
          </button>

          <button
            v-for="u in users"
            :key="u.id"
            class="user"
            type="button"
            :class="{ active: target === u.id }"
            @click="selectUser(u.id)"
          >
            <span class="user-name">{{ u.username }}</span>
          </button>
        </div>
      </template>
    </div>
  </AppShell>
</template>

<style scoped>
.page-center {
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 18px 16px 24px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.step-subtitle {
  opacity: 0.9;
  font-weight: 600;
  margin: 8px 0 12px;
}

.error {
  color: rgba(255, 120, 120, 0.95);
}

.panel {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(10px);
}

.panel-head {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.month {
  text-align: center;
  font-weight: 800;
  text-transform: capitalize;
  letter-spacing: 0.3px;
}

.nav-arrow {
  height: 38px;
  width: 38px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.nav-arrow:hover {
  background: rgba(255, 255, 255, 0.1);
}

.kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 10px 0 14px;
}

.kpi {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px 12px;
}

.kpi-label {
  opacity: 0.8;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.2px;
}

.kpi-value {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 900;
}

.calendar {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.dow {
  text-align: center;
  opacity: 0.7;
  font-weight: 800;
  font-size: 12px;
  padding: 4px 0 2px;
}

.day {
  min-height: 62px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  padding: 8px 8px 6px;
  position: relative;
}

.day.pad {
  border: none;
  background: transparent;
}

.day-number {
  font-weight: 900;
  opacity: 0.92;
}

.day-score {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 800;
  opacity: 0.9;
}

.day.filled {
  border-color: rgba(255, 255, 255, 0.18);
}

.day.today {
  outline: 2px solid rgba(255, 255, 255, 0.35);
  outline-offset: 2px;
}

.last {
  margin-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 12px;
}

.last-title {
  font-weight: 900;
  opacity: 0.9;
  margin-bottom: 8px;
}

.last-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.last-date {
  opacity: 0.85;
  font-weight: 700;
}

.last-rating {
  font-weight: 900;
}

.last-desc {
  opacity: 0.85;
  line-height: 1.35;
}

.users {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 12px;
}

.users-title {
  font-weight: 900;
  margin-bottom: 10px;
  opacity: 0.9;
}

.user {
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  margin-bottom: 8px;
}

.user:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user.active {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.12);
}

.user-name {
  font-weight: 900;
}

/* boutons (reprend le style existant du site si déjà défini globalement) */
.btn {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
  border-radius: 12px;
  padding: 9px 12px;
  font-weight: 800;
  cursor: pointer;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.04);
}
</style>
