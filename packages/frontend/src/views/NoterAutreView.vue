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

const target = ref<null | {
  entryId: number;
  userId: number;
  username: string;
  date: string;
  theirRating: number;
  theirComment: string;
}>(null);

const otherMoodLabels = [
  "TES ANCÊTRES ONT HONTE",
  "MÊME LE KARMA A EU PITIÉ DE TOI",
  "C’EST UNE JOURNÉE À DÉCLARER À L’ASSURANCE",
  "DÉGÂTS IRRÉVERSIBLES",
  "J’AI MAL POUR TOI",
  "ÇA SENT LE BURNOUT",
  "DÉCEVANT, MAIS COHÉRENT AVEC TON PARCOURS",
  "PAS MORT MAIS PAS GLORIEUX",
  "C’EST LÉGAL MAIS IMMORAL",
  "JE VOIS CE QUE TU VEUX DIRE",
  "TU ES À DEUX DOIGTS DE DEVENIR QUELQU'UN",
  "ÇA VA… SI ON BAISSE LES ATTENTES",
  "OK, MAIS NE RECOMMENCE PAS",
  "ÇA S’AMÉLIORE, ÉTRANGEMENT",
  "PAS MAL DU TOUT, JE SUIS SURPRIS",
  "TU AS EU UNE VRAIE JOURNÉE, TOI",
  "SUSPECTEMENT BIEN",
  "QUI T’A LAISSÉ ÊTRE HEUREUX ?",
  "C'EST ÉCOEURANT DE RÉUSSIR AUTANT",
  "C’EST CARRÉMENT INDÉCENT",
  "JE TE DÉTESTE CORDIALEMENT (MAIS BRAVO)",
] as const;

const myRatingText = computed(() => {
  const score = otherScore.value; // 0..20
  return `${otherMoodLabels[score]} ${score} / 20`;
});

onMounted(async () => {
  loading.value = true;
  error.value = null;

  try {
    const res = await authFetch("/api/review/next");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Impossible de récupérer quelqu'un à noter.");
    }
    const data = await res.json();

    // Si done: true ou pas de données, redirection directe vers merci
    if (data?.done || !data?.userId) {
      router.replace({ name: "merci" });
      return;
    }

    target.value = data;
  } catch (e: any) {
    error.value = e?.message ?? "Erreur réseau.";
  } finally {
    loading.value = false;
  }
});

async function next() {
  error.value = null;

  // Rien à noter
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
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "Erreur lors de l’enregistrement de ta note.");
    }

    router.push({ name: "merci" });
  } catch (e: any) {
    error.value = e?.message ?? "Erreur réseau.";
  } finally {
    saving.value = false;
  }
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
        <div class="step-subtitle">Chargement…</div>
      </template>

      <template v-else-if="error">
        <div class="step-subtitle">Erreur</div>
        <p class="form-error">{{ error }}</p>
        <button class="btn btn-primary btn-wide" type="button" @click="reload">
          RÉESSAYER
        </button>
      </template>

      <template v-else-if="target">
        <div class="step-subtitle">Commentaire de {{ target.username }}</div>

        <div class="textarea readonly">
          {{ target.theirComment }}
        </div>

        <div class="step-subtitle" style="margin-top: 18px;">
          Sa note sur sa journée : {{ target.theirRating }} / 20
        </div>

        <div class="step-subtitle" style="margin-top: 18px;">
          Ta note sur sa journée
        </div>

        <div class="step-value" :class="{ 'step-value--glow': otherScore > 15 }">
          {{ myRatingText }}
        </div>

        <input class="range" type="range" min="0" max="20" v-model.number="otherScore" />

        <button class="btn btn-primary btn-wide" type="button" @click="next" :disabled="saving">
          {{ saving ? "SAUVEGARDE..." : "CONTINUER" }}
        </button>

        <p v-if="error" class="form-error">{{ error }}</p>
      </template>
    </div>
  </AppShell>
</template>
