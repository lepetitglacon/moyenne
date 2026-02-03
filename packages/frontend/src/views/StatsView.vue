<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import NavMenu from "../components/NavMenu.vue";
import { useAuth } from "../composables/useAuth";
import { Line, Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const router = useRouter();
const { authFetch, token } = useAuth();

// Get current user ID from JWT token
function getCurrentUserId(): number | null {
  if (!token.value) return null;
  try {
    const parts = token.value.split('.');
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(atob(payloadPart));
    return payload.id ?? payload.userId ?? null;
  } catch {
    return null;
  }
}

const currentUserId = computed(() => getCurrentUserId());

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

// Filter out current user from the list (to avoid duplicate "Moi" + username)
const otherUsers = computed(() => {
  const myId = currentUserId.value;
  if (myId === null) return users.value;
  return users.value.filter(u => u.id !== myId);
});
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
  // Only load personal tag stats (no API for other users' tags)
  if (target.value !== "me") {
    tagStats.value = null;
    return;
  }
  try {
    const res = await authFetch("/api/me/tags-stats");
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

// Chart.js options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        color: 'rgba(255,255,255,0.7)',
        font: { size: 11 },
        boxWidth: 12,
        padding: 15,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(30,35,60,0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255,255,255,0.8)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } },
    },
    y: {
      min: 0,
      max: 20,
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 }, stepSize: 5 },
    },
  },
};

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(30,35,60,0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255,255,255,0.8)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
    },
    y: {
      min: 0,
      max: 20,
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 }, stepSize: 5 },
    },
  },
};

// Evolution chart data
const evolutionChartData = computed(() => {
  const userMonthly = graphs.value?.userMonthly || [];
  const globalMonthly = graphs.value?.globalMonthly || [];

  // Use user months as labels, fallback to global if empty
  const months = userMonthly.length ? userMonthly : globalMonthly;
  const labels = months.map(m => {
    const parts = m.month.split('-');
    const month = parts[1] || '01';
    const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(month) - 1] || month;
  });

  return {
    labels,
    datasets: [
      {
        label: 'Moi',
        data: userMonthly.map(m => m.avgRating),
        borderColor: 'rgba(255,180,100,0.9)',
        backgroundColor: 'rgba(255,180,100,0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(255,180,100,1)',
      },
      {
        label: 'Global',
        data: globalMonthly.map(m => m.avgRating),
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 5],
        tension: 0.3,
        fill: false,
        pointRadius: 2,
        pointBackgroundColor: 'rgba(255,255,255,0.5)',
      },
    ],
  };
});

// Global-only chart data
const globalChartData = computed(() => {
  const globalMonthly = graphs.value?.globalMonthly || [];

  const labels = globalMonthly.map(m => {
    const parts = m.month.split('-');
    const month = parts[1] || '01';
    const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(month) - 1] || month;
  });

  return {
    labels,
    datasets: [
      {
        label: 'Moyenne globale',
        data: globalMonthly.map(m => m.avgRating),
        borderColor: 'rgba(100,200,255,0.9)',
        backgroundColor: 'rgba(100,200,255,0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(100,200,255,1)',
      },
    ],
  };
});

// Day of week bar chart data
const dowChartData = computed(() => {
  const data = graphs.value?.byDayOfWeek || [];
  const dayLabelsShort = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  // Create array with all days, filling missing with 0
  const values = dayLabelsShort.map((_, i) => {
    const found = data.find(d => d.dayOfWeek === i);
    return found?.avgRating ?? 0;
  });

  // Generate colors based on rating
  const colors = values.map(v => {
    if (v === 0) return 'rgba(255,255,255,0.1)';
    const t = v / 20;
    const r = Math.round(220 * (1 - t) + 40 * t);
    const g = Math.round(60 * (1 - t) + 200 * t);
    const b = Math.round(70 * (1 - t) + 90 * t);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  });

  return {
    labels: dayLabelsShort,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };
});

const hasEvolutionData = computed(() => {
  return (graphs.value?.userMonthly?.length ?? 0) > 0 || (graphs.value?.globalMonthly?.length ?? 0) > 0;
});

const hasDowData = computed(() => {
  return (graphs.value?.byDayOfWeek?.length ?? 0) > 0;
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
        <div class="header-left">
          <img class="stats-logo" src="../assets/img/tilt.png" alt="tilt" />
          <h1 class="stats-title">{{ activeTab === 'personal' ? headerTitle : 'Stats globales' }}</h1>
        </div>
        <!-- Tabs inline in header -->
        <div class="tabs">
          <button class="tab" :class="{ active: activeTab === 'personal' }" @click="activeTab = 'personal'">Profil</button>
          <button class="tab" :class="{ active: activeTab === 'global' }" @click="activeTab = 'global'">Global</button>
        </div>
        <!-- Profile selector inline -->
        <div class="profile-switch" v-if="activeTab === 'personal'">
          <select class="profile-select" :value="target === 'me' ? 'me' : String(target)" @change="onTargetChange">
            <option value="me">Moi</option>
            <option v-for="u in otherUsers" :key="u.id" :value="String(u.id)">{{ u.username }}</option>
          </select>
          <span class="select-chevron">▾</span>
        </div>
      </header>

      <div v-if="loading" class="loading-msg">Chargement...</div>
      <div v-else-if="error" class="error-msg">{{ error }}</div>

      <!-- Personal Stats Tab -->
      <template v-else-if="activeTab === 'personal' && stats">
        <div class="stats-content">
          <!-- Stats Cards Row -->
          <div class="stats-cards">
            <div class="card">
              <div class="card-label">Moyenne</div>
              <div class="card-value">
                <span v-if="stats.currentMonthAvg !== null">{{ stats.currentMonthAvg.toFixed(1) }}<small>/20</small></span>
                <span v-else>—</span>
              </div>
            </div>
            <div class="card">
              <div class="card-label">Participations</div>
              <div class="card-value">{{ stats.participationCount }}</div>
            </div>
            <div class="card card--streak">
              <div class="card-label">Streak</div>
              <div class="card-value">🔥 {{ stats.streak?.currentStreak || 0 }}</div>
            </div>
            <div class="card">
              <div class="card-label">Record</div>
              <div class="card-value">🏆 {{ stats.streak?.longestStreak || 0 }}</div>
            </div>
          </div>

          <!-- Dashboard Grid -->
          <div class="dashboard-grid" :class="{ 'two-columns': target !== 'me' }">
            <!-- Column 1: Calendar + Badges -->
            <div class="dashboard-col">
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
                  <div v-for="d in monthDays" :key="'day-' + d" class="cal-day"
                    :class="{ 'cal-day--has-entry': entriesMap.get(dayKey(d)) !== undefined }"
                    :style="cellStyle(d)" @mouseenter="showTooltip(d, $event)" @mouseleave="hideTooltip">
                    <span class="day-num">{{ d }}</span>
                    <div v-if="tooltipDay === d && getEntryForDay(d)" class="cal-tooltip">
                      <div class="tooltip-header">
                        <span class="tooltip-date">{{ dayKey(d) }}</span>
                        <span class="tooltip-rating">{{ getEntryForDay(d)?.rating }}/20</span>
                      </div>
                      <div v-if="getEntryForDay(d)?.description" class="tooltip-comment">"{{ getEntryForDay(d)?.description }}"</div>
                      <div v-if="getEntryForDay(d)?.tags?.length" class="tooltip-tags">
                        <span v-for="tag in getEntryForDay(d)?.tags" :key="tag" class="tooltip-tag">{{ getTagDisplay(tag).icon }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Badges compact -->
              <div class="badges-section" v-if="stats.badges?.length || stats.badgeProgress">
                <div class="section-title">🎖️ Badges</div>
                <div class="badges-earned" v-if="stats.badges?.length">
                  <div class="badge-item" v-for="badge in stats.badges" :key="badge.id" :title="badge.description">
                    <span class="badge-icon">{{ badge.icon }}</span>
                    <span class="badge-name">{{ badge.name }}</span>
                  </div>
                </div>
                <div class="badges-empty" v-else>Aucun badge obtenu</div>
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
              <button v-if="target === 'me'" class="btn btn-primary edit-btn" @click="goEditToday">MODIFIER MA NOTE</button>
            </div>

            <!-- Column 2: Charts -->
            <div class="dashboard-col">
              <div class="graph-box">
                <div class="graph-title">Evolution 12 mois</div>
                <div v-if="hasEvolutionData" class="chart-container">
                  <Line :data="evolutionChartData" :options="chartOptions" />
                </div>
                <div v-else class="graph-empty">Pas encore de donnees</div>
              </div>

              <div class="graph-box">
                <div class="graph-title">Moyenne par jour</div>
                <div v-if="hasDowData" class="chart-container chart-container--bar">
                  <Bar :data="dowChartData" :options="barChartOptions" />
                </div>
                <div v-else class="graph-empty">Pas encore de donnees</div>
              </div>

              <!-- Heatmap compact -->
              <div class="graph-box heatmap-box">
                <div class="graph-header">
                  <div class="graph-title">{{ selectedYear }}</div>
                  <div class="year-nav">
                    <button class="nav-btn" @click="prevYear">‹</button>
                    <button class="nav-btn" @click="nextYear">›</button>
                  </div>
                </div>
                <div class="heatmap-grid">
                  <div v-for="(week, wi) in heatmapWeeks" :key="'week-' + wi" class="heatmap-week">
                    <div v-for="day in week" :key="day.date" class="heatmap-day"
                      :style="{ background: heatmapData.get(day.date) !== undefined ? ratingToColor(heatmapData.get(day.date)!) : 'rgba(255,255,255,0.04)' }"
                      :title="`${day.date}: ${heatmapData.get(day.date) ?? '-'}`"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Column 3: Tags Analysis (only for self) -->
            <div class="dashboard-col" v-if="target === 'me'">
              <div class="tags-section">
                <div class="section-title">📊 Facteurs</div>
                <template v-if="tagStats && (tagStats.topPositive?.length || tagStats.topNegative?.length)">
                  <div class="tags-grid">
                    <div class="tags-column" v-if="tagStats.topPositive?.length">
                      <div class="tags-column-title positive">👍 Positif</div>
                      <div class="tag-impact-list">
                        <div v-for="t in tagStats.topPositive.slice(0, 3)" :key="t.tag" class="tag-impact-item positive">
                          <span class="tag-icon">{{ getTagDisplay(t.tag).icon }}</span>
                          <span class="tag-name">{{ getTagDisplay(t.tag).name }}</span>
                          <span class="tag-impact-value">+{{ t.impact.toFixed(1) }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="tags-column" v-if="tagStats.topNegative?.length">
                      <div class="tags-column-title negative">👎 Negatif</div>
                      <div class="tag-impact-list">
                        <div v-for="t in tagStats.topNegative.slice(0, 3)" :key="t.tag" class="tag-impact-item negative">
                          <span class="tag-icon">{{ getTagDisplay(t.tag).icon }}</span>
                          <span class="tag-name">{{ getTagDisplay(t.tag).name }}</span>
                          <span class="tag-impact-value">{{ t.impact.toFixed(1) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else class="tags-empty">
                  <span>Ajoutez des tags pour voir les correlations</span>
                </div>
              </div>

              <div class="category-section" v-if="categoryCorrelations.length">
                <div class="section-title">📈 Par categorie</div>
                <div class="category-table">
                  <div v-for="cat in categoryCorrelations" :key="cat.categoryId" class="category-row">
                    <div class="category-info">
                      <span class="category-icon">{{ cat.icon }}</span>
                      <span class="category-name">{{ cat.name }}</span>
                    </div>
                    <div class="category-bar-container">
                      <div class="category-bar" :class="{ positive: (cat.avgImpact ?? 0) > 0, negative: (cat.avgImpact ?? 0) < 0 }"
                        :style="{ width: `${Math.min(Math.abs(cat.avgImpact ?? 0) * 10, 100)}%` }"></div>
                    </div>
                    <div class="category-impact" :class="{ positive: (cat.avgImpact ?? 0) > 0, negative: (cat.avgImpact ?? 0) < 0 }">
                      {{ (cat.avgImpact ?? 0) > 0 ? '+' : '' }}{{ cat.avgImpact ?? 0 }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Global Stats Tab -->
      <template v-else-if="activeTab === 'global' && leaderboard">
        <div class="stats-content global-content">
          <!-- Top row: Summary cards + Month nav -->
          <div class="global-top-row">
            <div class="month-nav-inline">
              <button class="cal-nav" @click="prevMonth">‹</button>
              <span class="month-label-inline">{{ monthLabel }}</span>
              <button class="cal-nav" @click="nextMonth">›</button>
            </div>
            <div class="global-summary" v-if="graphs">
              <div class="summary-card">
                <div class="summary-label">Moyenne</div>
                <div class="summary-value">{{ graphs.globalAverage ?? '—' }}<small>/20</small></div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Ce mois</div>
                <div class="summary-value">{{ leaderboard.monthly.length }}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Total</div>
                <div class="summary-value">{{ leaderboard.allTime.length }}</div>
              </div>
            </div>
          </div>

          <!-- Main grid: 3 columns -->
          <div class="global-grid">
            <!-- Column 1: Leaderboards -->
            <div class="global-col">
              <div class="lb-section">
                <div class="lb-title">🏆 Top du mois</div>
                <div class="lb-list">
                  <div v-for="(entry, index) in leaderboard.monthly.slice(0, 5)" :key="entry.userId" class="lb-row">
                    <div class="rank" :class="getMedalClass(index)">{{ index + 1 }}</div>
                    <div class="lb-user">{{ entry.username }}</div>
                    <div class="lb-score">{{ entry.avgRating }}/20</div>
                  </div>
                  <div v-if="!leaderboard.monthly.length" class="lb-empty">Aucune donnee</div>
                </div>
              </div>

              <div class="lb-section">
                <div class="lb-title">⭐ All-time</div>
                <div class="lb-list">
                  <div v-for="(entry, index) in leaderboard.allTime.slice(0, 5)" :key="entry.userId" class="lb-row">
                    <div class="rank" :class="getMedalClass(index)">{{ index + 1 }}</div>
                    <div class="lb-user">{{ entry.username }}</div>
                    <div class="lb-score">{{ entry.avgRating }}/20</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Column 2: Chart + Participants -->
            <div class="global-col">
              <div class="graph-box">
                <div class="graph-title">Evolution 12 mois</div>
                <div v-if="graphs?.globalMonthly?.length" class="chart-container">
                  <Line :data="globalChartData" :options="chartOptions" />
                </div>
                <div v-else class="graph-empty">Pas encore de donnees</div>
              </div>

              <div class="lb-section">
                <div class="lb-title">📊 Top participants</div>
                <div class="lb-list">
                  <div v-for="(entry, index) in leaderboard.topParticipants.slice(0, 5)" :key="entry.userId" class="lb-row">
                    <div class="rank" :class="getMedalClass(index)">{{ index + 1 }}</div>
                    <div class="lb-user">{{ entry.username }}</div>
                    <div class="lb-score">{{ entry.entryCount }}j</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Column 3: Daily + Detective -->
            <div class="global-col">
              <div class="lb-section">
                <div class="lb-title">📅 Aujourd'hui</div>
                <div class="lb-list" v-if="dailyLeaderboard.length">
                  <div v-for="entry in dailyLeaderboard.slice(0, 5)" :key="entry.userId" class="lb-row">
                    <div class="rank" :class="getMedalClass(entry.rank - 1)">{{ entry.rank }}</div>
                    <div class="lb-user">{{ entry.username }}</div>
                    <div class="lb-tags" v-if="entry.tags?.length">
                      <span v-for="tag in entry.tags.slice(0, 2)" :key="tag" class="mini-tag">{{ getTagDisplay(tag).icon }}</span>
                    </div>
                    <div class="lb-score">{{ entry.rating }}/20</div>
                  </div>
                </div>
                <div v-else class="lb-empty">Aucune entree</div>
              </div>

              <div class="lb-section">
                <div class="lb-title">🕵️ Detectives</div>
                <div class="lb-list" v-if="detectiveLeaderboard.length">
                  <div v-for="(entry, index) in detectiveLeaderboard.slice(0, 5)" :key="entry.userId" class="lb-row">
                    <div class="rank" :class="getMedalClass(index)">{{ index + 1 }}</div>
                    <div class="lb-user">{{ entry.username }}</div>
                    <div class="lb-score">{{ entry.accuracy }}%</div>
                  </div>
                </div>
                <div v-else class="lb-empty">Pas de detectives</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <NavMenu />
    </div>
  </AppShell>
</template>

<style scoped>
/* Base box-sizing for all elements */
.stats-page *,
.stats-page *::before,
.stats-page *::after {
  box-sizing: border-box;
}

/* Scrollable layout */
.stats-page {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
}

/* Header */
.stats-header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats-logo { width: 40px; height: auto; }
.stats-title { font-size: 20px; font-weight: 800; margin: 0; }

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.7);
  font-weight: 600;
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

.profile-switch { position: relative; display: inline-flex; margin-left: auto; }

.profile-select {
  appearance: none;
  height: 38px;
  padding: 0 32px 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(20,22,40,.95);
  color: rgba(255,255,255,.92);
  font-weight: 600;
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

.loading-msg, .error-msg { text-align: center; padding: 40px; opacity: .7; }
.error-msg { color: #ff7a7a; }

/* Stats content */
.stats-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Stats Cards */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.card {
  border-radius: 12px;
  padding: 20px 16px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  text-align: center;
}

.card-label { font-size: 11px; opacity: .6; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .5px; }
.card-value { font-size: 28px; font-weight: 900; }
.card-value small { font-size: 14px; opacity: .6; }
.card--streak .card-value { color: #ff9500; }

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 20px;
  align-items: start;
}

.dashboard-grid.two-columns {
  grid-template-columns: 1fr 1.3fr;
}

.dashboard-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0; /* Prevent grid blowout */
}

/* Graph boxes */
.graph-box {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  padding: 16px;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.graph-title {
  font-size: 14px;
  font-weight: 700;
  opacity: .85;
  margin-bottom: 12px;
}

.graph-header .graph-title { margin-bottom: 0; }

.graph-empty {
  text-align: center;
  padding: 30px 10px;
  opacity: .5;
  font-size: 13px;
}

.chart-container {
  height: 180px;
  position: relative;
}

.chart-container--bar {
  height: 140px;
}

.line-chart { width: 100%; height: auto; }
.grid-line { stroke: rgba(255,255,255,.08); stroke-width: 1; }
.axis-label { fill: rgba(255,255,255,.4); font-size: 10px; }
.user-line { stroke: rgba(255,180,100,.9); stroke-width: 2.5; stroke-linecap: round; }
.global-line { stroke: rgba(255,255,255,.25); stroke-width: 1.5; stroke-dasharray: 4 4; }
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

/* Day of week chart */
.dow-chart { display: flex; justify-content: space-between; gap: 8px; height: 100px; }
.dow-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.dow-bar-container { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.dow-bar { width: 100%; border-radius: 4px 4px 0 0; min-height: 4px; }
.dow-label { font-size: 11px; opacity: .6; font-weight: 600; }

/* Calendar section */
.calendar-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  padding: 16px;
}

.calendar-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.cal-nav {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.9);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
}

.cal-nav:hover { background: rgba(255,255,255,.12); }
.cal-month { font-weight: 700; font-size: 15px; text-transform: capitalize; flex: 1; text-align: center; }

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  opacity: .5;
}

.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }

.cal-day {
  position: relative;
  border-radius: 6px;
  aspect-ratio: 1;
  min-height: 32px;
  padding: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.cal-day:hover { opacity: .85; }
.cal-day.empty { background: transparent !important; border: none !important; }
.day-num { font-size: 12px; font-weight: 700; opacity: .9; }

/* Heatmap */
.heatmap-box { overflow: hidden; }
.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(53, 1fr);
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  gap: 2px;
  width: 100%;
}
.heatmap-week { display: contents; }
.heatmap-day { aspect-ratio: 1; border-radius: 2px; min-width: 4px; }
.heatmap-day:hover { outline: 1px solid rgba(255,255,255,.4); }

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 11px;
  opacity: .6;
}

.legend-gradient {
  width: 80px;
  height: 10px;
  border-radius: 3px;
  background: linear-gradient(90deg, rgb(220,60,70), rgb(40,200,90));
}

.year-nav { display: flex; align-items: center; gap: 8px; }
.year-label { font-size: 14px; font-weight: 700; }

.nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  color: rgba(255,255,255,.9);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
}

.nav-btn:hover { background: rgba(255,255,255,.12); }

/* Badges section */
.badges-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
}

.badges-earned {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.badge-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, rgba(255,215,0,.15), rgba(255,180,0,.1));
  border: 1px solid rgba(255,215,0,.3);
  border-radius: 20px;
  cursor: default;
}

.badge-icon { font-size: 16px; }
.badge-name { font-size: 12px; font-weight: 600; }

.badges-empty {
  text-align: center;
  padding: 16px;
  opacity: .5;
  font-size: 13px;
}

.badges-progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-item {
  background: rgba(255,255,255,.03);
  border-radius: 8px;
  padding: 10px 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.progress-name { font-size: 12px; font-weight: 600; opacity: .8; }
.progress-value { font-size: 11px; opacity: .6; }

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

.edit-btn {
  width: 100%;
  padding: 12px 16px;
  font-size: 13px;
  margin-top: 8px;
}

/* Tags Analysis Section */
.tags-section, .category-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  padding: 16px;
}

.tags-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.tags-column-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 10px;
  padding-bottom: 8px;
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
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.tag-impact-item.positive { background: rgba(74,222,128,.1); }
.tag-impact-item.negative { background: rgba(248,113,113,.1); }

.tag-icon { font-size: 14px; }
.tag-name { flex: 1; font-size: 13px; }
.tag-impact-value { font-weight: 800; font-size: 13px; }
.tag-impact-item.positive .tag-impact-value { color: #4ade80; }
.tag-impact-item.negative .tag-impact-value { color: #f87171; }

.tags-empty {
  text-align: center;
  opacity: .5;
  font-size: 13px;
  padding: 20px 12px;
}

/* Category table */
.category-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255,255,255,.03);
  border-radius: 8px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 90px;
}

.category-icon { font-size: 16px; }
.category-name { font-size: 13px; font-weight: 600; }

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
  min-width: 45px;
  text-align: right;
  font-weight: 800;
  font-size: 14px;
}

.category-impact.positive { color: #4ade80; }
.category-impact.negative { color: #f87171; }

/* Calendar Tooltip */
.cal-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  min-width: 200px;
  max-width: 280px;
  padding: 14px;
  background: rgba(25, 28, 50, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
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
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-date { font-size: 12px; opacity: 0.6; }
.tooltip-rating { font-size: 18px; font-weight: 800; color: #ffcc00; }

.tooltip-comment {
  font-size: 13px;
  font-style: italic;
  opacity: 0.85;
  line-height: 1.4;
  margin-bottom: 10px;
  word-break: break-word;
}

.tooltip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tooltip-tag {
  font-size: 14px;
}

/* ==================== GLOBAL TAB STYLES ==================== */
.global-content { }

.global-top-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.month-nav-inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.month-label-inline {
  font-size: 16px;
  font-weight: 700;
  text-transform: capitalize;
  min-width: 150px;
  text-align: center;
}

.global-summary {
  display: flex;
  gap: 16px;
  flex: 1;
}

.summary-card {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  padding: 16px 20px;
  text-align: center;
  flex: 1;
}

.summary-label { font-size: 11px; opacity: .6; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }
.summary-value { font-size: 24px; font-weight: 900; }
.summary-value small { font-size: 12px; opacity: .6; }

/* Global 3-column grid */
.global-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}

.global-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0; /* Prevent grid blowout */
}

/* Leaderboard styles */
.lb-section {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 12px;
  padding: 16px;
}

.lb-title { font-size: 14px; font-weight: 700; opacity: .85; margin-bottom: 12px; }
.lb-list { display: flex; flex-direction: column; gap: 8px; }

.lb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255,255,255,.04);
  border-radius: 10px;
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
  font-size: 12px;
  flex-shrink: 0;
}

.medal--gold { background: linear-gradient(135deg, rgba(255,215,0,.3), rgba(255,180,0,.2)); border: 1px solid rgba(255,215,0,.4); color: rgba(255,230,150,.95); }
.medal--silver { background: linear-gradient(135deg, rgba(192,192,192,.25), rgba(160,160,160,.15)); border: 1px solid rgba(192,192,192,.35); color: rgba(220,220,220,.95); }
.medal--bronze { background: linear-gradient(135deg, rgba(205,127,50,.25), rgba(180,100,40,.15)); border: 1px solid rgba(205,127,50,.35); color: rgba(230,180,130,.95); }

.lb-user { flex: 1; font-weight: 700; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lb-score { font-weight: 800; font-size: 14px; opacity: .9; flex-shrink: 0; }
.lb-empty {
  text-align: center;
  opacity: .5;
  font-size: 13px;
  padding: 20px 12px;
}

.lb-tags {
  display: flex;
  gap: 4px;
  margin-right: 10px;
}

.mini-tag { font-size: 16px; }

/* ==================== RESPONSIVE ==================== */

/* Tablet landscape */
@media (max-width: 1200px) {
  .dashboard-grid { grid-template-columns: 1fr 1fr; }
  .dashboard-col:nth-child(3) { display: none; }
  .global-grid { grid-template-columns: 1fr 1fr; }
  .global-col:nth-child(3) { display: none; }
}

/* Tablet portrait */
@media (max-width: 900px) {
  .stats-page { padding: 16px; gap: 16px; }

  .dashboard-grid { grid-template-columns: 1fr; }
  .dashboard-grid.two-columns { grid-template-columns: 1fr; }
  .dashboard-col:nth-child(3) { display: flex; }

  .stats-cards { grid-template-columns: repeat(2, 1fr); gap: 12px; }

  .global-grid { grid-template-columns: 1fr; }
  .global-col:nth-child(3) { display: flex; }
  .global-top-row { flex-direction: column; align-items: stretch; gap: 12px; }
  .global-summary { flex-direction: row; }

  .tags-grid { grid-template-columns: 1fr; gap: 12px; }
}

/* Mobile - Main breakpoint */
@media (max-width: 600px) {
  .stats-page {
    padding: 12px 12px 100px 12px; /* Extra bottom padding for nav */
    gap: 12px;
    max-width: 100%;
    overflow-x: hidden;
  }

  .stats-content {
    max-width: 100%;
    overflow-x: hidden;
  }

  .dashboard-grid {
    max-width: 100%;
    overflow: hidden;
  }

  .dashboard-col {
    max-width: 100%;
    min-width: 0; /* Critical for flex/grid children */
    overflow: hidden;
  }

  .global-grid {
    max-width: 100%;
    overflow: hidden;
  }

  .global-col {
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  /* Header mobile */
  .stats-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .header-left {
    width: 100%;
    justify-content: center;
  }

  .stats-logo { width: 32px; }
  .stats-title { font-size: 18px; }

  .tabs {
    width: 100%;
    order: 2;
  }

  .tab {
    flex: 1;
    text-align: center;
    padding: 12px 16px;
    font-size: 13px;
  }

  .profile-switch {
    margin-left: 0;
    order: 3;
    width: 100%;
  }

  .profile-select {
    width: 100%;
    height: 44px;
    font-size: 15px;
    padding: 0 36px 0 16px;
  }

  /* Stats cards mobile - 2x2 grid */
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .card {
    padding: 14px 10px;
    border-radius: 10px;
  }

  .card-label {
    font-size: 10px;
    margin-bottom: 6px;
  }

  .card-value {
    font-size: 22px;
  }

  .card-value small {
    font-size: 12px;
  }

  /* Calendar mobile */
  .calendar-section {
    padding: 14px 12px;
    border-radius: 10px;
    max-width: 100%;
    box-sizing: border-box;
  }

  .calendar-head {
    margin-bottom: 10px;
  }

  .cal-nav {
    width: 40px;
    height: 40px;
    font-size: 16px;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }

  .cal-month {
    font-size: 14px;
  }

  .calendar-weekdays {
    gap: 2px;
    font-size: 10px;
    margin-bottom: 4px;
  }

  .calendar-grid {
    gap: 2px;
  }

  .cal-day {
    min-height: 0;
    aspect-ratio: 1;
    border-radius: 4px;
    padding: 1px;
  }

  .day-num {
    font-size: 10px;
  }

  /* Tooltip mobile - position at bottom of screen */
  .cal-tooltip {
    position: fixed;
    bottom: 80px;
    left: 12px;
    right: 12px;
    top: auto;
    transform: none;
    max-width: none;
    min-width: auto;
    z-index: 1000;
  }

  .cal-tooltip::after { display: none; }

  /* Charts mobile */
  .graph-box {
    padding: 14px 10px;
    border-radius: 10px;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .graph-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .graph-title {
    font-size: 13px;
    margin-bottom: 10px;
  }

  .chart-container {
    height: 160px;
    max-width: 100%;
  }

  .chart-container--bar {
    height: 120px;
  }

  .graph-empty {
    padding: 24px 10px;
    font-size: 12px;
  }

  /* Heatmap mobile - horizontal scroll */
  .heatmap-box {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
  }

  .heatmap-grid {
    min-width: 450px;
    gap: 1px;
  }

  .heatmap-day {
    min-width: 6px;
    border-radius: 1px;
  }

  .year-nav { gap: 6px; }

  .nav-btn {
    width: 32px;
    height: 32px;
    font-size: 14px;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }

  /* Badges mobile */
  .badges-section {
    padding: 14px 12px;
    border-radius: 10px;
    max-width: 100%;
    box-sizing: border-box;
  }

  .section-title {
    font-size: 13px;
    margin-bottom: 10px;
  }

  .badges-earned {
    gap: 6px;
    margin-bottom: 10px;
  }

  .badge-item {
    padding: 6px 10px;
    border-radius: 16px;
    max-width: 100%;
  }

  .badge-icon { font-size: 14px; }
  .badge-name { font-size: 11px; }

  .badges-empty {
    padding: 12px;
    font-size: 12px;
  }

  .progress-item {
    padding: 8px 10px;
    border-radius: 6px;
  }

  .progress-name { font-size: 11px; }
  .progress-value { font-size: 10px; }
  .progress-bar { height: 5px; }

  .edit-btn {
    padding: 14px 16px;
    font-size: 14px;
    border-radius: 10px;
    margin-top: 10px;
    width: 100%;
    box-sizing: border-box;
  }

  /* Tags mobile */
  .tags-section, .category-section {
    padding: 14px 12px;
    border-radius: 10px;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .tags-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .tags-column-title {
    font-size: 11px;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }

  .tag-impact-list { gap: 5px; }

  .tag-impact-item {
    padding: 8px 10px;
    border-radius: 6px;
  }

  .tag-icon { font-size: 13px; }
  .tag-name { font-size: 12px; }
  .tag-impact-value { font-size: 12px; }

  .tags-empty {
    padding: 16px 10px;
    font-size: 12px;
  }

  /* Category table mobile */
  .category-table { gap: 6px; }

  .category-row {
    padding: 8px 10px;
    gap: 10px;
    border-radius: 6px;
  }

  .category-info {
    min-width: 70px;
    gap: 6px;
  }

  .category-icon { font-size: 14px; }
  .category-name { font-size: 12px; }
  .category-bar-container { height: 6px; }
  .category-impact {
    font-size: 12px;
    min-width: 40px;
  }

  /* Global tab mobile */
  .global-top-row {
    gap: 10px;
  }

  .month-nav-inline {
    justify-content: center;
    gap: 10px;
  }

  .month-label-inline {
    font-size: 14px;
    min-width: 120px;
  }

  .global-summary {
    gap: 8px;
  }

  .summary-card {
    padding: 12px 8px;
    border-radius: 10px;
  }

  .summary-label { font-size: 9px; }
  .summary-value { font-size: 18px; }
  .summary-value small { font-size: 10px; }

  /* Leaderboards mobile */
  .lb-section {
    padding: 14px 12px;
    border-radius: 10px;
    max-width: 100%;
    box-sizing: border-box;
  }

  .lb-title {
    font-size: 13px;
    margin-bottom: 10px;
  }

  .lb-list { gap: 6px; }

  .lb-row {
    padding: 10px 12px;
    gap: 8px;
    border-radius: 8px;
  }

  .rank {
    width: 24px;
    height: 24px;
    font-size: 10px;
    flex-shrink: 0;
  }

  .lb-user {
    font-size: 13px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lb-score {
    font-size: 13px;
    flex-shrink: 0;
  }

  .lb-empty {
    padding: 16px 10px;
    font-size: 12px;
  }

  .lb-tags {
    gap: 3px;
    margin-right: 4px;
    flex-shrink: 0;
  }

  .mini-tag { font-size: 12px; }
}

/* Extra small phones */
@media (max-width: 360px) {
  .stats-page {
    padding: 10px 10px 100px 10px;
  }

  .stats-title { font-size: 16px; }

  .card-value { font-size: 20px; }
  .card-label { font-size: 9px; }

  .cal-day { min-height: 32px; }
  .day-num { font-size: 10px; }

  .chart-container { height: 140px; }

  .summary-value { font-size: 16px; }

  .lb-user { font-size: 12px; }
  .lb-score { font-size: 12px; }
}

/* Touch-friendly interactions */
@media (hover: none) and (pointer: coarse) {
  .tab:hover,
  .cal-nav:hover,
  .nav-btn:hover,
  .lb-row:hover,
  .cal-day:hover {
    /* Remove hover effects on touch devices */
    background: inherit;
    opacity: inherit;
  }

  .tab:active,
  .cal-nav:active,
  .nav-btn:active {
    transform: scale(0.96);
    opacity: 0.8;
  }

  .lb-row:active {
    background: rgba(255,255,255,.12);
  }

  .cal-day:active {
    transform: scale(0.95);
  }
}

/* Safe area for notched phones */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .stats-page {
    padding-bottom: calc(100px + env(safe-area-inset-bottom));
  }
}

/* Landscape mobile */
@media (max-width: 900px) and (orientation: landscape) {
  .stats-page {
    padding-bottom: 80px;
  }

  .stats-cards {
    grid-template-columns: repeat(4, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }

  .global-grid {
    grid-template-columns: 1fr 1fr;
  }

  .chart-container { height: 140px; }
}
</style>
