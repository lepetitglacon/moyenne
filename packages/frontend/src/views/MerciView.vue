<script setup lang="ts">
import AppShell from "../components/AppShell.vue";
import NavMenu from "../components/NavMenu.vue";
</script>

<template>
  <AppShell variant="center" :showDecor="false">
    <div class="page-center">
      <img class="brand-logo" src="../assets/img/tilt.png" alt="tilt" />

      <div class="thanks-text">MERCI D’AVOIR NOTÉ TA JOURNÉE DE MERDE</div>

<button class="btn btn-primary btn-wide" type="button" @click="$router.push({ name: 'stats' })">
  VOIR MES STATS
</button>

      <NavMenu />
    </div>
  </AppShell>
</template>
