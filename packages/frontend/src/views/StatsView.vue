<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import NavMenu from "../components/NavMenu.vue";
import { useAuth } from "../composables/useAuth";

const router = useRouter();
const { authFetch } = useAuth();

// Types
type MonthEntry = { date: string; rating: number; description: string | null; tags: string[] };
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
  lastEntry: null | { date: string; rating: number; description: string; tags: string[] };
  todayEntry: null | { date: string; rating: number; description: string; tags: string[] };
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

type TagStat = {
  tag: string;
  avgRating: number;
  count: number;
};

type TagCorrelation = {
  tag: string;
  withTag: number;
  withoutTag: number;
  impact: number;
  count: number;
};

type TagStatsPayload = {
  byTag: TagStat[];
  distribution: { tag: string; count: number; percent: number }[];
  correlations: TagCorrelation[];
  topPositive: TagCorrelation[];
  topNegative: TagCorrelation[];
};

type DetectiveEntry = {
  userId: number;
  username: string;
  totalGuesses: number;
  correctGuesses: number;
  accuracy: number;
};

type DailyEntry = {
  rank: number;
  userId: number;
  username: string;
  rating: number;
  tags: string[];
};

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
const tagStats = ref<TagStatsPayload | null>(null);
const detectiveLeaderboard = ref<DetectiveEntry[]>([]);
const dailyLeaderboard = ref<DailyEntry[]>([]);

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

async function loadTagStats() {
  try {
    const userId = target.value === "me" ? "me" : target.value;
    const base = userId === "me" ? "/api/me/tags-stats" : `/api/tags-stats`;
    const res = await authFetch(base);
    const data = await res.json().catch(() => ({}));
    if (res.ok) tagStats.value = data;
  } catch {}
}

async function loadDetectiveLeaderboard() {
  try {
    const res = await authFetch("/api/leaderboard/detectives");
    const data = await res.json().catch(() => ({}));
    if (res.ok) detectiveLeaderboard.value = data.leaderboard || [];
  } catch {}
}

async function loadDailyLeaderboard() {
  try {
    const res = await authFetch("/api/leaderboard/daily");
    const data = await res.json().catch(() => ({}));
    if (res.ok) dailyLeaderboard.value = data.entries || [];
  } catch {}
}

async function loadAll() {
  await Promise.all([loadStats(), loadGraphs(), loadLeaderboard(), loadTagStats(), loadDetectiveLeaderboard(), loadDailyLeaderboard()]);
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

// Full entries map with all data
const entriesMapFull = computed(() => {
  const map = new Map<string, MonthEntry>();
  (stats.value?.monthEntries || []).forEach((e) => map.set(e.date, e));
  // Only add todayEntry if not already in monthEntries (to preserve tags)
  if (stats.value?.todayEntry && !map.has(stats.value.todayEntry.date)) {
    map.set(stats.value.todayEntry.date, {
      date: stats.value.todayEntry.date,
      rating: stats.value.todayEntry.rating,
      description: stats.value.todayEntry.description,
      tags: stats.value.todayEntry.tags || [],
    });
  }
  return map;
});

// Simple map for quick rating lookup
const entriesMap = computed(() => {
  const map = new Map<string, number>();
  entriesMapFull.value.forEach((e, key) => map.set(key, e.rating));
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

// Tooltip state
const tooltipDay = ref<number | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });

function showTooltip(day: number, event: MouseEvent) {
  const entry = entriesMapFull.value.get(dayKey(day));
  if (!entry) return;
  tooltipDay.value = day;
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  tooltipPosition.value = { x: rect.left + rect.width / 2, y: rect.top };
}

function hideTooltip() {
  tooltipDay.value = null;
}

function getEntryForDay(day: number): MonthEntry | null {
  return entriesMapFull.value.get(dayKey(day)) || null;
}

// Tag definitions for display
const TAG_NAMES: Record<string, { name: string; icon: string }> = {
  productive: { name: 'Productif', icon: '✅' },
  useful_meeting: { name: 'Reunion utile', icon: '🤝' },
  project_progress: { name: 'Projet avance', icon: '📈' },
  recognition: { name: 'Reconnaissance', icon: '🏆' },
  overload: { name: 'Surcharge', icon: '😫' },
  useless_meeting: { name: 'Reunion inutile', icon: '🙄' },
  work_conflict: { name: 'Conflit', icon: '⚡' },
  deadline: { name: 'Deadline', icon: '⏰' },
  good_exchanges: { name: 'Bons echanges', icon: '💬' },
  party: { name: 'Soiree', icon: '🎉' },
  family_time: { name: 'Famille', icon: '👨‍👩‍👧' },
  new_contacts: { name: 'Nouveaux contacts', icon: '🤗' },
  social_conflict: { name: 'Conflit social', icon: '😤' },
  loneliness: { name: 'Solitude', icon: '😔' },
  misunderstanding: { name: 'Malentendu', icon: '😕' },
  sport: { name: 'Sport', icon: '🏃' },
  good_sleep: { name: 'Bien dormi', icon: '😴' },
  energy: { name: 'Energie', icon: '⚡' },
  sick: { name: 'Malade', icon: '🤒' },
  tired: { name: 'Fatigue', icon: '😩' },
  bad_sleep: { name: 'Mal dormi', icon: '😵' },
  pain: { name: 'Douleurs', icon: '🤕' },
  hobby: { name: 'Hobby', icon: '🎨' },
  accomplishment: { name: 'Accomplissement', icon: '🎯' },
  relaxation: { name: 'Detente', icon: '🧘' },
  good_news: { name: 'Bonne nouvelle', icon: '📰' },
  procrastination: { name: 'Procrastination', icon: '📱' },
  anxiety: { name: 'Anxiete', icon: '😰' },
  bad_news: { name: 'Mauvaise nouvelle', icon: '😢' },
  good_weather: { name: 'Beau temps', icon: '☀️' },
  weekend: { name: 'Week-end', icon: '🎊' },
  bad_weather: { name: 'Mauvais temps', icon: '🌧️' },
  transport_issues: { name: 'Transports', icon: '🚇' },
  unexpected: { name: 'Imprevu', icon: '😱' },
};

function getTagDisplay(tagId: string) {
  return TAG_NAMES[tagId] || { name: tagId, icon: '🏷️' };
}

// Tag categories for correlation table
const TAG_CATEGORIES: Record<string, { name: string; icon: string; tags: string[] }> = {
  work: {
    name: 'Travail',
    icon: '💼',
    tags: ['productive', 'useful_meeting', 'project_progress', 'recognition', 'overload', 'useless_meeting', 'work_conflict', 'deadline'],
  },
  social: {
    name: 'Social',
    icon: '👥',
    tags: ['good_exchanges', 'party', 'family_time', 'new_contacts', 'social_conflict', 'loneliness', 'misunderstanding'],
  },
  health: {
    name: 'Sante',
    icon: '❤️',
    tags: ['sport', 'good_sleep', 'energy', 'sick', 'tired', 'bad_sleep', 'pain'],
  },
  personal: {
    name: 'Personnel',
    icon: '🧠',
    tags: ['hobby', 'accomplishment', 'relaxation', 'good_news', 'procrastination', 'anxiety', 'bad_news'],
  },
  external: {
    name: 'Externe',
    icon: '🌍',
    tags: ['good_weather', 'weekend', 'bad_weather', 'transport_issues', 'unexpected'],
  },
};

// Compute category correlations from tag stats
const categoryCorrelations = computed(() => {
  if (!tagStats.value?.correlations?.length) return [];

  const correlationsMap = new Map(tagStats.value.correlations.map(c => [c.tag, c]));

  return Object.entries(TAG_CATEGORIES).map(([categoryId, category]) => {
    const categoryTags = category.tags
      .map(tag => correlationsMap.get(tag))
      .filter(Boolean) as TagCorrelation[];

    if (categoryTags.length === 0) {
      return { categoryId, ...category, avgImpact: null, count: 0 };
    }

    const totalImpact = categoryTags.reduce((sum, t) => sum + t.impact * t.count, 0);
    const totalCount = categoryTags.reduce((sum, t) => sum + t.count, 0);
    const avgImpact = totalCount > 0 ? totalImpact / totalCount : 0;

    return {
      categoryId,
      ...category,
      avgImpact: Math.round(avgImpact * 10) / 10,
      count: totalCount,
    };
  }).filter(c => c.count > 0);
});

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
              <div
                v-for="d in monthDays"
                :key="'day-' + d"
                class="cal-day"
                :class="{ 'cal-day--has-entry': entriesMap.get(dayKey(d)) !== undefined }"
                :style="cellStyle(d)"
                @mouseenter="showTooltip(d, $event)"
                @mouseleave="hideTooltip"
              >
                <span class="day-num">{{ d }}</span>
                <span class="day-score" v-if="entriesMap.get(dayKey(d)) !== undefined">{{ entriesMap.get(dayKey(d)) }}</span>

                <!-- Tooltip -->
                <div v-if="tooltipDay === d && getEntryForDay(d)" class="cal-tooltip">
                  <div class="tooltip-header">
                    <span class="tooltip-date">{{ dayKey(d) }}</span>
                    <span class="tooltip-rating">{{ getEntryForDay(d)?.rating }}/20</span>
                  </div>
                  <div v-if="getEntryForDay(d)?.description" class="tooltip-comment">
                    "{{ getEntryForDay(d)?.description }}"
                  </div>
                  <div v-if="getEntryForDay(d)?.tags?.length" class="tooltip-tags">
                    <span
                      v-for="tag in getEntryForDay(d)?.tags"
                      :key="tag"
                      class="tooltip-tag"
                    >
                      {{ getTagDisplay(tag).icon }} {{ getTagDisplay(tag).name }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tag Analysis Section -->
          <div class="tags-section">
            <div class="section-title">📊 Analyse des facteurs</div>

            <template v-if="tagStats && (tagStats.topPositive?.length || tagStats.topNegative?.length || categoryCorrelations.length)">
              <div class="tags-grid">
                <!-- Positive impacts -->
                <div class="tags-column" v-if="tagStats.topPositive?.length">
                  <div class="tags-column-title positive">👍 Impact positif</div>
                  <div class="tag-impact-list">
                    <div v-for="t in tagStats.topPositive" :key="t.tag" class="tag-impact-item positive">
                      <span class="tag-icon">{{ getTagDisplay(t.tag).icon }}</span>
                      <span class="tag-name">{{ getTagDisplay(t.tag).name }}</span>
                      <span class="tag-impact-value">+{{ t.impact.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Negative impacts -->
                <div class="tags-column" v-if="tagStats.topNegative?.length">
                  <div class="tags-column-title negative">👎 Impact negatif</div>
                  <div class="tag-impact-list">
                    <div v-for="t in tagStats.topNegative" :key="t.tag" class="tag-impact-item negative">
                      <span class="tag-icon">{{ getTagDisplay(t.tag).icon }}</span>
                      <span class="tag-name">{{ getTagDisplay(t.tag).name }}</span>
                      <span class="tag-impact-value">{{ t.impact.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Most used tags -->
              <div class="tags-distribution" v-if="tagStats.distribution?.length">
                <div class="distribution-title">Tags les plus utilises</div>
                <div class="distribution-bars">
                  <div v-for="t in tagStats.distribution.slice(0, 8)" :key="t.tag" class="distribution-item">
                    <div class="distribution-bar-container">
                      <div class="distribution-bar" :style="{ width: `${Math.min(t.percent * 3, 100)}%` }"></div>
                    </div>
                    <span class="distribution-label">{{ getTagDisplay(t.tag).icon }} {{ t.count }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- Category correlation table -->
            <div class="category-correlation" v-if="categoryCorrelations.length">
              <div class="distribution-title">Impact par categorie</div>
              <div class="category-table">
                <div v-for="cat in categoryCorrelations" :key="cat.categoryId" class="category-row">
                  <div class="category-info">
                    <span class="category-icon">{{ cat.icon }}</span>
                    <span class="category-name">{{ cat.name }}</span>
                  </div>
                  <div class="category-bar-container">
                    <div
                      class="category-bar"
                      :class="{ positive: (cat.avgImpact ?? 0) > 0, negative: (cat.avgImpact ?? 0) < 0 }"
                      :style="{ width: `${Math.min(Math.abs(cat.avgImpact ?? 0) * 10, 100)}%` }"
                    ></div>
                  </div>
                  <div class="category-impact" :class="{ positive: (cat.avgImpact ?? 0) > 0, negative: (cat.avgImpact ?? 0) < 0 }">
                    {{ (cat.avgImpact ?? 0) > 0 ? '+' : '' }}{{ cat.avgImpact ?? 0 }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="tags-empty">
              <span>Pas assez de donnees pour afficher les correlations.</span>
              <span class="tags-hint">Utilisez des tags sur vos notes pour debloquer cette section !</span>
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

          <!-- Daily Leaderboard -->
          <div class="lb-section daily-section">
            <div class="lb-title">📊 Classement du jour</div>
            <div class="lb-list" v-if="dailyLeaderboard.length">
              <div v-for="entry in dailyLeaderboard.slice(0, 5)" :key="entry.userId" class="lb-row">
                <div class="rank" :class="getMedalClass(entry.rank - 1)">{{ entry.rank }}</div>
                <div class="lb-user">{{ entry.username }}</div>
                <div class="lb-tags" v-if="entry.tags?.length">
                  <span v-for="tag in entry.tags.slice(0, 3)" :key="tag" class="mini-tag">{{ getTagDisplay(tag).icon }}</span>
                </div>
                <div class="lb-score">{{ entry.rating }}/20</div>
              </div>
            </div>
            <div v-else class="lb-empty">Aucune entree pour aujourd'hui</div>
          </div>

          <!-- Detective Leaderboard -->
          <div class="lb-section detective-section">
            <div class="lb-title">🕵️ Top Detectives</div>
            <div class="lb-list" v-if="detectiveLeaderboard.length">
              <div v-for="(entry, index) in detectiveLeaderboard.slice(0, 5)" :key="entry.userId" class="lb-row">
                <div class="rank" :class="getMedalClass(index)">{{ index + 1 }}</div>
                <div class="lb-user">{{ entry.username }}</div>
                <div class="lb-score">{{ entry.accuracy }}%</div>
                <div class="lb-sub">({{ entry.correctGuesses }}/{{ entry.totalGuesses }})</div>
              </div>
            </div>
            <div v-else class="lb-empty">
              <span>Pas encore de detectives</span>
              <span class="lb-hint">Devinez qui a ecrit les commentaires pour apparaitre ici !</span>
            </div>
          </div>
        </div>
      </template>

      <NavMenu />
    </div>
  </AppShell>
</template>

<style scoped>
.stats-page {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats-logo { width: 48px; height: auto; }
.stats-title { font-size: 24px; font-weight: 800; margin: 0; }

.tabs {
  display: flex;
  gap: 12px;
  max-width: 400px;
}

.tab {
  flex: 1;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.7);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover { background: rgba(255,255,255,.08); }
.tab.active {
  background: rgba(255,255,255,.12);
  border-color: rgba(255,255,255,.25);
  color: rgba(255,255,255,.95);
}

.loading-msg, .error-msg { text-align: center; padding: 24px; opacity: .7; }
.error-msg { color: #ff7a7a; }

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-label { font-size: 14px; opacity: .7; }

.profile-switch { position: relative; display: inline-flex; }

.profile-select {
  appearance: none;
  height: 40px;
  padding: 0 36px 0 16px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(20,22,40,.95);
  color: rgba(255,255,255,.92);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  color-scheme: dark;
}

.select-chevron {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: .6;
  font-size: 12px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.card {
  border-radius: 14px;
  padding: 20px 16px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  text-align: center;
}

.card-label { font-size: 12px; opacity: .6; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.card-value { font-size: 28px; font-weight: 900; }
.card-value small { font-size: 14px; opacity: .6; }
.card-sub { font-size: 11px; opacity: .5; margin-top: 4px; }

.graphs-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.graph-box {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px;
  padding: 20px;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.graph-title {
  font-size: 14px;
  font-weight: 700;
  opacity: .8;
  margin-bottom: 12px;
}

.graph-header .graph-title { margin-bottom: 0; }

.line-chart { width: 100%; height: auto; }
.grid-line { stroke: rgba(255,255,255,.08); stroke-width: 1; }
.axis-label { fill: rgba(255,255,255,.4); font-size: 10px; }
.user-line { stroke: rgba(255,180,100,.9); stroke-width: 2.5; stroke-linecap: round; }
.global-line { stroke: rgba(255,255,255,.2); stroke-width: 1.5; stroke-dasharray: 4 4; }
.global-line-main { stroke: rgba(100,200,255,.8); stroke-width: 2.5; stroke-linecap: round; }

.chart-legend {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 12px;
}

.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; opacity: .7; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
.legend-dot--user { background: rgba(255,180,100,.9); }
.legend-dot--global { background: rgba(255,255,255,.3); }

.dow-chart { display: flex; justify-content: space-between; gap: 8px; height: 120px; }
.dow-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.dow-bar-container { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.dow-bar { width: 100%; border-radius: 4px 4px 0 0; min-height: 3px; }
.dow-label { font-size: 11px; opacity: .5; }
.dow-value { font-size: 12px; font-weight: 700; }

.heatmap-box { overflow-x: auto; }
.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(53, 1fr);
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  gap: 3px;
  width: 100%;
}
.heatmap-week { display: contents; }
.heatmap-day { aspect-ratio: 1; border-radius: 3px; }
.heatmap-day:hover { outline: 2px solid rgba(255,255,255,.4); }

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 11px;
  opacity: .6;
}

.legend-gradient {
  width: 80px;
  height: 10px;
  border-radius: 3px;
  background: linear-gradient(90deg, rgb(220,60,70), rgb(40,200,90));
}

.year-nav { display: flex; align-items: center; gap: 10px; }
.year-label { font-size: 15px; font-weight: 700; }

.nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.9);
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
}

.nav-btn:hover { background: rgba(255,255,255,.12); }

.calendar-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px;
  padding: 20px;
}

.calendar-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.cal-nav {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.9);
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
}

.cal-nav:hover { background: rgba(255,255,255,.12); }
.cal-month { font-weight: 700; font-size: 16px; text-transform: capitalize; flex: 1; }

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  opacity: .5;
}

.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }

.cal-day {
  position: relative;
  border-radius: 8px;
  min-height: 48px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s;
}

.cal-day:hover { transform: scale(1.05); }
.cal-day.empty { background: transparent !important; border: none !important; }
.cal-day.empty:hover { transform: none; }
.day-num { font-size: 13px; font-weight: 700; opacity: .8; }
.day-score { font-size: 12px; font-weight: 800; opacity: .9; }

.edit-btn { align-self: center; width: auto; padding: 0 32px; margin-top: 12px; }

/* Global tab styles */
.month-row { display: flex; align-items: center; justify-content: center; gap: 16px; }
.month-label-big { font-size: 18px; font-weight: 700; text-transform: capitalize; min-width: 160px; text-align: center; }

.global-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }

.summary-card {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
}

.summary-label { font-size: 12px; opacity: .6; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.summary-value { font-size: 28px; font-weight: 900; }
.summary-value small { font-size: 14px; opacity: .6; }

.leaderboards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

.lb-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px;
  padding: 20px;
}

.lb-title { font-size: 14px; font-weight: 700; opacity: .8; margin-bottom: 16px; }
.lb-list { display: flex; flex-direction: column; gap: 8px; }

.lb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255,255,255,.04);
  border-radius: 10px;
  transition: background 0.2s;
}

.lb-row:hover { background: rgba(255,255,255,.08); }

.rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255,255,255,.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
}

.medal--gold { background: linear-gradient(135deg, rgba(255,215,0,.3), rgba(255,180,0,.2)); border: 1px solid rgba(255,215,0,.4); color: rgba(255,230,150,.95); }
.medal--silver { background: linear-gradient(135deg, rgba(192,192,192,.25), rgba(160,160,160,.15)); border: 1px solid rgba(192,192,192,.35); color: rgba(220,220,220,.95); }
.medal--bronze { background: linear-gradient(135deg, rgba(205,127,50,.25), rgba(180,100,40,.15)); border: 1px solid rgba(205,127,50,.35); color: rgba(230,180,130,.95); }

.lb-user { flex: 1; font-weight: 700; font-size: 14px; }
.lb-score { font-weight: 800; font-size: 14px; opacity: .9; }
.lb-empty {
  text-align: center;
  opacity: .5;
  font-size: 13px;
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lb-hint, .tags-hint {
  font-size: 11px;
  opacity: .7;
  font-style: italic;
}

/* Streak card */
.card--streak .card-value { color: #ff9500; }
.streak-icon { font-size: 20px; margin-right: 6px; }

/* Badges section */
.badges-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px;
  padding: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 16px;
}

.badges-earned {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.badge-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(255,215,0,.15), rgba(255,180,0,.1));
  border: 1px solid rgba(255,215,0,.3);
  border-radius: 24px;
  font-size: 14px;
  cursor: default;
}

.badge-icon { font-size: 18px; }
.badge-name { font-weight: 600; }

.badges-empty {
  text-align: center;
  padding: 16px;
  opacity: .5;
  font-size: 13px;
  margin-bottom: 16px;
}

.badges-progress {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-item {
  background: rgba(255,255,255,.03);
  border-radius: 10px;
  padding: 12px 14px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-name { font-size: 13px; font-weight: 600; opacity: .8; }
.progress-value { font-size: 12px; opacity: .6; }

.progress-bar {
  height: 8px;
  background: rgba(255,255,255,.08);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9500, #ffcc00);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Calendar Tooltip */
.cal-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  min-width: 200px;
  max-width: 280px;
  padding: 12px;
  background: rgba(25, 28, 50, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  animation: tooltipFadeIn 0.15s ease;
}

.cal-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(255, 255, 255, 0.15);
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-date {
  font-size: 11px;
  opacity: 0.6;
}

.tooltip-rating {
  font-size: 16px;
  font-weight: 800;
  color: #ffcc00;
}

.tooltip-comment {
  font-size: 12px;
  font-style: italic;
  opacity: 0.85;
  line-height: 1.4;
  margin-bottom: 8px;
  word-break: break-word;
}

.tooltip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tooltip-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  white-space: nowrap;
}

/* Tags Analysis Section */
.tags-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: 12px;
}

.tags-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.tags-column-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,.1);
}

.tags-column-title.positive { color: #4ade80; }
.tags-column-title.negative { color: #f87171; }

.tag-impact-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-impact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
}

.tag-impact-item.positive { background: rgba(74,222,128,.1); }
.tag-impact-item.negative { background: rgba(248,113,113,.1); }

.tag-icon { font-size: 14px; }
.tag-name { flex: 1; }
.tag-impact-value { font-weight: 800; font-size: 13px; }
.tag-impact-item.positive .tag-impact-value { color: #4ade80; }
.tag-impact-item.negative .tag-impact-value { color: #f87171; }

.tags-empty {
  text-align: center;
  opacity: .5;
  font-size: 12px;
  padding: 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tags-distribution { margin-top: 12px; }

.distribution-title {
  font-size: 11px;
  font-weight: 700;
  opacity: .7;
  margin-bottom: 8px;
}

.distribution-bars {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 80px;
}

.distribution-bar-container {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,.08);
  border-radius: 3px;
  overflow: hidden;
}

.distribution-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 3px;
}

.distribution-label {
  font-size: 10px;
  opacity: .7;
  min-width: 40px;
}

/* Category correlation table */
.category-correlation {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.category-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255,255,255,.03);
  border-radius: 6px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 100px;
}

.category-icon { font-size: 14px; }
.category-name { font-size: 12px; font-weight: 600; }

.category-bar-container {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,.08);
  border-radius: 4px;
  overflow: hidden;
}

.category-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.category-bar.positive { background: linear-gradient(90deg, #22c55e, #4ade80); }
.category-bar.negative { background: linear-gradient(90deg, #ef4444, #f87171); }

.category-impact {
  min-width: 40px;
  text-align: right;
  font-weight: 800;
  font-size: 12px;
}

.category-impact.positive { color: #4ade80; }
.category-impact.negative { color: #f87171; }

/* Daily & Detective sections */
.daily-section, .detective-section {
  margin-top: 20px;
}

.lb-tags {
  display: flex;
  gap: 4px;
  margin-right: 12px;
}

.mini-tag {
  font-size: 14px;
}

.lb-sub {
  font-size: 12px;
  opacity: .6;
  margin-left: 6px;
}

/* Responsive */
@media (max-width: 1200px) {
  .stats-page { padding: 16px 16px; }
  .leaderboards { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 900px) {
  .stats-cards { grid-template-columns: repeat(2, 1fr); }
  .graphs-row { grid-template-columns: 1fr; }
  .leaderboards { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .stats-page { padding: 12px 12px; gap: 16px; }
  .stats-header { gap: 12px; }
  .stats-logo { width: 36px; }
  .stats-title { font-size: 18px; }
  .tabs { max-width: 100%; }
  .tab { padding: 10px 14px; font-size: 13px; }
  .global-summary { grid-template-columns: 1fr; }
  .tags-grid { grid-template-columns: 1fr; }
  .card { padding: 14px 12px; }
  .card-value { font-size: 22px; }
  .graph-box { padding: 14px; }
  .calendar-section { padding: 14px; }
  .lb-section { padding: 14px; }
}
</style>
