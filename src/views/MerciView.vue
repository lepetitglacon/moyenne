<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function goProfile() {
  router.push("/stats");
}
</script>

<template>
  <div class="page-center">
    <h1 class="title">Merci</h1>
    <p class="subtitle">Votre note a bien été enregistrée.</p>

    <button class="btn btn-primary" type="button" @click="goProfile">
      Voir mon profil
    </button>
  </div>
</template>

<style scoped>
.page-center {
  width: min(820px, 100%);
  margin: 0 auto;
  padding: 18px 16px 24px;
  text-align: center;
}

.title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 8px;
}

.subtitle {
  opacity: 0.85;
  font-weight: 600;
  margin-bottom: 14px;
}

/* fallback si ton site a déjà des styles globaux */
.btn {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 800;
  cursor: pointer;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-primary {
  background: rgba(255, 255, 255, 0.08);
}
</style>
