<script setup lang="ts">
defineProps<{
  variant?: "login" | "center" | "wide";
  showDecor?: boolean;
}>();
</script>

<template>
  <div class="app-shell">
    <div v-if="showDecor !== false" class="decor decor--left" aria-hidden="true"></div>
    <div v-if="showDecor !== false" class="decor decor--right" aria-hidden="true"></div>

    <div
      class="shell-content"
      :class="{
        'shell-content--login': variant === 'login',
        'shell-content--center': !variant || variant === 'center',
        'shell-content--wide': variant === 'wide',
      }"
    >
      <slot />
    </div>
  </div>
</template>
