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
  todayEntry: null | { date: string; rating: number; description: string };
  participationCount: number;
  currentMonthAvg: number | null;
  monthEntries: MonthEntry[];
};

type UserLite = { id: number; username: string };
type UserStatsPayload = StatsPayload & { user?: UserLite };

const loading = ref(true);
const error = ref<string | null>(null);

const usersLoading = ref(true);
const usersError = ref<string | null>(null);
const users = ref<UserLite[]>([]);

const stats = ref<UserStatsPayload | null>(null);

// cible sélectionnée : "me" ou userId
const target = ref<"me" | number>("me");

// mois sélectionné : "YYYY-MM"
const selectedMonth = ref<string>("");

// -------- API --------
async function loadUsers() {
  usersLoading.value = true;
  usersError.value = null;

  try {
    const res = await authFetch("http://localhost:3000/api/users");
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
    const base =
      t === "me"
        ? "http://localhost:3000/api/me/stats"
        : `http://localhost:3000/api/users/${t}/stats`;

    const month = selectedMonth.value ? `?month=${encodeURIComponent(selectedMonth.value)}` : "";
    const res = await authFetch(`${base}${month}`);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Impossible de charger les stats.");

    stats.value = data as UserStatsPayload;

    // initialise selectedMonth au premier chargement
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

// -------- Helpers calendrier --------
function parseYMD(ymd: string) {
  const [yy, mm, dd] = ymd.split("-").map((v) => Number(v));
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

// rouge -> vert
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
      background: "rgba(255,255,255,.06)",
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
  if (target.value === "me") return "Statistiques — moi";
  const u = users.value.find((x) => x.id === target.value);
  return u ? `Statistiques — ${u.username}` : "Statistiques";
});

function goEditToday() {
  router.push({ name: "note" });
}
</script>

<template>
  <AppShell variant="center" :showDecor="false">
    <div class="page-center">
      <img class="brand-logo" src="../assets/img/tilt.png" alt="tilt" />

      <div class="panel panel--narrow">
        <div class="step-title">{{ headerTitle }}</div>

        <div class="form-group" style="margin-top: 10px;">
          <div v-if="usersLoading" class="step-subtitle">Chargement des utilisateurs…</div>
          <p v-else-if="usersError" class="form-error">{{ usersError }}</p>

          <div v-else class="profile-switch">
            <span class="profile-switch__label">Explorer un profil</span>

            <div class="profile-switch__control">
              <select
                class="profile-switch__select"
                :value="target === 'me' ? 'me' : String(target)"
                @change="onTargetChange"
              >
                <option value="me">Moi</option>
                <option v-for="u in users" :key="u.id" :value="String(u.id)">
                  {{ u.username }}
                </option>
              </select>

              <span class="profile-switch__chevron" aria-hidden="true">▾</span>
            </div>
          </div>
        </div>

        <template v-if="loading">
          <div class="step-subtitle">Chargement…</div>
        </template>

        <template v-else-if="error">
          <p class="form-error">{{ error }}</p>
        </template>

        <template v-else-if="stats">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Dernière note</div>
              <div class="stat-value">
                <span v-if="stats.lastEntry">{{ stats.lastEntry.rating }} / 20</span>
                <span v-else>—</span>
              </div>
              <div class="stat-sub" v-if="stats.lastEntry">({{ stats.lastEntry.date }})</div>
            </div>

            <div class="stat-card">
              <div class="stat-label">Participations</div>
              <div class="stat-value">{{ stats.participationCount }}</div>
              <div class="stat-sub">jours notés</div>
            </div>

            <div class="stat-card">
              <div class="stat-label">Moyenne du mois</div>
              <div class="stat-value">
                <span v-if="stats.currentMonthAvg !== null">{{ stats.currentMonthAvg.toFixed(1) }} / 20</span>
                <span v-else>—</span>
              </div>
              <div class="stat-sub">{{ monthLabel }}</div>
            </div>
          </div>

          <button
            v-if="target === 'me'"
            class="btn btn-primary btn-wide"
            type="button"
            @click="goEditToday"
          >
            MODIFIER MA NOTE DU JOUR
          </button>

          <div class="calendar">
            <div class="calendar-header">
              <div class="calendar-nav">
                <button class="nav-btn" type="button" @click="prevMonth" aria-label="Mois précédent">
                  ‹
                </button>

                <div class="step-subtitle">Calendrier — {{ monthLabel }}</div>

                <button class="nav-btn" type="button" @click="nextMonth" aria-label="Mois suivant">
                  ›
                </button>
              </div>

              <div class="calendar-legend">
                <span class="dot" style="background: rgb(220,60,70)"></span>
                <span class="legend-text">0</span>
                <span class="dot" style="background: rgb(40,200,90)"></span>
                <span class="legend-text">20</span>
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
              <div v-for="i in firstDayOffset" :key="'empty-' + i" class="day empty"></div>

              <div
                v-for="d in monthDays"
                :key="'day-' + d"
                class="day"
                :style="cellStyle(d)"
                :title="dayTitle(d)"
              >
                <div class="day-number">{{ d }}</div>
                <div class="day-rating" v-if="entriesMap.get(dayKey(d)) !== undefined">
                  {{ entriesMap.get(dayKey(d)) }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
/* ---- Switch profil ---- */
.profile-switch{
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-switch__label{
  font-size: 14px;
  font-weight: 700;
  opacity: .9;
}

.profile-switch__control{
  position: relative;
  display: inline-flex;
  align-items: center;
}

.profile-switch__select{
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;

  height: 40px;
  padding: 0 42px 0 14px;

  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.92);

  font-weight: 800;
  letter-spacing: .1px;

  outline: none;
  cursor: pointer;

  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;

  /* évite le dropdown blanc sur blanc */
  color-scheme: dark;
}

.profile-switch__select:hover{
  background: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.16);
}

.profile-switch__select:focus{
  border-color: rgba(255,255,255,.22);
  box-shadow: 0 0 0 3px rgba(255,255,255,.08);
}

.profile-switch__select option{
  background: #0b1020;
  color: rgba(255,255,255,.92);
}

.profile-switch__select option:checked{
  background: #111827;
  color: rgba(255,255,255,.95);
}

.profile-switch__chevron{
  position: absolute;
  right: 14px;
  pointer-events: none;
  opacity: .75;
  font-size: 14px;
  line-height: 1;
}

/* ---- Stats ---- */
.stats-grid{
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 12px;
  margin-bottom: 14px;
}

.stat-card{
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
}

.stat-label{
  font-size: 12px;
  opacity: .7;
  margin-bottom: 6px;
}

.stat-value{
  font-size: 22px;
  font-weight: 900;
  letter-spacing: .2px;
}

.stat-sub{
  margin-top: 4px;
  font-size: 12px;
  opacity: .55;
}

/* ---- Calendar ---- */
.calendar{
  margin-top: 16px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.calendar-header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.calendar-nav{
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.nav-btn{
  width: 34px;
  height: 34px;
  border-radius: 12px;

  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
  color: rgba(255,255,255,.92);

  display: inline-flex;
  align-items: center;
  justify-content: center;

  font-size: 18px;
  font-weight: 900;

  cursor: pointer;
  transition: background .15s ease, border-color .15s ease, transform .06s ease;
}

.nav-btn:hover{
  background: rgba(255,255,255,.09);
  border-color: rgba(255,255,255,.16);
}

.nav-btn:active{
  transform: translateY(1px);
}

.nav-btn:focus{
  outline: none;
  box-shadow: 0 0 0 3px rgba(255,255,255,.08);
}

.calendar-legend{
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: .8;
}

.dot{
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.legend-text{
  font-size: 12px;
  opacity: .8;
}

.calendar-weekdays{
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 8px;
  opacity: .7;
  font-size: 12px;
  text-align: center;
}

.calendar-grid{
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.day{
  border-radius: 14px;
  min-height: 52px;
  padding: 8px 8px 6px;
  position: relative;
}

.day.empty{
  background: transparent !important;
  border: none !important;
}

.day-number{
  font-size: 12px;
  font-weight: 800;
  opacity: .9;
}

.day-rating{
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 12px;
  font-weight: 900;
  opacity: .95;
}
</style>
