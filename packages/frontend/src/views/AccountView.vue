<script setup lang="ts">
import { ref, onMounted } from "vue";
import AppShell from "../components/AppShell.vue";
import NavMenu from "../components/NavMenu.vue";
import { useAuth } from "../composables/useAuth";

const { authFetch } = useAuth();

const username = ref("");
const email = ref("");
const emailLoading = ref(false);
const emailSuccess = ref("");
const emailError = ref("");

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const passwordLoading = ref(false);
const passwordSuccess = ref("");
const passwordError = ref("");

const loading = ref(true);

onMounted(async () => {
  try {
    const res = await authFetch("/api/account/me");
    if (res.ok) {
      const data = await res.json();
      username.value = data.username;
      email.value = data.email || "";
    }
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
});

async function onUpdateEmail() {
  emailError.value = "";
  emailSuccess.value = "";

  if (!email.value.trim()) {
    emailError.value = "L'email est requis";
    return;
  }

  emailLoading.value = true;
  try {
    const res = await authFetch("/api/account/email", {
      method: "PUT",
      body: JSON.stringify({ email: email.value.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "Erreur lors de la mise à jour");
    }
    emailSuccess.value = "Email mis à jour !";
  } catch (e: any) {
    emailError.value = e?.message ?? "Erreur lors de la mise à jour";
  } finally {
    emailLoading.value = false;
  }
}

async function onChangePassword() {
  passwordError.value = "";
  passwordSuccess.value = "";

  if (!currentPassword.value || !newPassword.value) {
    passwordError.value = "Tous les champs sont requis";
    return;
  }

  if (newPassword.value.length < 6) {
    passwordError.value = "Le nouveau mot de passe doit contenir au moins 6 caractères";
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = "Les mots de passe ne correspondent pas";
    return;
  }

  passwordLoading.value = true;
  try {
    const res = await authFetch("/api/account/password", {
      method: "PUT",
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "Erreur lors du changement de mot de passe");
    }
    passwordSuccess.value = "Mot de passe mis à jour !";
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
  } catch (e: any) {
    passwordError.value = e?.message ?? "Erreur lors du changement de mot de passe";
  } finally {
    passwordLoading.value = false;
  }
}
</script>

<template>
  <AppShell variant="center">
    <div class="page-center">
      <div class="panel panel--narrow">
        <h1 class="section-title">Mon compte</h1>

        <div v-if="loading" class="step-subtitle">Chargement...</div>

        <template v-else>
          <!-- Email banner if missing -->
          <div v-if="!email" class="email-banner">
            Ajoute ton email pour pouvoir réinitialiser ton mot de passe en cas d'oubli.
          </div>

          <!-- Info section -->
          <div class="account-section">
            <h2 class="account-section-title">Informations</h2>

            <label class="field">
              <span class="field-label">Pseudo</span>
              <input
                :value="username"
                class="field-input"
                type="text"
                disabled
              />
            </label>

            <label class="field">
              <span class="field-label">Email</span>
              <input
                v-model="email"
                class="field-input"
                type="email"
                placeholder="ton@email.com"
                @input="emailError = ''; emailSuccess = ''"
              />
            </label>

            <button
              class="btn btn-secondary"
              type="button"
              :disabled="emailLoading"
              @click="onUpdateEmail"
            >
              {{ emailLoading ? "..." : "Mettre à jour l'email" }}
            </button>

            <p v-if="emailSuccess" class="form-success">{{ emailSuccess }}</p>
            <p v-if="emailError" class="form-error">{{ emailError }}</p>
          </div>

          <!-- Password section -->
          <div class="account-section">
            <h2 class="account-section-title">Changer le mot de passe</h2>

            <label class="field">
              <span class="field-label">Mot de passe actuel</span>
              <input
                v-model="currentPassword"
                class="field-input"
                type="password"
                autocomplete="current-password"
                @input="passwordError = ''; passwordSuccess = ''"
              />
            </label>

            <label class="field">
              <span class="field-label">Nouveau mot de passe</span>
              <input
                v-model="newPassword"
                class="field-input"
                type="password"
                autocomplete="new-password"
                @input="passwordError = ''; passwordSuccess = ''"
              />
            </label>

            <label class="field">
              <span class="field-label">Confirmer le nouveau mot de passe</span>
              <input
                v-model="confirmPassword"
                class="field-input"
                type="password"
                autocomplete="new-password"
                @input="passwordError = ''; passwordSuccess = ''"
              />
            </label>

            <button
              class="btn btn-secondary"
              type="button"
              :disabled="passwordLoading"
              @click="onChangePassword"
            >
              {{ passwordLoading ? "..." : "Changer le mot de passe" }}
            </button>

            <p v-if="passwordSuccess" class="form-success">{{ passwordSuccess }}</p>
            <p v-if="passwordError" class="form-error">{{ passwordError }}</p>
          </div>
        </template>

        <NavMenu />
      </div>
    </div>
  </AppShell>
</template>

<style scoped>
.account-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}

.account-section-title {
  font-size: 14px;
  color: rgba(215, 220, 255, 0.65);
  font-weight: 700;
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.email-banner {
  background: rgba(255, 180, 0, 0.12);
  border: 1px solid rgba(255, 180, 0, 0.25);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
  color: rgba(255, 220, 150, 0.9);
}

.form-success {
  margin: 4px 0 0;
  font-size: 12px;
  color: #7aff7a;
  text-align: center;
}
</style>
