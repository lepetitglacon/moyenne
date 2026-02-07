<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth";
import { API_BASE_URL } from "../api";

const router = useRouter();
const { loginWithToken } = useAuth();

const username = ref("");
const password = ref("");
const registerEmail = ref("");
const isRegisterMode = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

const canSubmit = computed(() => username.value.trim().length > 0 && password.value.trim().length > 0);

async function onLogin() {
  error.value = null;

  if (!canSubmit.value) {
    error.value = "Merci de renseigner un pseudo et un mot de passe.";
    return;
  }

  loading.value = true;

  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.value.trim(), password: password.value }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Connexion impossible.");
    }

    if (!data?.token) {
      throw new Error("Token manquant.");
    }

    loginWithToken(data.token, data.refreshToken);
    await router.push({ name: "note" });
  } catch (e: any) {
    error.value = e?.message ?? "Connexion impossible.";
  } finally {
    loading.value = false;
  }
}

async function onRegister() {
  error.value = null;

  if (!canSubmit.value) {
    error.value = "Merci de renseigner un pseudo et un mot de passe.";
    return;
  }

  if (!isRegisterMode.value) {
    isRegisterMode.value = true;
    return;
  }

  loading.value = true;

  try {
    // 1) création du compte
    const registerBody: Record<string, string> = {
      username: username.value.trim(),
      password: password.value,
    };
    if (registerEmail.value.trim()) {
      registerBody.email = registerEmail.value.trim();
    }

    const res = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerBody),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Création de compte impossible.");
    }

    // 2) login auto
    await onLogin();
  } catch (e: any) {
    error.value = e?.message ?? "Création de compte impossible.";
    loading.value = false;
  }
}
</script>

<template>
  <AppShell variant="login">
    <div class="page-center">
      <img class="brand-logo" src="../assets/img/tilt.png" alt="tilt" />

      <form class="panel panel--narrow" @submit.prevent="onLogin">
        <label class="field">
          <span class="field-label">Pseudo :</span>
          <input
            v-model="username"
            class="field-input"
            type="text"
            placeholder="Pupute"
            autocomplete="username"
            required
            @input="error = null"
          />
        </label>

        <label class="field">
          <span class="field-label">Mot de passe :</span>
          <input
            v-model="password"
            class="field-input"
            type="password"
            placeholder="••••••••••••••••"
            autocomplete="current-password"
            required
            @input="error = null"
          />
        </label>

        <label v-if="isRegisterMode" class="field">
          <span class="field-label">Email (pour récupérer ton mot de passe) :</span>
          <input
            v-model="registerEmail"
            class="field-input"
            type="email"
            placeholder="ton@email.com"
            autocomplete="email"
            @input="error = null"
          />
        </label>

        <button v-if="!isRegisterMode" class="btn btn-primary" type="submit" :disabled="loading">
          {{ loading ? "CONNEXION..." : "CONTINUER" }}
        </button>

        <button class="btn btn-secondary" type="button" :disabled="loading" @click="onRegister">
          {{ loading ? "..." : isRegisterMode ? "VALIDER L'INSCRIPTION" : "CRÉER UN PROFIL" }}
        </button>

        <a v-if="isRegisterMode" class="link-muted" href="#" @click.prevent="isRegisterMode = false">
          Retour à la connexion
        </a>

        <a class="link-muted" href="#" @click.prevent="router.push({ name: 'forgotPassword' })">Mot de passe oublié</a>

        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="legal">
          <a href="#" @click.prevent>Mentions légales</a>
          <span> - </span>
          <a href="#" @click.prevent>Contact</a>
          <span> - </span>
          <a href="#" @click.prevent>Plan du site</a>
        </div>
      </form>
    </div>
  </AppShell>
</template>
