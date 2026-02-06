<script setup lang="ts">
import { ref, watch } from "vue";
import { useAuth } from "../composables/useAuth";

const props = defineProps<{
  modelValue: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const { authFetch } = useAuth();

const isOpen = ref(false);
const searchQuery = ref("");
const gifs = ref<{ id: string; url: string; previewUrl: string; width: number; height: number }[]>([]);
const searching = ref(false);
const searchError = ref<string | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (!q.trim()) {
    gifs.value = [];
    return;
  }
  debounceTimer = setTimeout(() => searchGifs(q.trim()), 400);
});

async function searchGifs(query: string) {
  searching.value = true;
  searchError.value = null;
  try {
    const res = await authFetch(`/api/giphy/search?q=${encodeURIComponent(query)}&limit=12`);
    if (!res.ok) throw new Error("Erreur recherche GIF");
    const data = await res.json();
    gifs.value = data.gifs || [];
  } catch {
    searchError.value = "Impossible de chercher des GIFs";
    gifs.value = [];
  } finally {
    searching.value = false;
  }
}

async function loadTrending() {
  searching.value = true;
  searchError.value = null;
  try {
    const res = await authFetch("/api/giphy/trending?limit=12");
    if (!res.ok) throw new Error("Erreur trending");
    const data = await res.json();
    gifs.value = data.gifs || [];
  } catch {
    gifs.value = [];
  } finally {
    searching.value = false;
  }
}

function openPicker() {
  isOpen.value = true;
  if (!gifs.value.length && !searchQuery.value) {
    loadTrending();
  }
}

function selectGif(gif: (typeof gifs.value)[0]) {
  emit("update:modelValue", gif.url);
  isOpen.value = false;
  searchQuery.value = "";
  gifs.value = [];
}

function removeGif() {
  emit("update:modelValue", null);
}
</script>

<template>
  <div class="gif-picker">
    <!-- Selected GIF preview -->
    <div v-if="modelValue" class="gif-selected">
      <img :src="modelValue" alt="GIF selectionne" class="gif-preview" />
      <div class="gif-actions">
        <button type="button" class="gif-action-btn" @click="openPicker" title="Changer le GIF">
          Changer
        </button>
        <button type="button" class="gif-action-btn gif-action-btn--remove" @click="removeGif" title="Supprimer le GIF">
          Supprimer
        </button>
      </div>
    </div>

    <!-- Add GIF button -->
    <button
      v-else-if="!isOpen"
      type="button"
      class="gif-toggle"
      @click="openPicker"
    >
      <span class="gif-toggle-icon">GIF</span>
      <span class="gif-toggle-text">Ajouter un GIF</span>
    </button>

    <!-- GIF search panel -->
    <div v-if="isOpen && !modelValue" class="gif-panel">
      <div class="gif-panel-header">
        <input
          type="text"
          class="gif-search"
          v-model="searchQuery"
          placeholder="Rechercher un GIF..."
          autofocus
        />
        <button type="button" class="gif-close" @click="isOpen = false; searchQuery = ''; gifs = []">
          ✕
        </button>
      </div>

      <div v-if="searching" class="gif-loading">Recherche...</div>
      <div v-else-if="searchError" class="gif-error">{{ searchError }}</div>
      <div v-else-if="gifs.length" class="gif-grid">
        <button
          v-for="gif in gifs"
          :key="gif.id"
          type="button"
          class="gif-item"
          @click="selectGif(gif)"
        >
          <img :src="gif.previewUrl" :alt="'GIF'" loading="lazy" />
        </button>
      </div>
      <div v-else-if="searchQuery.trim()" class="gif-empty">Aucun GIF trouve</div>

      <div class="gif-powered">Powered by GIPHY</div>
    </div>
  </div>
</template>

<style scoped>
.gif-picker {
  width: 100%;
  max-width: 400px;
  margin: 8px 0;
}

.gif-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.gif-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.9);
}

.gif-toggle-icon {
  font-size: 12px;
  font-weight: 900;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.gif-selected {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.gif-preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: 10px;
  object-fit: contain;
}

.gif-actions {
  display: flex;
  gap: 8px;
}

.gif-action-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.gif-action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.gif-action-btn--remove {
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.gif-action-btn--remove:hover {
  background: rgba(239, 68, 68, 0.15);
}

.gif-panel {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gif-panel-header {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.gif-search {
  flex: 1;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  outline: none;
  font-family: inherit;
}

.gif-search:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.gif-search::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.gif-close {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-family: inherit;
}

.gif-close:hover {
  background: rgba(255, 255, 255, 0.12);
}

.gif-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.gif-item {
  background: none;
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.15s;
  aspect-ratio: 1;
}

.gif-item:hover {
  border-color: rgba(147, 51, 234, 0.6);
  transform: scale(1.03);
}

.gif-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gif-loading,
.gif-error,
.gif-empty {
  text-align: center;
  padding: 20px;
  font-size: 13px;
  opacity: 0.6;
}

.gif-error {
  color: #fca5a5;
}

.gif-powered {
  text-align: center;
  font-size: 10px;
  opacity: 0.4;
  margin-top: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Scrollbar */
.gif-grid::-webkit-scrollbar {
  width: 4px;
}

.gif-grid::-webkit-scrollbar-track {
  background: transparent;
}

.gif-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

@media (max-width: 600px) {
  .gif-picker {
    max-width: 100%;
  }

  .gif-grid {
    grid-template-columns: repeat(2, 1fr);
    max-height: 240px;
  }

  .gif-preview {
    max-height: 160px;
  }
}
</style>
