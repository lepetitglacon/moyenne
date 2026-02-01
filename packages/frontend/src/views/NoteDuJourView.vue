<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import { useFlow } from "../composables/useFlow";
import { useAuth } from "../composables/useAuth";

const router = useRouter();
const { authFetch } = useAuth();

const { dayScore, dayComment } = useFlow();

const error = ref<string | null>(null);
const saving = ref(false);

const moodLabels = [
  "JE PRÉFÈRE ÊTRE UN CAILLOU",
  "LA VIE M’A BLOQUÉ",
  "J’AI PERDU CONTRE UN LUNDI",
  "J’AI EXISTÉ PAR ERREUR",
  "MA MOTIVATION EST DÉCÉDÉE",
  "C’EST UN CRI À L’AIDE",
  "JE SURVIS PAR HABITUDE",
  "PAS MORT MAIS PAS VIVANT",
  "ÉMOTIONNELLEMENT EN MODE AVION",
  "TU VOIS CE QUE JE VEUX DIRE ?",
  "NEUTRE COMME UN MUR BLANC",
  "LÉGÈREMENT MOINS MALHEUREUX",
  "ÇA PASSE MAIS JE PORTE PLAINTE",
  "PAS BIEN MAIS STABLE",
  "ÉTONNAMMENT FONCTIONNEL",
  "J’ACCEPTE MON EXISTENCE",
  "J’AI RESSENTI UN MICRO-BONHEUR",
  "ÇA COMMENCE À ME PLAIRE",
  "JOURNÉE ILLÉGALEMENT BIEN",
  "QUI A AUTORISÉ ÇA ? C’ÉTAIT BIEN",
  "JE POURRAIS REFAIRE CETTE JOURNÉE",
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

// ✅ validation: commentaire obligatoire (on trim pour ignorer les espaces)
const canContinue = computed(() => dayComment.value.trim().length > 0);

async function next() {
  error.value = null;

  // ✅ bloquer si commentaire vide
  if (!canContinue.value) {
    error.value = "Merci d’écrire un commentaire avant de continuer.";
    return;
  }

  saving.value = true;

  try {
    const res = await authFetch("/api/entries", {
      method: "POST",
      body: JSON.stringify({
        rating: dayScore.value,
        description: dayComment.value.trim(),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Erreur lors de la sauvegarde.");
    }

    await router.push({ name: "noterAutre" });
  } catch (e: any) {
    error.value = e?.message ?? "Impossible de sauvegarder.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppShell variant="center" :showDecor="false">
    <div class="page-center">
      <img class="brand-logo" src="../assets/img/tilt.png" alt="tilt" />

      <div class="step-title">Note du {{ dateLabel }}</div>

      <div class="step-value" :class="{ 'step-value--glow': dayScore > 15 }">
        {{ moodText }}
      </div>

      <input class="range" type="range" min="0" max="20" v-model.number="dayScore" />

      <div class="step-subtitle">Commentaire sur ma journée</div>

      <textarea
        class="textarea"
        rows="6"
        v-model="dayComment"
        placeholder="Écris un commentaire..."
        @input="error = null"
      />

      <button
        class="btn btn-primary btn-wide"
        type="button"
        @click="next"
        :disabled="saving || !canContinue"
        :title="!canContinue ? 'Écris un commentaire pour continuer' : ''"
      >
        {{ saving ? "SAUVEGARDE..." : "CONTINUER" }}
      </button>

      <p v-if="error" class="form-error">{{ error }}</p>
    </div>
  </AppShell>
</template>
