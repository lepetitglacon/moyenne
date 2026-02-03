<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import NavMenu from "../components/NavMenu.vue";
import TagSelector from "../components/TagSelector.vue";
import { useFlow } from "../composables/useFlow";
import { useAuth } from "../composables/useAuth";

const router = useRouter();
const { authFetch } = useAuth();

const { dayScore, dayComment } = useFlow();

const error = ref<string | null>(null);
const saving = ref(false);
const loading = ref(true);
const selectedTags = ref<string[]>([]);
const showTags = ref(false);
const newBadges = ref<string[]>([]);

const moodLabels = [
  "J'AURAIS PREFERE CREVER",
  "S'IL VOUS PLAIT, BUTEZ MOI",
  "AU FOND DU TROU",
  "J'AI EXISTE PAR ERREUR",
  "MA MOTIVATION EST DECEDEE",
  "C'EST UN CRI A L'AIDE",
  "JE SURVIS PAR HABITUDE",
  "PAS MORT MAIS PAS VIVANT",
  "EMOTIONNELLEMENT EN MODE AVION",
  "TU VOIS CE QUE JE VEUX DIRE ?",
  "NEUTRE COMME UN MUR BLANC",
  "LEGEREMENT MOINS MALHEUREUX",
  "CA PASSE MAIS JE PORTE PLAINTE",
  "J'AI DU CONFONDRE MES MEDOCS",
  "ETONNAMMENT FONCTIONNEL",
  "ALERTE : J'AI RESSENTI UNE EMOTION POSITIVE",
  "J'AI RESSENTI UN MICRO-BONHEUR",
  "CA COMMENCE A ME PLAIRE",
  "JOURNEE ILLEGALEMENT BIEN",
  "C'EST LOUCHE, JE VAIS FORCEMENT LE PAYER CHER",
  "ORGASMIQUE",
] as const;

const moodText = computed(() => {
  const score = dayScore.value;
  return `${moodLabels[score]} ${score} / 20`;
});

const dateLabel = computed(() => {
  const d = new Date();
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" };
  return d.toLocaleDateString("fr-FR", opts);
});

// Validation: commentaire obligatoire
const canContinue = computed(() => dayComment.value.trim().length > 0);

// Badge name mapping
const badgeNames: Record<string, { name: string; icon: string }> = {
  streak_7: { name: "7 jours de suite", icon: "🔥" },
  streak_30: { name: "Mois parfait", icon: "🏆" },
  perfect_20: { name: "Note parfaite!", icon: "⭐" },
  reviewer_100: { name: "Reviewer", icon: "📝" },
  top_1_monthly: { name: "Top 1", icon: "🥇" },
};

// Tag definitions for preview display
const TAGS: Record<string, { name: string; icon: string; positive: boolean }> = {
  productive: { name: 'Productif', icon: '✅', positive: true },
  useful_meeting: { name: 'Reunion utile', icon: '🤝', positive: true },
  project_progress: { name: 'Projet avance', icon: '📈', positive: true },
  recognition: { name: 'Reconnaissance', icon: '🏆', positive: true },
  overload: { name: 'Surcharge', icon: '😫', positive: false },
  useless_meeting: { name: 'Reunion inutile', icon: '🙄', positive: false },
  work_conflict: { name: 'Conflit travail', icon: '⚡', positive: false },
  deadline: { name: 'Deadline', icon: '⏰', positive: false },
  good_exchanges: { name: 'Bons echanges', icon: '💬', positive: true },
  party: { name: 'Soiree', icon: '🎉', positive: true },
  family_time: { name: 'Famille', icon: '👨‍👩‍👧', positive: true },
  new_contacts: { name: 'Nouveaux contacts', icon: '🤗', positive: true },
  social_conflict: { name: 'Conflit', icon: '😤', positive: false },
  loneliness: { name: 'Solitude', icon: '😔', positive: false },
  misunderstanding: { name: 'Malentendu', icon: '😕', positive: false },
  sport: { name: 'Sport', icon: '🏃', positive: true },
  good_sleep: { name: 'Bien dormi', icon: '😴', positive: true },
  energy: { name: 'Energie', icon: '⚡', positive: true },
  sick: { name: 'Malade', icon: '🤒', positive: false },
  tired: { name: 'Fatigue', icon: '😩', positive: false },
  bad_sleep: { name: 'Mal dormi', icon: '😵', positive: false },
  pain: { name: 'Douleurs', icon: '🤕', positive: false },
  hobby: { name: 'Hobby', icon: '🎨', positive: true },
  accomplishment: { name: 'Accomplissement', icon: '🎯', positive: true },
  relaxation: { name: 'Detente', icon: '🧘', positive: true },
  good_news: { name: 'Bonne nouvelle', icon: '📰', positive: true },
  procrastination: { name: 'Procrastination', icon: '📱', positive: false },
  anxiety: { name: 'Anxiete', icon: '😰', positive: false },
  bad_news: { name: 'Mauvaise nouvelle', icon: '😢', positive: false },
  good_weather: { name: 'Beau temps', icon: '☀️', positive: true },
  weekend: { name: 'Week-end', icon: '🎊', positive: true },
  bad_weather: { name: 'Mauvais temps', icon: '🌧️', positive: false },
  transport_issues: { name: 'Transports', icon: '🚇', positive: false },
  unexpected: { name: 'Imprevu', icon: '😱', positive: false },
};

function getTagInfo(tagId: string) {
  return TAGS[tagId] || { name: tagId, icon: '🏷️', positive: true };
}

// Load today's entry if exists (for editing)
onMounted(async () => {
  loading.value = true;
  try {
    const res = await authFetch("/api/entries/today");
    if (res.ok) {
      const data = await res.json();
      if (data.exists) {
        dayScore.value = data.rating || 0;
        dayComment.value = data.description || "";
        selectedTags.value = data.tags || [];
      }
    }
  } catch {
    // Ignore errors - user will start fresh
  } finally {
    loading.value = false;
  }
});

async function next() {
  error.value = null;
  newBadges.value = [];

  // Bloquer si commentaire vide
  if (!canContinue.value) {
    error.value = "Merci d'ecrire un commentaire avant de continuer.";
    return;
  }

  saving.value = true;

  try {
    const res = await authFetch("/api/entries", {
      method: "POST",
      body: JSON.stringify({
        rating: dayScore.value,
        description: dayComment.value.trim(),
        tags: selectedTags.value,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Erreur lors de la sauvegarde.");
    }

    const result = await res.json();

    // Check for new badges
    if (result.newBadges && result.newBadges.length > 0) {
      newBadges.value = result.newBadges;
      // Show badges briefly then navigate
      setTimeout(() => {
        router.push({ name: "noterAutre" });
      }, 2500);
    } else {
      await router.push({ name: "noterAutre" });
    }
  } catch (e: any) {
    error.value = e?.message ?? "Impossible de sauvegarder.";
  } finally {
    saving.value = false;
  }
}

function toggleTagSection() {
  showTags.value = !showTags.value;
}
</script>

<template>
  <AppShell variant="center" :showDecor="false">
    <div class="page-center">
      <img class="brand-logo" src="../assets/img/tilt.png" alt="tilt" />

      <!-- New badges celebration -->
      <div v-if="newBadges.length > 0" class="badge-celebration">
        <div class="celebration-title">🎉 Nouveau badge!</div>
        <div class="badge-item" v-for="badgeId in newBadges" :key="badgeId">
          <span class="badge-icon">{{ badgeNames[badgeId]?.icon || '🏅' }}</span>
          <span class="badge-name">{{ badgeNames[badgeId]?.name || badgeId }}</span>
        </div>
      </div>

      <template v-if="!newBadges.length">
        <div v-if="loading" class="loading-msg">Chargement...</div>

        <template v-else>
          <div class="step-title">Note du {{ dateLabel }}</div>

          <div class="step-value" :class="{ 'step-value--glow': dayScore > 15 }">
            {{ moodText }}
          </div>

          <input class="range" type="range" min="0" max="20" v-model.number="dayScore" />

          <!-- Tags toggle button -->
          <button
            type="button"
            class="tags-toggle"
            :class="{ 'tags-toggle--active': showTags || selectedTags.length > 0 }"
            @click="toggleTagSection"
          >
            <span class="tags-toggle-icon">🏷️</span>
            <span class="tags-toggle-text">
              {{ selectedTags.length > 0 ? `${selectedTags.length} facteur(s)` : 'Ajouter des facteurs' }}
            </span>
            <span class="tags-toggle-arrow">{{ showTags ? '▲' : '▼' }}</span>
          </button>

          <!-- Tags section -->
          <div v-if="showTags" class="tags-section">
            <TagSelector v-model="selectedTags" />
          </div>

          <!-- Selected tags preview (when section is collapsed) -->
          <div v-if="!showTags && selectedTags.length > 0" class="selected-tags-preview">
            <span
              v-for="tagId in selectedTags.slice(0, 5)"
              :key="tagId"
              class="preview-tag"
              :class="{ 'preview-tag--positive': getTagInfo(tagId).positive, 'preview-tag--negative': !getTagInfo(tagId).positive }"
            >
              <span class="preview-tag-icon">{{ getTagInfo(tagId).icon }}</span>
              <span class="preview-tag-name">{{ getTagInfo(tagId).name }}</span>
            </span>
            <span v-if="selectedTags.length > 5" class="preview-more">
              +{{ selectedTags.length - 5 }}
            </span>
          </div>

          <div class="step-subtitle">Commentaire sur ma journee</div>

          <textarea
            class="textarea"
            rows="5"
            v-model="dayComment"
            placeholder="Ecris un commentaire..."
            @input="error = null"
          />

          <button
            class="btn btn-primary btn-wide"
            type="button"
            @click="next"
            :disabled="saving || !canContinue"
            :title="!canContinue ? 'Ecris un commentaire pour continuer' : ''"
          >
            {{ saving ? "SAUVEGARDE..." : "CONTINUER" }}
          </button>

          <p v-if="error" class="form-error">{{ error }}</p>
        </template>
      </template>

      <NavMenu />
    </div>
  </AppShell>
</template>

<style scoped>
.loading-msg {
  text-align: center;
  padding: 20px;
  opacity: 0.7;
}

.tags-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  max-width: 320px;
  padding: 10px 16px;
  margin: 12px 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.tags-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.tags-toggle--active {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.tags-toggle-icon {
  font-size: 16px;
}

.tags-toggle-text {
  flex: 1;
}

.tags-toggle-arrow {
  font-size: 10px;
  opacity: 0.6;
}

.tags-section {
  width: 100%;
  max-width: 500px;
  margin-bottom: 16px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.selected-tags-preview {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-bottom: 12px;
  max-width: 400px;
}

.preview-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-tag--positive {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.3);
  color: #86efac;
}

.preview-tag--negative {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.preview-tag-icon {
  font-size: 12px;
}

.preview-tag-name {
  font-weight: 500;
}

.preview-more {
  padding: 4px 10px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  font-weight: 600;
}

/* Badge celebration */
.badge-celebration {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px;
  animation: celebrationPop 0.5s ease;
}

@keyframes celebrationPop {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.celebration-title {
  font-size: 24px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.badge-celebration .badge-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 180, 0, 0.1));
  border: 2px solid rgba(255, 215, 0, 0.5);
  border-radius: 16px;
  animation: badgeShine 2s ease infinite;
}

@keyframes badgeShine {
  0%, 100% {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
  }
}

.badge-celebration .badge-icon {
  font-size: 40px;
}

.badge-celebration .badge-name {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .tags-toggle {
    max-width: 100%;
    padding: 12px 14px;
    font-size: 14px;
  }

  .tags-section {
    max-width: 100%;
  }

  .selected-tags-preview {
    max-width: 100%;
    gap: 5px;
  }

  .preview-tag {
    padding: 5px 8px;
    font-size: 10px;
  }

  .preview-tag-icon {
    font-size: 11px;
  }

  .badge-celebration {
    padding: 24px 16px;
  }

  .celebration-title {
    font-size: 20px;
  }

  .badge-celebration .badge-item {
    padding: 14px 20px;
  }

  .badge-celebration .badge-icon {
    font-size: 32px;
  }

  .badge-celebration .badge-name {
    font-size: 16px;
  }
}

@media (max-width: 360px) {
  .preview-tag {
    padding: 4px 6px;
    font-size: 9px;
  }

  .badge-celebration .badge-icon {
    font-size: 28px;
  }

  .badge-celebration .badge-name {
    font-size: 14px;
  }
}
</style>
