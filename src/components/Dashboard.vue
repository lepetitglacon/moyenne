<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useAuth } from '../composables/useAuth'
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from 'reka-ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'

const { user, authFetch, logout } = useAuth()
const queryClient = useQueryClient()

// Form State
const rating = ref([5])
const description = ref('')
const saveMessage = ref('')

// --- Queries ---

const fetchHistory = async () => {
  const res = await authFetch('http://localhost:3000/api/entries/history')
  if (!res.ok) throw new Error('Network response was not ok')
  return res.json()
}

const fetchStats = async () => {
  const res = await authFetch('http://localhost:3000/api/stats/me')
  if (!res.ok) throw new Error('Network response was not ok')
  return res.json()
}

const fetchTodayEntry = async () => {
  const res = await authFetch('http://localhost:3000/api/entries/today')
  if (!res.ok) throw new Error('Network response was not ok')
  return res.json()
}

const { data: history, isPending: isHistoryLoading } = useQuery({
  queryKey: ['history'],
  queryFn: fetchHistory,
})

const { data: stats, isPending: isStatsLoading } = useQuery({
  queryKey: ['stats', 'me'],
  queryFn: fetchStats,
  initialData: { all_time: 0, current_week: 0, current_month: 0 }
})

const { data: todayEntry } = useQuery({
  queryKey: ['todayEntry'],
  queryFn: fetchTodayEntry,
})

// Update form when todayEntry loads
watchEffect(() => {
  if (todayEntry.value) {
    rating.value = [todayEntry.value.rating]
    description.value = todayEntry.value.description || ''
  }
})

// --- Mutation ---

const saveEntryMutation = useMutation({
  mutationFn: async (newEntry: { rating: number, description: string }) => {
    // No date sent, server handles it
    const res = await authFetch('http://localhost:3000/api/entries', {
      method: 'POST',
      body: JSON.stringify(newEntry)
    })
    if (!res.ok) throw new Error('Failed to save')
    return res.json()
  },
  onSuccess: () => {
    saveMessage.value = 'Enregistré avec succès !'
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['history'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
    queryClient.invalidateQueries({ queryKey: ['todayEntry'] }) // Ensure local state is sync
    
    setTimeout(() => {
        saveMessage.value = ''
    }, 3000)
  },
  onError: () => {
    saveMessage.value = 'Erreur lors de l\'enregistrement'
  }
})

const saveEntry = () => {
  saveEntryMutation.mutate({
    rating: rating.value[0],
    description: description.value
  })
}

const handleLogout = () => {
  queryClient.invalidateQueries({ queryKey: ['publicStats'] })
  logout()
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>Bonjour, {{ user?.username }} 👋</h2>
      <button @click="handleLogout" class="btn-outline">Se déconnecter</button>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-label">Moyenne Globale</span>
        <span class="stat-value" v-if="!isStatsLoading">{{ stats?.all_time?.toFixed(1) || '-' }}/10</span>
        <span class="stat-value" v-else>...</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Cette Semaine</span>
        <span class="stat-value" v-if="!isStatsLoading">{{ stats?.current_week?.toFixed(1) || '-' }}/10</span>
        <span class="stat-value" v-else>...</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Ce Mois</span>
        <span class="stat-value" v-if="!isStatsLoading">{{ stats?.current_month?.toFixed(1) || '-' }}/10</span>
        <span class="stat-value" v-else>...</span>
      </div>
    </div>

    <div class="content-grid">
      <!-- Daily Entry Form -->
      <div class="card entry-form">
        <h3>Ma journée d\'aujourd\'hui</h3>
        
        <div class="form-control">
          <label>Note de la journée : {{ rating[0] }}/10</label>
          <SliderRoot v-model="rating" :max="10" :step="1" class="slider-root">
            <SliderTrack class="slider-track">
              <SliderRange class="slider-range" />
            </SliderTrack>
            <SliderThumb class="slider-thumb" aria-label="Volume" />
          </SliderRoot>
        </div>

        <div class="form-control">
          <label>Description (optionnel)</label>
          <textarea v-model="description" rows="4" placeholder="Comment s\'est passée votre journée ?"></textarea>
        </div>

        <button @click="saveEntry" :disabled="saveEntryMutation.isPending.value" class="btn-primary">
          {{ saveEntryMutation.isPending.value ? 'Enregistrement...' : 'Enregistrer ma journée' }}
        </button>
        <p v-if="saveMessage" class="message" :class="{ error: saveEntryMutation.isError.value }">{{ saveMessage }}</p>
      </div>

      <!-- History Carousel (Simple Horizontal Scroll) -->
      <div class="history-section">
        <h3>Derniers 14 jours</h3>
        <div v-if="isHistoryLoading">Chargement...</div>
        <div v-else-if="!history || history.length === 0" class="empty-state">Aucune entrée récente.</div>
        <div v-else class="carousel-container">
          <div v-for="entry in history" :key="entry.id" class="history-card">
            <div class="card-date">{{ formatDate(entry.date) }}</div>
            <div class="card-rating" :class="'rate-' + Math.round(entry.rating)">
              {{ entry.rating }}
            </div>
            <p class="card-desc">{{ entry.description || 'Pas de description' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: #f4f4f5;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid #e4e4e7;
}

.stat-label {
  display: block;
  font-size: 14px;
  color: #71717a;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #18181b;
}

.content-grid {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.entry-form {
  background: white;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #f4f4f5;
}

.form-control {
  margin-bottom: 25px;
}

.form-control label {
  display: block;
  font-weight: 600;
  margin-bottom: 10px;
  color: #27272a;
}

textarea {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #d4d4d8;
  font-family: inherit;
  resize: vertical;
}

/* Slider Styles (Reka UI) */
.slider-root {
  position: relative;
  display: flex;
  align-items: center;
  user-select: none;
  touch-action: none;
  width: 100%;
  height: 20px;
}

.slider-track {
  background-color: #e4e4e7;
  position: relative;
  flex-grow: 1;
  border-radius: 9999px;
  height: 6px;
}

.slider-range {
  position: absolute;
  background-color: #18181b;
  border-radius: 9999px;
  height: 100%;
}

.slider-thumb {
  display: block;
  width: 24px;
  height: 24px;
  background-color: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  border: 2px solid #18181b;
  border-radius: 9999px;
  cursor: pointer;
}
.slider-thumb:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(24, 24, 27, 0.1);
}

/* Carousel */
.carousel-container {
  display: flex;
  gap: 15px;
  overflow-x: auto;
  padding-bottom: 20px;
  scroll-behavior: smooth;
  /* Hide scrollbar */
  scrollbar-width: thin;
}

.history-card {
  min-width: 160px;
  max-width: 160px;
  background: white;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  padding: 15px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.card-date {
  font-size: 12px;
  color: #71717a;
  margin-bottom: 10px;
  font-weight: 500;
}

.card-rating {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #18181b;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 10px;
}

.card-desc {
  font-size: 12px;
  color: #52525b;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.message {
  margin-top: 15px;
  color: #059669;
  font-weight: 500;
}

.message.error {
    color: #ef4444;
}

.btn-outline {
  background: transparent;
  border: 1px solid #d4d4d8;
  color: #18181b;
  padding: 8px 16px;
  border-radius: 6px;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: #18181b;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
}

.btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}
</style>
