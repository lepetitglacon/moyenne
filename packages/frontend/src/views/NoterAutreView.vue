<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth";

const router = useRouter();
const { authFetch } = useAuth();

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const showResult = ref(false);

// Liste des utilisateurs pour le dropdown
const users = ref<{ id: number; username: string }[]>([]);
const selectedUserId = ref<number | null>(null);
const guessedRating = ref<number>(10);

const target = ref<null | {
  userId: number;
  date: string;
  description: string | null;
  tags: string[];
  gifUrl: string | null;
}>(null);

// Guess result
const guessResult = ref<null | {
  isCorrect: boolean;
  streak: number;
  stats: { totalGuesses: number; correctGuesses: number; accuracy: number };
  actualUserId: number;
  actualRating: number;
  guessedRating: number | null;
  ratingGuessCorrect: boolean;
  ratingGuessExact: boolean;
}>(null);

const newBadges = ref<string[]>([]);

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

// Texte du commentaire (ou placeholder si vide)
const commentText = computed(() => {
  if (!target.value?.description) {
    return "Aucun commentaire pour cette journee.";
  }
  return target.value.description;
});

onMounted(async () => {
  loading.value = true;
  error.value = null;

  try {
    // Charger les utilisateurs et l'entree a noter en parallele
    const [usersRes, reviewRes] = await Promise.all([
      authFetch("/api/users"),
      authFetch("/api/review/next"),
    ]);

    // Traiter les utilisateurs
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      users.value = usersData.users || [];
    }

    // Traiter l'entree a noter
    if (!reviewRes.ok) {
      const data = await reviewRes.json().catch(() => ({}));
      throw new Error(data?.message || "Impossible de recuperer quelqu'un a noter.");
    }
    const data = await reviewRes.json();

    // Si done: true ou pas de donnees, redirection directe vers merci
    if (data?.done || !data?.userId) {
      router.replace({ name: "merci" });
      return;
    }

    target.value = {
      userId: data.userId,
      date: data.date,
      description: data.description,
      tags: data.tags || [],
      gifUrl: data.gifUrl || null,
    };
  } catch (e: any) {
    error.value = e?.message ?? "Erreur reseau.";
  } finally {
    loading.value = false;
  }
});

async function next() {
  error.value = null;

  // Rien a noter
  if (!target.value) {
    router.push({ name: "merci" });
    return;
  }

  saving.value = true;

  try {
    const res = await authFetch("/api/ratings", {
      method: "POST",
      body: JSON.stringify({
        toUserId: target.value.userId,
        date: target.value.date,
        rating: guessedRating.value,
        guessedUserId: selectedUserId.value,
        guessedRating: guessedRating.value,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Erreur lors de l'enregistrement.");
    }

    const data = await res.json();

    // Store guess result and badges
    if (data.guessResult) {
      guessResult.value = data.guessResult;
    }
    if (data.newBadges?.length) {
      newBadges.value = data.newBadges;
    }

    // Always show result screen now
    showResult.value = true;
  } catch (e: any) {
    error.value = e?.message ?? "Erreur reseau.";
  } finally {
    saving.value = false;
  }
}

function goToMerci() {
  router.push({ name: "merci" });
}

// Get username by id
function getUsernameById(userId: number): string {
  const user = users.value.find(u => u.id === userId);
  return user?.username || "Inconnu";
}

function reload() {
  router.go(0);
}
</script>

<template>
  <AppShell variant="center" :showDecor="false">
    <div class="page-center">
      <img class="brand-logo" src="../assets/img/tilt.png" alt="tilt" />

      <template v-if="loading">
        <div class="step-subtitle">Chargement...</div>
      </template>

      <template v-else-if="error">
        <div class="step-subtitle">Erreur</div>
        <p class="form-error">{{ error }}</p>
        <button class="btn btn-primary btn-wide" type="button" @click="reload">
          REESSAYER
        </button>
      </template>

      <!-- Result screen after guess -->
      <template v-else-if="showResult && guessResult">
        <div class="result-container">
          <div class="result-header">🕵️ Resultats</div>

          <!-- Author guess result -->
          <div class="result-card" :class="{ correct: guessResult.isCorrect, wrong: !guessResult.isCorrect }">
            <div class="result-card-title">Qui a ecrit ?</div>
            <div class="result-card-icon">{{ guessResult.isCorrect ? '✅' : '❌' }}</div>
            <div class="result-card-text">
              C'etait <strong>{{ getUsernameById(guessResult.actualUserId) }}</strong>
            </div>
          </div>

          <!-- Rating guess result -->
          <div class="result-card" :class="{ correct: guessResult.ratingGuessCorrect, wrong: !guessResult.ratingGuessCorrect }">
            <div class="result-card-title">Quelle note ?</div>
            <div class="result-card-icon">{{ guessResult.ratingGuessExact ? '🎯' : guessResult.ratingGuessCorrect ? '✅' : '❌' }}</div>
            <div class="result-card-text">
              <span v-if="guessResult.ratingGuessExact">Exact ! </span>
              <span v-else-if="guessResult.ratingGuessCorrect">Presque ! </span>
              <span v-else>Rate ! </span>
              Note reelle : <strong>{{ guessResult.actualRating }}/20</strong>
              <span class="guess-detail">(tu as dit {{ guessResult.guessedRating }})</span>
            </div>
          </div>

          <!-- Score summary -->
          <div class="score-summary">
            <div class="score-item" v-if="guessResult.isCorrect && guessResult.ratingGuessExact">
              <span class="score-icon">🏆</span>
              <span>Double parfait !</span>
            </div>
            <div class="score-item" v-else-if="guessResult.isCorrect && guessResult.ratingGuessCorrect">
              <span class="score-icon">⭐</span>
              <span>Tres bon !</span>
            </div>
            <div class="score-item" v-else-if="guessResult.isCorrect || guessResult.ratingGuessCorrect">
              <span class="score-icon">👍</span>
              <span>Pas mal !</span>
            </div>
          </div>

          <!-- Streak -->
          <div class="streak-badge" v-if="guessResult.isCorrect && guessResult.streak > 1">
            <span class="streak-icon">🔥</span>
            Serie : <strong>{{ guessResult.streak }}</strong> bonnes reponses
          </div>

          <!-- Stats -->
          <div class="guess-stats">
            <span class="stat-label">Precision auteur :</span>
            <span class="stat-value">{{ guessResult.stats.accuracy }}%</span>
            <span class="stat-detail">({{ guessResult.stats.correctGuesses }}/{{ guessResult.stats.totalGuesses }})</span>
          </div>

          <!-- New badges -->
          <div class="new-badges" v-if="newBadges.length">
            <div class="new-badge-title">Nouveau badge !</div>
            <div class="badge-list">
              <span v-for="badge in newBadges" :key="badge" class="badge-item">
                {{ badge === 'detective_10' ? '🔍 Apprenti Detective' :
                   badge === 'detective_50' ? '🕵️ Detective Confirme' :
                   badge === 'detective_streak_5' ? '🎯 Serie de 5' :
                   badge === 'sherlock' ? '🎩 Sherlock' : badge }}
              </span>
            </div>
          </div>

          <button class="btn btn-primary btn-wide" type="button" @click="goToMerci">
            CONTINUER
          </button>
        </div>
      </template>

      <template v-else-if="target">
        <div class="game-title">🕵️ Devine qui a ecrit...</div>

        <!-- Commentaire anonyme -->
        <div class="comment-card">
          <div class="comment-text" :class="{ 'comment-text--empty': !target.description }">
            {{ commentText }}
          </div>

          <!-- GIF -->
          <div v-if="target.gifUrl" class="comment-gif">
            <img :src="target.gifUrl" alt="GIF du jour" class="comment-gif-img" />
          </div>

          <!-- Tags -->
          <div class="comment-tags" v-if="target.tags?.length">
            <span v-for="tag in target.tags" :key="tag" class="tag-chip">
              {{ getTagDisplay(tag).icon }} {{ getTagDisplay(tag).name }}
            </span>
          </div>
        </div>

        <!-- Section devinettes -->
        <div class="guess-grid">
          <!-- Deviner l'auteur -->
          <div class="guess-card">
            <label class="guess-label" for="guess-select">👤 Qui a ecrit ca ?</label>
            <select id="guess-select" class="select-input" v-model="selectedUserId">
              <option :value="null">Je ne sais pas</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.username }}
              </option>
            </select>
          </div>

          <!-- Deviner la note -->
          <div class="guess-card">
            <label class="guess-label">🎯 Quelle note a-t-il mis ?</label>
            <div class="rating-guess">
              <span class="rating-value">{{ guessedRating }}/20</span>
              <input class="range" type="range" min="0" max="20" v-model.number="guessedRating" />
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-wide" type="button" @click="next" :disabled="saving">
          {{ saving ? "VERIFICATION..." : "VALIDER MES REPONSES" }}
        </button>

        <p v-if="error" class="form-error">{{ error }}</p>
      </template>
    </div>
  </AppShell>
</template>

<style scoped>
.game-title {
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 16px;
  text-align: center;
}

.comment-card {
  width: 100%;
  max-width: 400px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  margin-bottom: 24px;
}

.comment-text {
  font-size: 1.1rem;
  line-height: 1.5;
  text-align: center;
  font-style: italic;
}

.comment-text--empty {
  opacity: 0.5;
}

.comment-gif {
  display: flex;
  justify-content: center;
  margin-top: 14px;
}

.comment-gif-img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  object-fit: contain;
}

.comment-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  font-size: 0.85rem;
}

.guess-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 400px;
  margin-bottom: 24px;
}

.guess-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.guess-label {
  display: block;
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.select-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s;
}

.select-input:hover,
.select-input:focus {
  border-color: rgba(255, 255, 255, 0.4);
  outline: none;
}

.select-input option {
  background: #1a1a2e;
  color: #fff;
}

.rating-guess {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.rating-value {
  font-size: 1.8rem;
  font-weight: 900;
  color: #fbbf24;
}

.range {
  width: 100%;
}

/* Result screen styles */
.result-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  animation: fadeIn 0.3s ease;
  width: 100%;
  max-width: 400px;
}

.result-header {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 8px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-card {
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.result-card.correct {
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.result-card.wrong {
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.result-card-title {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.7;
}

.result-card-icon {
  font-size: 2rem;
}

.result-card-text {
  font-size: 1rem;
}

.guess-detail {
  opacity: 0.6;
  font-size: 0.9rem;
}

.score-summary {
  padding: 12px 20px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1));
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 12px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 1.1rem;
}

.score-icon {
  font-size: 1.5rem;
}

.streak-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, rgba(255, 149, 0, 0.2), rgba(255, 100, 0, 0.1));
  border: 1px solid rgba(255, 149, 0, 0.4);
  border-radius: 12px;
  font-size: 1rem;
}

.streak-icon {
  font-size: 1.5rem;
}

.guess-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 0.9rem;
}

.stat-label { opacity: 0.7; }
.stat-value { font-weight: 800; font-size: 1.1rem; }
.stat-detail { opacity: 0.6; font-size: 0.85rem; }

.new-badges {
  margin-top: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(79, 70, 229, 0.1));
  border: 1px solid rgba(147, 51, 234, 0.4);
  border-radius: 12px;
  animation: glow 1s ease infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 0 10px rgba(147, 51, 234, 0.3); }
  to { box-shadow: 0 0 20px rgba(147, 51, 234, 0.5); }
}

.new-badge-title {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.8;
  margin-bottom: 8px;
}

.badge-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge-item {
  font-size: 1rem;
  font-weight: 600;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .game-title {
    font-size: 1.2rem;
    padding: 0 12px;
  }

  .comment-card {
    max-width: 100%;
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 20px;
  }

  .comment-text {
    font-size: 1rem;
    line-height: 1.45;
  }

  .comment-tags {
    gap: 6px;
    margin-top: 12px;
    padding-top: 12px;
  }

  .tag-chip {
    padding: 5px 10px;
    font-size: 0.8rem;
  }

  .guess-grid {
    max-width: 100%;
    gap: 12px;
    margin-bottom: 20px;
  }

  .guess-card {
    padding: 14px;
    border-radius: 10px;
  }

  .guess-label {
    font-size: 0.9rem;
    margin-bottom: 10px;
  }

  .select-input {
    padding: 14px 14px;
    font-size: 16px; /* Prevents iOS zoom */
  }

  .rating-value {
    font-size: 1.5rem;
  }

  /* Result screen */
  .result-container {
    max-width: 100%;
    gap: 12px;
  }

  .result-header {
    font-size: 1.3rem;
  }

  .result-card {
    padding: 14px;
    border-radius: 10px;
  }

  .result-card-icon {
    font-size: 1.6rem;
  }

  .result-card-text {
    font-size: 0.9rem;
  }

  .score-summary {
    padding: 10px 16px;
    border-radius: 10px;
  }

  .score-item {
    font-size: 1rem;
    gap: 6px;
  }

  .score-icon {
    font-size: 1.3rem;
  }

  .streak-badge {
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 0.9rem;
  }

  .streak-icon {
    font-size: 1.3rem;
  }

  .guess-stats {
    padding: 8px 12px;
    font-size: 0.85rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .new-badges {
    padding: 14px 16px;
    border-radius: 10px;
  }

  .badge-item {
    font-size: 0.9rem;
  }
}

@media (max-width: 360px) {
  .comment-text {
    font-size: 0.95rem;
  }

  .rating-value {
    font-size: 1.3rem;
  }

  .result-card-icon {
    font-size: 1.4rem;
  }

  .score-item {
    font-size: 0.9rem;
  }
}
</style>
