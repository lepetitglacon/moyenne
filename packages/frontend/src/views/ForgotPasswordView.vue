<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import { API_BASE_URL } from "../api";

const router = useRouter();

const email = ref("");
const loading = ref(false);
const sent = ref(false);
const error = ref<string | null>(null);

async function onSubmit() {
  error.value = null;

  if (!email.value.trim()) {
    error.value = "Merci de renseigner ton email.";
    return;
  }

  loading.value = true;

  try {
    const res = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value.trim() }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Erreur lors de l'envoi.");
    }

    sent.value = true;
  } catch (e: any) {
    error.value = e?.message ?? "Erreur lors de l'envoi.";
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
        <template v-if="!sent">
          <h1 class="section-title" style="text-align: center;">Mot de passe oublié</h1>

          <p class="step-subtitle" style="text-align: center; margin-bottom: 8px;">
            Entre ton email pour recevoir un lien de réinitialisation.
          </p>

          <form @submit.prevent="onSubmit">
            <label class="field">
              <span class="field-label">Email :</span>
              <input
                v-model="email"
                class="field-input"
                type="email"
                placeholder="ton@email.com"
                autocomplete="email"
                required
                @input="error = null"
              />
            </label>

            <button class="btn btn-primary" type="submit" :disabled="loading" style="margin-top: 16px;">
              {{ loading ? "ENVOI..." : "ENVOYER LE LIEN" }}
            </button>
          </form>

          <p v-if="error" class="form-error">{{ error }}</p>
        </template>

        <template v-else>
          <h1 class="section-title" style="text-align: center;">Email envoyé !</h1>

          <p class="step-subtitle" style="text-align: center;">
            Si cette adresse est associée à un compte, tu recevras un email avec un lien pour réinitialiser ton mot de passe.
          </p>
        </template>

        <a class="link-muted" style="align-self: center; margin-top: 12px;" href="#" @click.prevent="router.push({ name: 'login' })">
          Retour à la connexion
        </a>
      </div>
    </div>
  </AppShell>
</template>
