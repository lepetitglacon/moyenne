<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth";
import { useFlow } from "../composables/useFlow";

const router = useRouter();
const { authFetch } = useAuth();

const { otherScore } = useFlow();

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const showResult = ref(false);

// Liste des utilisateurs pour le dropdown
const users = ref<{ id: number; username: string }[]>([]);
const selectedUserId = ref<number | null>(null);

const target = ref<null | {
  userId: number;
  date: string;
  rating: number;
  description: string | null;
}>(null);

// Guess result
const guessResult = ref<null | {
  isCorrect: boolean;
  streak: number;
  stats: { totalGuesses: number; correctGuesses: number; accuracy: number };
  actualUserId: number;
}>(null);

const newBadges = ref<string[]>([]);

const otherMoodLabels = [
  "TES ANCETRES ONT HONTE",
  "MEME LE KARMA A EU PITIE DE TOI",
  "C'EST UNE JOURNEE A DECLARER A L'ASSURANCE",
  "DEGATS IRREVERSIBLES",
  "J'AI MAL POUR TOI",
  "CA SENT LE BURNOUT",
  "DECEVANT, MAIS COHERENT AVEC TON PARCOURS",
  "PAS MORT MAIS PAS GLORIEUX",
  "C'EST LEGAL MAIS IMMORAL",
  "JE VOIS CE QUE TU VEUX DIRE",
  "TU ES A DEUX DOIGTS DE DEVENIR QUELQU'UN",
  "CA VA... SI ON BAISSE LES ATTENTES",
  "OK, MAIS NE RECOMMENCE PAS",
  "CA S'AMELIORE, ETRANGEMENT",
  "PAS MAL DU TOUT, JE SUIS SURPRIS",
  "TU AS EU UNE VRAIE JOURNEE, TOI",
  "SUSPECTEMENT BIEN",
  "QUI T'A LAISSE ETRE HEUREUX ?",
  "C'EST ECOEURANT DE REUSSIR AUTANT",
  "C'EST CARREMENT INDECENT",
  "JE TE DETESTE CORDIALEMENT (MAIS BRAVO)",
] as const;

const myRatingText = computed(() => {
  const score = otherScore.value;
  return `${otherMoodLabels[score]} ${score} / 20`;
});

// Texte du commentaire (ou placeholder si vide)
const commentText = computed(() => {
  if (!target.value?.description) {
    return "Aucun commentaire pour cette journee.";
  }
  return target.value.description;
});

// Note de la personne
const theirRating = computed(() => {
  return target.value?.rating ?? 0;
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
      rating: data.rating,
      description: data.description,
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
        rating: otherScore.value,
        guessedUserId: selectedUserId.value,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Erreur lors de l'enregistrement de ta note.");
    }

    const data = await res.json();

    // Store guess result and badges
    if (data.guessResult) {
      guessResult.value = data.guessResult;
    }
    if (data.newBadges?.length) {
      newBadges.value = data.newBadges;
    }

    // Show result screen if there was a guess
    if (selectedUserId.value && data.guessResult) {
      showResult.value = true;
    } else {
      router.push({ name: "merci" });
    }
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
          <!-- Correct guess -->
          <template v-if="guessResult.isCorrect">
            <div class="result-icon correct">🎉</div>
            <div class="result-title correct">Bonne reponse !</div>
            <div class="result-text">
              C'etait bien <strong>{{ getUsernameById(guessResult.actualUserId) }}</strong>
            </div>
          </template>

          <!-- Wrong guess -->
          <template v-else>
            <div class="result-icon wrong">😅</div>
            <div class="result-title wrong">Rate !</div>
            <div class="result-text">
              C'etait <strong>{{ getUsernameById(guessResult.actualUserId) }}</strong>
            </div>
          </template>

          <!-- Streak -->
          <div class="streak-badge" v-if="guessResult.isCorrect && guessResult.streak > 0">
            <span class="streak-icon">🔥</span>
            Serie actuelle: <strong>{{ guessResult.streak }}</strong>
          </div>

          <!-- Stats -->
          <div class="guess-stats">
            <span class="stat-label">Precision:</span>
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
        <!-- Section commentaire anonyme -->
        <div class="step-subtitle">Voici le commentaire d'hier</div>

        <div class="textarea readonly" :class="{ 'textarea--empty': !target.description }">
          {{ commentText }}
        </div>

        <!-- Note de la personne -->
        <div class="rating-badge">
          Note donnee : <strong>{{ theirRating }} / 20</strong>
        </div>

        <!-- Deviner l'auteur -->
        <div class="guess-section">
          <label class="step-subtitle" for="guess-select">A ton avis, qui a ecrit ca ?</label>
          <select id="guess-select" class="select-input" v-model="selectedUserId">
            <option :value="null">Je ne sais pas</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.username }}
            </option>
          </select>
        </div>

        <!-- Section notation -->
        <div class="step-subtitle" style="margin-top: 24px;">
          Quelle note donnes-tu a cette journee ?
        </div>

        <div class="step-value" :class="{ 'step-value--glow': otherScore > 15 }">
          {{ myRatingText }}
        </div>

        <input class="range" type="range" min="0" max="20" v-model.number="otherScore" />

        <button class="btn btn-primary btn-wide" type="button" @click="next" :disabled="saving">
          {{ saving ? "SAUVEGARDE..." : "VALIDER" }}
        </button>

        <p v-if="error" class="form-error">{{ error }}</p>
      </template>
    </div>
  </AppShell>
</template>

<style scoped>
.textarea--empty {
  font-style: italic;
  opacity: 0.7;
}

.rating-badge {
  margin-top: 12px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 0.95rem;
}

.guess-section {
  margin-top: 24px;
  width: 100%;
  max-width: 320px;
}

.guess-section .step-subtitle {
  margin-bottom: 8px;
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

/* Result screen styles */
.result-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-icon {
  font-size: 4rem;
  animation: bounce 0.5s ease;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.result-title {
  font-size: 1.5rem;
  font-weight: 800;
  text-transform: uppercase;
}

.result-title.correct { color: #4ade80; }
.result-title.wrong { color: #f87171; }

.result-text {
  font-size: 1rem;
  opacity: 0.9;
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
</style>
