<script setup lang="ts">
import { ref } from 'vue'
import {
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'reka-ui'
import { X } from 'lucide-vue-next'
import { useAuth } from '../composables/useAuth'

// Auth Composable
const { setToken } = useAuth()

// Login State
const loginUsername = ref('')
const loginPassword = ref('')
const loginError = ref('')

// Register State
const registerUsername = ref('')
const registerPassword = ref('')
const registerError = ref('')
const registerSuccess = ref('')

const isOpen = ref(false)
const activeTab = ref('login')

const handleLogin = async () => {
  loginError.value = ''
  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: loginUsername.value,
        password: loginPassword.value,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Login failed')
    }

    const data = await response.json()
    setToken(data.token) // Use composable
    // alert('Connexion réussie !')
    isOpen.value = false
    loginUsername.value = ''
  } catch (e: any) {
    loginError.value = e.message
  }
}

const handleRegister = async () => {
  registerError.value = ''
  registerSuccess.value = ''
  try {
    const response = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: registerUsername.value,
        password: registerPassword.value,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Registration failed')
    }

    registerSuccess.value = 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.'
    registerUsername.value = ''
    registerPassword.value = ''
    
    // Optional: Switch to login tab after brief delay or let user see message
    setTimeout(() => {
        activeTab.value = 'login'
        registerSuccess.value = ''
        // Pre-fill login username for convenience
        // loginUsername.value = registerUsername.value // Can't do this easily as we cleared it. 
    }, 1500)

  } catch (e: any) {
    registerError.value = e.message
  }
}
</script>

<template>
  <DialogRoot v-model:open="isOpen">
    <DialogTrigger as-child>
      <button class="btn-primary">
        Espace Membre
      </button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="dialog-overlay" />
      <DialogContent class="dialog-content">
        <div class="dialog-header">
          <DialogTitle class="dialog-title">Bienvenue</DialogTitle>
          <DialogDescription class="dialog-desc">
            Gérez votre accès membre ici.
          </DialogDescription>
          <DialogClose class="dialog-close" aria-label="Close">
            <X :size="20" />
          </DialogClose>
        </div>

        <TabsRoot v-model="activeTab" class="tabs-root">
          <TabsList class="tabs-list">
            <TabsTrigger value="login" class="tabs-trigger">
              Connexion
            </TabsTrigger>
            <TabsTrigger value="register" class="tabs-trigger">
              Inscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" class="tabs-content">
            <form @submit.prevent="handleLogin" class="auth-form">
              <div class="form-group">
                <label for="login-username">Nom d'utilisateur</label>
                <input id="login-username" v-model="loginUsername" type="text" placeholder="admin" required />
              </div>
              <div class="form-group">
                <label for="login-password">Mot de passe</label>
                <input id="login-password" v-model="loginPassword" type="password" placeholder="••••••" required />
              </div>
              
              <p v-if="loginError" class="error-msg">{{ loginError }}</p>
              
              <div class="form-actions">
                <button type="submit" class="btn-submit">Se connecter</button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="register" class="tabs-content">
            <form @submit.prevent="handleRegister" class="auth-form">
              <div class="form-group">
                <label for="reg-username">Choisir un nom d'utilisateur</label>
                <input id="reg-username" v-model="registerUsername" type="text" placeholder="Ex: JeanDupont" required />
              </div>
              <div class="form-group">
                <label for="reg-password">Choisir un mot de passe</label>
                <input id="reg-password" v-model="registerPassword" type="password" placeholder="••••••" required />
              </div>
              
              <p v-if="registerError" class="error-msg">{{ registerError }}</p>
              <p v-if="registerSuccess" class="success-msg">{{ registerSuccess }}</p>
              
              <div class="form-actions">
                <button type="submit" class="btn-submit">Créer un compte</button>
              </div>
            </form>
          </TabsContent>
        </TabsRoot>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* Dialog Styles */
.dialog-overlay {
  background-color: rgba(0, 0, 0, 0.5);
  position: fixed;
  inset: 0;
  animation: overlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 50;
}

.dialog-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 10px 38px -10px rgba(22, 23, 24, 0.35);
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 400px;
  max-height: 85vh;
  padding: 25px;
  animation: contentShow 150ms cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 100;
}

.dialog-header {
  margin-bottom: 20px;
}

.dialog-title {
  margin: 0;
  font-weight: 600;
  font-size: 20px;
  color: #111;
}

.dialog-desc {
  margin: 5px 0 0;
  font-size: 14px;
  color: #666;
}

.dialog-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #888;
  border-radius: 50%;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-close:hover {
  background-color: #f5f5f5;
  color: #111;
}

/* Tabs Styles */
.tabs-root {
  display: flex;
  flex-direction: column;
}

.tabs-list {
  display: flex;
  border-bottom: 1px solid #eee;
  margin-bottom: 20px;
}

.tabs-trigger {
  background-color: transparent;
  padding: 10px 20px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  color: #666;
  user-select: none;
  cursor: pointer;
  border: none;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tabs-trigger:hover {
  color: #111;
}

.tabs-trigger[data-state='active'] {
  color: #10b981;
  border-bottom-color: #10b981;
  font-weight: 500;
}

.tabs-content {
  flex-grow: 1;
  outline: none;
}

/* Form Styles */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #444;
}

.form-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
}

.form-actions {
  margin-top: 10px;
}

.btn-primary {
  padding: 10px 20px;
  background-color: #111;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
}

.btn-primary:hover {
  background-color: #000;
}

.btn-submit {
  width: 100%;
  padding: 10px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-submit:hover {
  background-color: #059669;
}

.error-msg {
  color: #ef4444;
  font-size: 13px;
  margin: 0;
  padding: 8px;
  background-color: #fef2f2;
  border-radius: 4px;
  border-left: 3px solid #ef4444;
}

.success-msg {
  color: #059669;
  font-size: 13px;
  margin: 0;
  padding: 8px;
  background-color: #ecfdf5;
  border-radius: 4px;
  border-left: 3px solid #059669;
}

@keyframes overlayShow {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes contentShow {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>