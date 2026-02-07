<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import AppShell from "../components/AppShell.vue";
import { API_BASE_URL } from "../api";

const router = useRouter();
const route = useRoute();

const token = computed(() => (route.query.token as string) || "");

const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const success = ref(false);
const error = ref<string | null>(null);

async function onSubmit() {
  error.value = null;

  if (!newPassword.value || newPassword.value.length < 6) {
    error.value = "Le mot de passe doit contenir au moins 6 caractères.";
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = "Les mots de passe ne correspondent pas.";
    return;
  }

  if (!token.value) {
    error.value = "Token manquant. Utilise le lien reçu par email.";
    return;
  }

  loading.value = true;

  try {
    const res = await fetch(`${API_BASE_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.value, newPassword: newPassword.value }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Erreur lors de la réinitialisation.");
    }

    success.value = true;
  } catch (e: any) {
    error.value = e?.message ?? "Erreur lors de la réinitialisation.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AppShell variant="login">
    <div class="page-center">
      <img class="brand-logo" src="../assets/img/tilt.png" alt="tilt" />

      <div class="panel panel--narrow">
        <template v-if="!success">
          <h1 class="section-title" style="text-align: center;">Nouveau mot de passe</h1>

          <form @submit.prevent="onSubmit">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <label class="field">
                <span class="field-label">Nouveau mot de passe :</span>
                <input
                  v-model="newPassword"
                  class="field-input"
                  type="password"
                  placeholder="••••••••••••••••"
                  autocomplete="new-password"
                  required
                  @input="error = null"
                />
              </label>

              <label class="field">
                <span class="field-label">Confirmer :</span>
                <input
                  v-model="confirmPassword"
                  class="field-input"
                  type="password"
                  placeholder="••••••••••••••••"
                  autocomplete="new-password"
                  required
                  @input="error = null"
                />
              </label>

              <button class="btn btn-primary" type="submit" :disabled="loading">
                {{ loading ? "..." : "RÉINITIALISER" }}
              </button>
            </div>
          </form>

          <p v-if="error" class="form-error">{{ error }}</p>
        </template>

        <template v-else>
          <h1 class="section-title" style="text-align: center;">Mot de passe réinitialisé !</h1>

          <p class="step-subtitle" style="text-align: center;">
            Tu peux maintenant te connecter avec ton nouveau mot de passe.
          </p>

          <button class="btn btn-primary" type="button" @click="router.push({ name: 'login' })">
            SE CONNECTER
          </button>
        </template>
      </div>
    </div>
  </AppShell>
</template>
