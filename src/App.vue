<script setup lang="ts">
import { onMounted } from 'vue'
import LoginModal from './components/LoginModal.vue'
import Dashboard from './components/Dashboard.vue'
import { useAuth } from './composables/useAuth'
import { useQuery } from '@tanstack/vue-query'

const { isAuthenticated } = useAuth()

const fetchPublicStats = async () => {
  const res = await fetch('http://localhost:3000/api/stats/public')
  if (!res.ok) throw new Error('Failed to fetch stats')
  return res.json()
}

// Only run query if NOT authenticated (though logic could be simpler)
const { data: publicStats, isPending } = useQuery({
  queryKey: ['publicStats'],
  queryFn: fetchPublicStats,
  enabled: () => !isAuthenticated.value, // Make it a function to be reactive
})
</script>

<template>
  <div class="container">
    <header class="header">
      <div class="logo">MonApp</div>
      <nav v-if="!isAuthenticated">
        <LoginModal />
      </nav>
    </header>
    
    <main class="main-content">
      <!-- Authenticated View -->
      <Dashboard v-if="isAuthenticated" />

      <!-- Public View -->
      <div v-else class="hero">
        <h1>Bienvenue sur MonApp</h1>
        <p>Suivez votre humeur et vos notes quotidiennes.</p>
        
        <div class="stats-preview">
          <h3>Moyennes de la communauté</h3>
          <div class="stats-grid">
            <div class="p-stat">
              <span class="p-label">Globale</span>
              <span class="p-value" v-if="!isPending">{{ publicStats.all_time?.toFixed(1) || '-' }}</span>
              <span class="p-value" v-else>...</span>
            </div>
            <div class="p-stat">
              <span class="p-label">Cette Semaine</span>
              <span class="p-value" v-if="!isPending">{{ publicStats.current_week?.toFixed(1) || '-' }}</span>
              <span class="p-value" v-else>...</span>
            </div>
            <div class="p-stat">
              <span class="p-label">Ce Mois</span>
              <span class="p-value" v-if="!isPending">{{ publicStats.current_month?.toFixed(1) || '-' }}</span>
              <span class="p-value" v-else>...</span>
            </div>
          </div>
        </div>

        <div class="features">
          <div class="feature-card">
            <h3>Suivi Quotidien</h3>
            <p>Notez votre journée et ajoutez une description.</p>
          </div>
          <div class="feature-card">
            <h3>Statistiques</h3>
            <p>Visualisez vos moyennes et comparez avec la communauté.</p>
          </div>
          <div class="feature-card">
            <h3>Historique</h3>
            <p>Retrouvez vos 14 derniers jours en un coup d'œil.</p>
          </div>
        </div>
      </div>
    </main>

    <footer class="footer">
      <p>&copy; 2026 MonApp. Tous droits réservés.</p>
    </footer>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #eee;
}

.logo {
  font-size: 24px;
  font-weight: 700;
  color: #111;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start; /* Changed from center to accommodate dashboard height */
  padding: 60px 0;
  width: 100%;
}

.hero {
  text-align: center;
  max-width: 800px;
  width: 100%;
}

.hero h1 {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 20px;
  background: linear-gradient(to right, #000, #555);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero p {
  font-size: 18px;
  color: #666;
  margin-bottom: 40px;
  line-height: 1.6;
}

.stats-preview {
  background: #111;
  color: white;
  padding: 30px;
  border-radius: 16px;
  margin-bottom: 50px;
}

.stats-preview h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-weight: 500;
  opacity: 0.9;
}

.stats-grid {
  display: flex;
  justify-content: center;
  gap: 40px;
}

.p-stat {
  display: flex;
  flex-direction: column;
}

.p-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.7;
  margin-bottom: 5px;
}

.p-value {
  font-size: 32px;
  font-weight: 700;
  color: #10b981;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
  margin-top: 50px;
}

.feature-card {
  padding: 25px;
  border-radius: 12px;
  background: #f9f9f9;
  border: 1px solid #eee;
  text-align: left;
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: #ddd;
}

.feature-card h3 {
  font-size: 18px;
  margin: 0 0 10px;
  color: #111;
}

.feature-card p {
  font-size: 14px;
  margin: 0;
  color: #555;
}

.footer {
  padding: 30px 0;
  border-top: 1px solid #eee;
  text-align: center;
  color: #999;
  font-size: 14px;
}
</style>