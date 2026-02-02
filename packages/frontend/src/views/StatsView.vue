<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import NavMenu from "../components/NavMenu.vue";
import { useAuth } from "../composables/useAuth";

const router = useRouter();
const { authFetch } = useAuth();

// Types
type MonthEntry = { date: string; rating: number };
type MonthlyData = { month: string; avgRating: number; entryCount: number };
type YearEntry = { date: string; rating: number };
type Distribution = { rating: number; count: number };
type DayOfWeek = { dayOfWeek: number; avgRating: number; entryCount: number };

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
};

type BadgeProgress = {
  current: number;
  target: number;
  percent: number;
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
  streak: { currentStreak: number; longestStreak: number };
  badges: Badge[];
  badgeProgress: Record<string, BadgeProgress>;
};

type GraphPayload = {
  year: number;
  userMonthly: MonthlyData[];
  globalMonthly: MonthlyData[];
  yearEntries: YearEntry[];
  distribution: Distribution[];
  byDayOfWeek: DayOfWeek[];
  globalAverage: number | null;
};

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

type UserLite = { id: number; username: string };

// State
const activeTab = ref<"personal" | "global">("personal");
const loading = ref(true);
const error = ref<string | null>(null);

const users = ref<UserLite[]>([]);
const target = ref<"me" | number>("me");
const selectedMonth = ref<string>("");
const selectedYear = ref(new Date().getFullYear());

const stats = ref<StatsPayload | null>(null);
const graphs = ref<GraphPayload | null>(null);
const leaderboard = ref<LeaderboardPayload | null>(null);

// Loaders
async function loadUsers() {
  try {
    const res = await authFetch("/api/users");
    const data = await res.json().catch(() => ({}));
    if (res.ok) users.value = Array.isArray(data?.users) ? data.users : [];
  } catch {}
}

async function loadStats() {
  loading.value = true;
  error.value = null;
  try {
    const base = target.value === "me" ? "/api/me/stats" : `/api/users/${target.value}/stats`;
    const month = selectedMonth.value ? `?month=${encodeURIComponent(selectedMonth.value)}` : "";
    const res = await authFetch(`${base}${month}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Erreur");
    stats.value = data;
    if (!selectedMonth.value && data?.monthStart) {
      selectedMonth.value = data.monthStart.slice(0, 7);
    }
  } catch (e: unknown) {
    error.value = (e as Error)?.message ?? "Erreur";
  } finally {
    loading.value = false;
  }
}

async function loadGraphs() {
  try {
    const userId = target.value === "me" ? "me" : target.value;
    const base = userId === "me" ? "/api/me/graphs" : `/api/users/${userId}/graphs`;
    const res = await authFetch(`${base}?year=${selectedYear.value}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) graphs.value = data;
  } catch {}
}

async function loadLeaderboard() {
  try {
    const month = selectedMonth.value ? `?month=${encodeURIComponent(selectedMonth.value)}` : "";
    const res = await authFetch(`/api/leaderboard${month}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) leaderboard.value = data;
  } catch {}
}

async function loadAll() {
  await Promise.all([loadStats(), loadGraphs(), loadLeaderboard()]);
}

onMounted(async () => {
  await loadUsers();
  await loadAll();
});

// Helpers
function shiftMonth(ym: string, delta: number) {
  const parts = ym.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseYMD(ymd: string): Date {
  const parts = ymd.split("-").map((v) => Number(v)) as [number, number, number];
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function ratingToColor(rating: number): string {
  const t = Math.max(0, Math.min(20, rating)) / 20;
  const r = Math.round(220 * (1 - t) + 40 * t);
  const g = Math.round(60 * (1 - t) + 200 * t);
  const b = Math.round(70 * (1 - t) + 90 * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function prevMonth() {
  if (!selectedMonth.value) return;
  selectedMonth.value = shiftMonth(selectedMonth.value, -1);
  loadAll();
}

function nextMonth() {
  if (!selectedMonth.value) return;
  selectedMonth.value = shiftMonth(selectedMonth.value, 1);
  loadAll();
}

function onTargetChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value;
  target.value = v === "me" ? "me" : Number(v);
  loadAll();
}

function prevYear() {
  selectedYear.value--;
  loadGraphs();
}

function nextYear() {
  selectedYear.value++;
  loadGraphs();
}

function goEditToday() {
  router.push({ name: "note" });
}

// Computed
const monthLabel = computed(() => {
  if (!stats.value) return "";
  const d = parseYMD(stats.value.monthStart);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
});

const monthDays = computed(() => {
  if (!stats.value) return 30;
  const start = parseYMD(stats.value.monthStart);
  return new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
});

const firstDayOffset = computed(() => {
  if (!stats.value) return 0;
  const start = parseYMD(stats.value.monthStart);
  return (start.getDay() + 6) % 7;
});

const entriesMap = computed(() => {
  const map = new Map<string, number>();
  (stats.value?.monthEntries || []).forEach((e) => map.set(e.date, e.rating));
  if (stats.value?.todayEntry) map.set(stats.value.todayEntry.date, stats.value.todayEntry.rating);
  return map;
});

function dayKey(day: number) {
  if (!stats.value) return "";
  const start = parseYMD(stats.value.monthStart);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-${String(day).padStart(2, "0")}`;
}

function cellStyle(day: number) {
  const rating = entriesMap.value.get(dayKey(day));
  if (rating === undefined) return { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" };
  return { background: ratingToColor(rating), border: "1px solid rgba(255,255,255,.14)" };
}

// Heatmap
const heatmapData = computed(() => {
  const map = new Map<string, number>();
  for (const e of graphs.value?.yearEntries || []) map.set(e.date, e.rating);
  return map;
});

const heatmapWeeks = computed(() => {
  const year = selectedYear.value;
  const weeks: { date: string; dayOfWeek: number }[][] = [];
  const startDate = new Date(year, 0, 1);
  const startDayOfWeek = (startDate.getDay() + 6) % 7;
  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() - startDayOfWeek);

  for (let week = 0; week < 53; week++) {
    const days: { date: string; dayOfWeek: number }[] = [];
    for (let day = 0; day < 7; day++) {
      days.push({ date: currentDate.toISOString().slice(0, 10), dayOfWeek: day });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
});

// Line chart
const chartWidth = 500;
const chartHeight = 160;
const chartPadding = 30;

const lineChartPoints = computed(() => {
  if (!graphs.value?.userMonthly.length) return "";
  const months = graphs.value.userMonthly;
  const xStep = (chartWidth - chartPadding * 2) / Math.max(months.length - 1, 1);
  return months.map((m, i) => {
    const x = chartPadding + i * xStep;
    const y = chartHeight - chartPadding - (m.avgRating / 20) * (chartHeight - chartPadding * 2);
    return `${x},${y}`;
  }).join(" ");
});

const globalLinePoints = computed(() => {
  if (!graphs.value?.globalMonthly.length) return "";
  const months = graphs.value.globalMonthly;
  const xStep = (chartWidth - chartPadding * 2) / Math.max(months.length - 1, 1);
  return months.map((m, i) => {
    const x = chartPadding + i * xStep;
    const y = chartHeight - chartPadding - (m.avgRating / 20) * (chartHeight - chartPadding * 2);
    return `${x},${y}`;
  }).join(" ");
});

const monthLabelsChart = computed(() => {
  if (!graphs.value?.userMonthly.length) return [];
  const months = graphs.value.userMonthly;
  const xStep = (chartWidth - chartPadding * 2) / Math.max(months.length - 1, 1);
  return months.map((m, i) => ({ x: chartPadding + i * xStep, label: m.month.slice(5) }));
});

// Day of week
const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const dayOfWeekData = computed(() => {
  if (!graphs.value?.byDayOfWeek.length) return [];
  return Array(7).fill(null).map((_, i) => {
    const found = graphs.value!.byDayOfWeek.find((d) => d.dayOfWeek === i);
    return { dayOfWeek: i, avgRating: found?.avgRating ?? 0, entryCount: found?.entryCount ?? 0 };
  });
});

// Leaderboard helpers
function getMedalClass(index: number): string {
  if (index === 0) return "medal--gold";
  if (index === 1) return "medal--silver";
  if (index === 2) return "medal--bronze";
  return "";
}

const headerTitle = computed(() => {
  if (target.value === "me") return "Mes statistiques";
  const u = users.value.find((x) => x.id === target.value);
  return u ? `Stats de ${u.username}` : "Statistiques";
});

// Badge name mapping
const badgeNames: Record<string, string> = {
  streak_7: "7 jours de suite",
  streak_30: "Mois parfait",
  reviewer_100: "Reviewer (100 notes)",
};

function getBadgeName(key: string): string {
  return badgeNames[key] || key;
}
</script>

<template>
  <AppShell variant="center" :showDecor="false">
    <div class="stats-page">
      <header class="stats-header">
        <img class="stats-logo" src="../assets/img/tilt.png" alt="tilt" />
        <h1 class="stats-title">{{ activeTab === 'personal' ? headerTitle : 'Stats globales' }}</h1>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'personal' }" @click="activeTab = 'personal'">
          Mon profil
        </button>
        <button class="tab" :class="{ active: activeTab === 'global' }" @click="activeTab = 'global'">
          Stats globales
        </button>
      </div>

      <div v-if="loading" class="loading-msg">Chargement...</div>
      <div v-else-if="error" class="error-msg">{{ error }}</div>

      <!-- Personal Stats Tab -->
      <template v-else-if="activeTab === 'personal' && stats">
        <div class="stats-content">
          <!-- Profile selector -->
          <div class="profile-row">
            <span class="profile-label">Profil :</span>
            <div class="profile-switch">
              <select class="profile-select" :value="target === 'me' ? 'me' : String(target)" @change="onTargetChange">
                <option value="me">Moi</option>
                <option v-for="u in users" :key="u.id" :value="String(u.id)">{{ u.username }}</option>
              </select>
              <span class="select-chevron">▾</span>
            </div>
          </div>

          <!-- Cards -->
          <div class="stats-cards">
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
              <div class="card-sub">jours notes</div>
            </div>
            <div class="card card--streak">
              <div class="card-label">Streak actuel</div>
              <div class="card-value">
                <span class="streak-icon">🔥</span>
                {{ stats.streak?.currentStreak || 0 }}
              </div>
              <div class="card-sub">jours consecutifs</div>
            </div>
            <div class="card">
              <div class="card-label">Record streak</div>
              <div class="card-value">
                <span class="streak-icon">🏆</span>
                {{ stats.streak?.longestStreak || 0 }}
              </div>
              <div class="card-sub">meilleur streak</div>
            </div>
          </div>

          <!-- Badges Section -->
          <div class="badges-section" v-if="stats.badges?.length || stats.badgeProgress">
            <div class="section-title">🎖️ Badges</div>

            <!-- Earned Badges -->
            <div class="badges-earned" v-if="stats.badges?.length">
              <div class="badge-item" v-for="badge in stats.badges" :key="badge.id" :title="badge.description">
                <span class="badge-icon">{{ badge.icon }}</span>
                <span class="badge-name">{{ badge.name }}</span>
              </div>
            </div>
            <div class="badges-empty" v-else>
              <span>Aucun badge pour l'instant</span>
            </div>

            <!-- Badge Progress -->
            <div class="badges-progress" v-if="stats.badgeProgress">
              <div class="progress-item" v-for="(prog, key) in stats.badgeProgress" :key="key">
                <div class="progress-header">
                  <span class="progress-name">{{ getBadgeName(key) }}</span>
                  <span class="progress-value">{{ prog.current }}/{{ prog.target }}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${prog.percent}%` }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Graphs Row -->
          <div class="graphs-row">
            <!-- Evolution Chart -->
            <div class="graph-box">
              <div class="graph-title">Evolution sur 12 mois</div>
              <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="line-chart">
                <line v-for="i in 5" :key="'grid-' + i"
                  :x1="chartPadding" :y1="chartPadding + ((i - 1) * (chartHeight - chartPadding * 2)) / 4"
                  :x2="chartWidth - chartPadding" :y2="chartPadding + ((i - 1) * (chartHeight - chartPadding * 2)) / 4"
                  class="grid-line" />
                <text v-for="i in 5" :key="'y-' + i" :x="chartPadding - 6"
                  :y="chartPadding + ((i - 1) * (chartHeight - chartPadding * 2)) / 4 + 3"
                  class="axis-label" text-anchor="end">{{ 20 - (i - 1) * 5 }}</text>
                <text v-for="label in monthLabelsChart" :key="'x-' + label.label"
                  :x="label.x" :y="chartHeight - 8" class="axis-label" text-anchor="middle">{{ label.label }}</text>
                <polyline v-if="globalLinePoints" :points="globalLinePoints" class="global-line" fill="none" />
                <polyline v-if="lineChartPoints" :points="lineChartPoints" class="user-line" fill="none" />
              </svg>
              <div class="chart-legend">
                <span class="legend-item"><span class="legend-dot legend-dot--user"></span>Moi</span>
                <span class="legend-item"><span class="legend-dot legend-dot--global"></span>Global</span>
              </div>
            </div>

            <!-- Day of Week -->
            <div class="graph-box">
              <div class="graph-title">Moyenne par jour</div>
              <div class="dow-chart">
                <div v-for="d in dayOfWeekData" :key="'dow-' + d.dayOfWeek" class="dow-item">
                  <div class="dow-bar-container">
                    <div class="dow-bar" :style="{ height: `${(d.avgRating / 20) * 100}%`, background: ratingToColor(d.avgRating) }"></div>
                  </div>
                  <span class="dow-label">{{ dayLabels[d.dayOfWeek] }}</span>
                  <span class="dow-value">{{ d.avgRating || '-' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Heatmap -->
          <div class="graph-box heatmap-box">
            <div class="graph-header">
              <div class="graph-title">Heatmap {{ selectedYear }}</div>
              <div class="year-nav">
                <button class="nav-btn" @click="prevYear">‹</button>
                <span class="year-label">{{ selectedYear }}</span>
                <button class="nav-btn" @click="nextYear">›</button>
              </div>
            </div>
            <div class="heatmap-grid">
              <div v-for="(week, wi) in heatmapWeeks" :key="'week-' + wi" class="heatmap-week">
                <div v-for="day in week" :key="day.date" class="heatmap-day"
                  :style="{ background: heatmapData.get(day.date) !== undefined ? ratingToColor(heatmapData.get(day.date)!) : 'rgba(255,255,255,0.04)' }"
                  :title="`${day.date}: ${heatmapData.get(day.date) ?? 'Pas de note'}`"></div>
              </div>
            </div>
            <div class="heatmap-legend">
              <span>0</span>
              <div class="legend-gradient"></div>
              <span>20</span>
            </div>
          </div>

          <!-- Calendar -->
          <div class="calendar-section">
            <div class="calendar-head">
              <button class="cal-nav" @click="prevMonth">‹</button>
              <span class="cal-month">{{ monthLabel }}</span>
              <button class="cal-nav" @click="nextMonth">›</button>
            </div>
            <div class="calendar-weekdays">
              <div class="weekday">L</div><div class="weekday">M</div><div class="weekday">M</div>
              <div class="weekday">J</div><div class="weekday">V</div><div class="weekday">S</div><div class="weekday">D</div>
            </div>
            <div class="calendar-grid">
              <div v-for="i in firstDayOffset" :key="'empty-' + i" class="cal-day empty"></div>
              <div v-for="d in monthDays" :key="'day-' + d" class="cal-day" :style="cellStyle(d)">
                <span class="day-num">{{ d }}</span>
                <span class="day-score" v-if="entriesMap.get(dayKey(d)) !== undefined">{{ entriesMap.get(dayKey(d)) }}</span>
              </div>
            </div>
          </div>

          <button v-if="target === 'me'" class="btn btn-primary edit-btn" @click="goEditToday">MODIFIER MA NOTE</button>
        </div>
      </template>

      <!-- Global Stats Tab -->
      <template v-else-if="activeTab === 'global' && leaderboard">
        <div class="stats-content">
          <!-- Month selector -->
          <div class="month-row">
            <button class="cal-nav" @click="prevMonth">‹</button>
            <span class="month-label-big">{{ monthLabel }}</span>
            <button class="cal-nav" @click="nextMonth">›</button>
          </div>

          <!-- Global stats summary -->
          <div class="global-summary" v-if="graphs">
            <div class="summary-card">
              <div class="summary-label">Moyenne globale</div>
              <div class="summary-value">{{ graphs.globalAverage ?? '—' }}<small>/20</small></div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Participants ce mois</div>
              <div class="summary-value">{{ leaderboard.monthly.length }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total participants</div>
              <div class="summary-value">{{ leaderboard.allTime.length }}</div>
            </div>
          </div>

          <!-- Leaderboards -->
          <div class="leaderboards">
            <div class="lb-section">
              <div class="lb-title">Top du mois</div>
              <div class="lb-list">
                <div v-for="(entry, index) in leaderboard.monthly.slice(0, 5)" :key="entry.userId" class="lb-row">
                  <div class="rank" :class="getMedalClass(index)">{{ index + 1 }}</div>
                  <div class="lb-user">{{ entry.username }}</div>
                  <div class="lb-score">{{ entry.avgRating }}/20</div>
                </div>
                <div v-if="!leaderboard.monthly.length" class="lb-empty">Aucune donnée</div>
              </div>
            </div>

            <div class="lb-section">
              <div class="lb-title">All-time</div>
              <div class="lb-list">
                <div v-for="(entry, index) in leaderboard.allTime.slice(0, 5)" :key="entry.userId" class="lb-row">
                  <div class="rank" :class="getMedalClass(index)">{{ index + 1 }}</div>
                  <div class="lb-user">{{ entry.username }}</div>
                  <div class="lb-score">{{ entry.avgRating }}/20</div>
                </div>
              </div>
            </div>

            <div class="lb-section">
              <div class="lb-title">Top participants</div>
              <div class="lb-list">
                <div v-for="(entry, index) in leaderboard.topParticipants.slice(0, 5)" :key="entry.userId" class="lb-row">
                  <div class="rank" :class="getMedalClass(index)">{{ index + 1 }}</div>
                  <div class="lb-user">{{ entry.username }}</div>
                  <div class="lb-score">{{ entry.entryCount }} j</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Global evolution chart -->
          <div class="graph-box" v-if="graphs?.globalMonthly.length">
            <div class="graph-title">Evolution globale sur 12 mois</div>
            <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="line-chart">
              <line v-for="i in 5" :key="'grid-' + i"
                :x1="chartPadding" :y1="chartPadding + ((i - 1) * (chartHeight - chartPadding * 2)) / 4"
                :x2="chartWidth - chartPadding" :y2="chartPadding + ((i - 1) * (chartHeight - chartPadding * 2)) / 4"
                class="grid-line" />
              <polyline :points="globalLinePoints" class="global-line-main" fill="none" />
            </svg>
          </div>
        </div>
      </template>

      <NavMenu />
    </div>
  </AppShell>
</template>

<style scoped>
.stats-page {
  width: min(1000px, 95vw);
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.stats-logo { width: 42px; height: auto; }
.stats-title { font-size: 20px; font-weight: 800; margin: 0; }

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  flex: 1;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.7);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.tab:hover { background: rgba(255,255,255,.08); }
.tab.active {
  background: rgba(255,255,255,.12);
  border-color: rgba(255,255,255,.25);
  color: rgba(255,255,255,.95);
}

.loading-msg, .error-msg { text-align: center; padding: 20px; opacity: .7; }
.error-msg { color: #ff7a7a; }

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-label { font-size: 13px; opacity: .7; }

.profile-switch { position: relative; display: inline-flex; }

.profile-select {
  appearance: none;
  height: 34px;
  padding: 0 32px 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(20,22,40,.95);
  color: rgba(255,255,255,.92);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  color-scheme: dark;
}

.select-chevron {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: .6;
  font-size: 11px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.card {
  border-radius: 10px;
  padding: 10px 12px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  text-align: center;
}

.card-label { font-size: 10px; opacity: .6; font-weight: 600; margin-bottom: 3px; }
.card-value { font-size: 20px; font-weight: 900; }
.card-value small { font-size: 11px; opacity: .6; }
.card-sub { font-size: 9px; opacity: .5; margin-top: 2px; }

.graphs-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
}

.graph-box {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: 12px;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.graph-title {
  font-size: 12px;
  font-weight: 700;
  opacity: .8;
  margin-bottom: 8px;
}

.graph-header .graph-title { margin-bottom: 0; }

.line-chart { width: 100%; height: auto; }
.grid-line { stroke: rgba(255,255,255,.08); stroke-width: 1; }
.axis-label { fill: rgba(255,255,255,.4); font-size: 9px; }
.user-line { stroke: rgba(255,180,100,.9); stroke-width: 2; stroke-linecap: round; }
.global-line { stroke: rgba(255,255,255,.2); stroke-width: 1.5; stroke-dasharray: 4 4; }
.global-line-main { stroke: rgba(100,200,255,.8); stroke-width: 2; stroke-linecap: round; }

.chart-legend {
  display: flex;
  gap: 14px;
  justify-content: center;
  margin-top: 8px;
}

.legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; opacity: .7; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-dot--user { background: rgba(255,180,100,.9); }
.legend-dot--global { background: rgba(255,255,255,.3); }

.dow-chart { display: flex; justify-content: space-between; gap: 6px; height: 100px; }
.dow-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.dow-bar-container { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.dow-bar { width: 100%; border-radius: 3px 3px 0 0; min-height: 2px; }
.dow-label { font-size: 9px; opacity: .5; }
.dow-value { font-size: 10px; font-weight: 700; }

.heatmap-box { overflow-x: auto; }
.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(53, 1fr);
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  gap: 2px;
  width: 100%;
}
.heatmap-week { display: contents; }
.heatmap-day { aspect-ratio: 1; border-radius: 2px; }
.heatmap-day:hover { outline: 1px solid rgba(255,255,255,.4); }

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 9px;
  opacity: .6;
}

.legend-gradient {
  width: 50px;
  height: 8px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgb(220,60,70), rgb(40,200,90));
}

.year-nav { display: flex; align-items: center; gap: 8px; }
.year-label { font-size: 13px; font-weight: 700; }

.nav-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.9);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.nav-btn:hover { background: rgba(255,255,255,.1); }

.calendar-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: 12px;
}

.calendar-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.cal-nav {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.9);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.cal-nav:hover { background: rgba(255,255,255,.1); }
.cal-month { font-weight: 700; font-size: 14px; text-transform: capitalize; flex: 1; }

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  opacity: .5;
}

.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }

.cal-day {
  border-radius: 6px;
  min-height: 36px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.cal-day.empty { background: transparent !important; border: none !important; }
.day-num { font-size: 11px; font-weight: 700; opacity: .8; }
.day-score { font-size: 10px; font-weight: 800; opacity: .9; }

.edit-btn { align-self: center; width: auto; padding: 0 28px; margin-top: 6px; }

/* Global tab styles */
.month-row { display: flex; align-items: center; justify-content: center; gap: 14px; }
.month-label-big { font-size: 16px; font-weight: 700; text-transform: capitalize; min-width: 140px; text-align: center; }

.global-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

.summary-card {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.summary-label { font-size: 11px; opacity: .6; margin-bottom: 4px; }
.summary-value { font-size: 22px; font-weight: 900; }
.summary-value small { font-size: 12px; opacity: .6; }

.leaderboards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

.lb-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: 12px;
}

.lb-title { font-size: 12px; font-weight: 700; opacity: .8; margin-bottom: 10px; }
.lb-list { display: flex; flex-direction: column; gap: 6px; }

.lb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(255,255,255,.04);
  border-radius: 6px;
}

.rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255,255,255,.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 11px;
}

.medal--gold { background: linear-gradient(135deg, rgba(255,215,0,.3), rgba(255,180,0,.2)); border: 1px solid rgba(255,215,0,.4); color: rgba(255,230,150,.95); }
.medal--silver { background: linear-gradient(135deg, rgba(192,192,192,.25), rgba(160,160,160,.15)); border: 1px solid rgba(192,192,192,.35); color: rgba(220,220,220,.95); }
.medal--bronze { background: linear-gradient(135deg, rgba(205,127,50,.25), rgba(180,100,40,.15)); border: 1px solid rgba(205,127,50,.35); color: rgba(230,180,130,.95); }

.lb-user { flex: 1; font-weight: 700; font-size: 12px; }
.lb-score { font-weight: 800; font-size: 12px; opacity: .9; }
.lb-empty { text-align: center; opacity: .5; font-size: 12px; padding: 10px; }

/* Streak card */
.card--streak .card-value { color: #ff9500; }
.streak-icon { font-size: 16px; margin-right: 4px; }

/* Badges section */
.badges-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
}

.badges-earned {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.badge-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(255,215,0,.15), rgba(255,180,0,.1));
  border: 1px solid rgba(255,215,0,.3);
  border-radius: 20px;
  font-size: 12px;
  cursor: default;
}

.badge-icon { font-size: 16px; }
.badge-name { font-weight: 600; }

.badges-empty {
  text-align: center;
  padding: 12px;
  opacity: .5;
  font-size: 12px;
  margin-bottom: 12px;
}

.badges-progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-item {
  background: rgba(255,255,255,.03);
  border-radius: 8px;
  padding: 8px 10px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.progress-name { font-size: 11px; font-weight: 600; opacity: .8; }
.progress-value { font-size: 10px; opacity: .6; }

.progress-bar {
  height: 6px;
  background: rgba(255,255,255,.08);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9500, #ffcc00);
  border-radius: 3px;
  transition: width 0.3s ease;
}

@media (max-width: 768px) {
  .stats-cards { grid-template-columns: repeat(2, 1fr); }
  .graphs-row { grid-template-columns: 1fr; }
  .leaderboards { grid-template-columns: 1fr; }
  .global-summary { grid-template-columns: 1fr; }
}
</style>
