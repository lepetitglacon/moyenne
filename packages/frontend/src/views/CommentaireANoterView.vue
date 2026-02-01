<script setup lang="ts">
import { useRouter } from "vue-router";
import AppShell from "../components/AppShell.vue";

const router = useRouter();
function next() {
  router.push({ name: "noterAutre" });
}
</script>

<template>
  <AppShell variant="center" :showDecor="false">
    <div class="page-center">
      <img class="brand-logo" src="../assets/img/tilt.png" alt="tilt" />

      <div class="step-subtitle">Commentaire à noter</div>

      <div class="textarea readonly">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nam eu neque ac erat posuere fringilla.
        Suspendisse quis sapien arcu. Duis vehicula lacinia turpis.
      </div>

      <button class="btn btn-primary btn-wide" type="button" @click="next">
        CONTINUER
      </button>
    </div>
  </AppShell>
</template>
