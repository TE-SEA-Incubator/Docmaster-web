---
name: nuxt-vue-patterns
description: Patterns, conventions et bonnes pratiques pour les projets Nuxt 3 et Vue 3. Utilise ce skill dès que l'utilisateur travaille sur un projet Nuxt ou Vue — composables, stores Pinia, middleware, layouts, pages, composants, appels API, gestion d'état, typage TypeScript, SSR/SSG, plugins, utils, ou toute question d'architecture Nuxt/Vue. Déclenche aussi pour des questions sur useFetch, useAsyncData, definePageMeta, navigateTo, storeToRefs, defineStore, watch, computed, ou toute autre API Vue/Nuxt. Ne pas attendre que l'utilisateur dise explicitement "Nuxt" — si le code contient des patterns Vue 3 Composition API, déclencher ce skill.
---

# Nuxt 3 & Vue 3 — Patterns & Conventions

Guide de référence pour produire du code Nuxt 3 / Vue 3 propre, idiomatique et maintenable.

---

## Structure de projet standard

```
├── assets/          # CSS globaux, images non-publiques
├── components/      # Composants auto-importés
│   ├── ui/          # Composants génériques (Button, Input, Modal...)
│   └── [Feature]/   # Composants métier groupés par feature
├── composables/     # useXxx() — logique réutilisable
├── constants/       # Constantes globales (plans, enums, config...)
├── layouts/         # Layouts de page (default, admin, auth...)
├── middleware/       # Guards de navigation
├── pages/           # Routing automatique
├── plugins/         # Plugins Nuxt (axios, toast, directives...)
├── stores/          # Stores Pinia
├── types/           # Types et interfaces TypeScript
├── utils/           # Fonctions pures utilitaires
└── server/          # API routes, middleware serveur
    └── api/
```

**Règles de nommage :**
- Composants : `PascalCase.vue` (ex: `UserCard.vue`)
- Composables : `useXxx.ts` (ex: `useAuth.ts`)
- Stores : `useXxxStore.ts` (ex: `useUserStore.ts`)
- Pages : `kebab-case.vue` (ex: `user-profile.vue`)
- Types/Interfaces : `PascalCase` avec préfixe `I` pour les interfaces optionnel

---

## Vue 3 — Composition API

### `<script setup>` — toujours

```vue
<script setup lang="ts">
// Toujours utiliser <script setup lang="ts">
// Jamais Options API sur du nouveau code
</script>
```

### defineProps & defineEmits typés

```typescript
// ✅ Correct — typage inline
const props = defineProps<{
  user: User
  loading?: boolean
  variant?: 'primary' | 'ghost'
}>()

// ✅ Avec valeurs par défaut
const props = withDefaults(defineProps<{
  loading?: boolean
  variant?: 'primary' | 'ghost'
}>(), {
  loading: false,
  variant: 'primary'
})

// ✅ Emits typés
const emit = defineEmits<{
  submit: [user: User]
  cancel: []
  'update:modelValue': [value: string]
}>()
```

### ref vs reactive

```typescript
// ref() — pour les primitives et les valeurs simples
const count = ref(0)
const name = ref('')
const user = ref<User | null>(null)

// reactive() — pour les objets complexes avec logique interne
// ⚠️ Attention : reactive() perd la réactivité si destructuré
const form = reactive({
  email: '',
  password: '',
  remember: false
})

// ✅ Pour destructurer un reactive, utiliser toRefs()
const { email, password } = toRefs(form)
```

### computed

```typescript
// ✅ Toujours typer les computed complexes
const fullName = computed<string>(() => 
  `${props.user.firstName} ${props.user.lastName}`
)

// ✅ Computed writable
const modelValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
```

### watch & watchEffect

```typescript
// watch — réagir à une source précise
watch(
  () => props.userId,
  async (newId, oldId) => {
    if (newId !== oldId) await fetchUser(newId)
  },
  { immediate: true }
)

// watch multiple sources
watch([count, name], ([newCount, newName]) => {
  console.log(newCount, newName)
})

// watchEffect — réagir à toutes les dépendances utilisées
watchEffect(() => {
  document.title = `${route.name} — ${appName.value}`
})
```

---

## Composables

### Pattern standard

```typescript
// composables/useUsers.ts
export function useUsers() {
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<User[]>('/api/users')
      users.value = data
    } catch (e: any) {
      error.value = e.message ?? 'Erreur inconnue'
    } finally {
      loading.value = false
    }
  }

  return {
    users: readonly(users),  // exposer en readonly quand possible
    loading: readonly(loading),
    error: readonly(error),
    fetchUsers
  }
}
```

### Règles composables
- Un composable = une responsabilité
- Toujours préfixer par `use`
- Retourner `readonly()` pour les états qu'on ne veut pas muter de l'extérieur
- Nettoyer les side effects avec `onUnmounted` si nécessaire
- Ne pas appeler de composable conditionnellement (règles des hooks)

---

## Pinia — Stores

### Pattern standard avec `defineStore`

```typescript
// stores/useUserStore.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  // Getters (computed)
  const isAuthenticated = computed(() => !!token.value)
  const fullName = computed(() => 
    user.value ? `${user.value.firstName} ${user.value.lastName}` : ''
  )

  // Actions
  async function login(credentials: LoginCredentials) {
    const data = await $fetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: credentials
    })
    user.value = data.user
    token.value = data.token
  }

  function logout() {
    user.value = null
    token.value = null
    navigateTo('/login')
  }

  return {
    user,
    token,
    isAuthenticated,
    fullName,
    login,
    logout
  }
})
```

### Utilisation dans un composant

```typescript
// ✅ storeToRefs pour destructurer les state/getters réactifs
const userStore = useUserStore()
const { user, isAuthenticated, fullName } = storeToRefs(userStore)

// Les actions se destructurent directement (pas besoin de storeToRefs)
const { login, logout } = userStore
```

### Persistance (plugin pinia-plugin-persistedstate)

```typescript
export const useAuthStore = defineStore('auth', () => {
  // ...
}, {
  persist: {
    storage: persistedState.cookiesWithOptions({ sameSite: 'strict' }),
    paths: ['token']  // persister uniquement le token
  }
})
```

---

## Nuxt 3 — Data Fetching

### useFetch vs useAsyncData vs $fetch

```typescript
// useFetch — dans les composants/pages, SSR-friendly, auto-refresh
const { data, pending, error, refresh } = await useFetch<User[]>('/api/users', {
  query: { page: currentPage },
  watch: [currentPage]  // re-fetch quand currentPage change
})

// useAsyncData — quand on a besoin de plus de contrôle
const { data: users } = await useAsyncData('users', () =>
  $fetch<User[]>('/api/users')
)

// $fetch — dans les actions de stores, event handlers, pas dans setup()
async function createUser(payload: CreateUserPayload) {
  return await $fetch('/api/users', {
    method: 'POST',
    body: payload
  })
}
```

### Règles data fetching
- `useFetch` / `useAsyncData` → dans `<script setup>` des pages/composants
- `$fetch` → dans les stores, composables d'action, event handlers
- Toujours typer le générique : `useFetch<ResponseType>()`
- Utiliser `lazy: true` pour les données non-critiques au SSR

```typescript
// Lazy fetch — ne bloque pas le rendu SSR
const { data, pending } = useFetch('/api/recommendations', { lazy: true })
```

---

## Pages & definePageMeta

```typescript
// pages/admin/settings.vue
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],  // middlewares en tableau
  title: 'Paramètres',           // meta custom accessible via route.meta
})
```

### Navigation

```typescript
// Programmatique
await navigateTo('/dashboard')
await navigateTo({ name: 'user-id', params: { id: '123' } })

// Redirect externe
await navigateTo('https://example.com', { external: true })

// Redirect dans un middleware
return navigateTo('/login')
```

---

## Middleware

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { isAuthenticated } = storeToRefs(useAuthStore())
  
  if (!isAuthenticated.value) {
    return navigateTo(`/login?redirect=${to.fullPath}`)
  }
})

// middleware/admin.ts
export default defineNuxtRouteMiddleware(() => {
  const { user } = storeToRefs(useAuthStore())
  
  if (user.value?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Accès refusé' })
  }
})
```

---

## Server API Routes

```typescript
// server/api/users/index.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { page = 1, limit = 20 } = query

  // Valider avec zod si besoin
  const users = await UserService.paginate({ page: +page, limit: +limit })
  return users
})

// server/api/users/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // Toujours valider le body
  const user = await UserService.create(body)
  
  setResponseStatus(event, 201)
  return user
})

// server/api/users/[id].get.ts — route dynamique
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const user = await UserService.findById(id!)
  
  if (!user) throw createError({ statusCode: 404, message: 'Utilisateur non trouvé' })
  return user
})
```

---

## Gestion d'erreurs

```typescript
// Dans un composant — erreur affichable
const { data, error } = await useFetch('/api/users')
// Utiliser error.value?.message dans le template

// Erreur fatale — page d'erreur Nuxt
throw createError({
  statusCode: 404,
  statusMessage: 'Page not found',
  fatal: true
})

// Dans server/api — erreur HTTP
throw createError({ statusCode: 422, message: 'Données invalides' })

// useError / clearError
const error = useError()
clearError({ redirect: '/' })
```

---

## TypeScript — Conventions

```typescript
// types/index.ts — regrouper les types métier
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'host' | 'guest'
  createdAt: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  meta?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  lastPage: number
}

// Éviter les `any` — utiliser `unknown` et type guards
function isUser(val: unknown): val is User {
  return typeof val === 'object' && val !== null && 'email' in val
}
```

---

## Patterns à éviter

| ❌ Éviter | ✅ Préférer |
|-----------|------------|
| Options API sur nouveau code | Composition API + `<script setup>` |
| `this.$store` | `useXxxStore()` Pinia |
| `this.$router.push()` | `navigateTo()` |
| `axios` directement | `$fetch` / `useFetch` |
| Mutater les props | `emit('update:prop', val)` |
| `any` TypeScript | Types stricts ou `unknown` |
| Logique dans les templates | Computed ou méthodes |
| Stores monolithiques | Stores par domaine métier |
| `reactive()` pour tout | `ref()` par défaut, `reactive()` pour formulaires |
| `document.xxx` dans setup | `onMounted()` ou composables client-only |

---

## Checklist composant

- [ ] `<script setup lang="ts">` en premier
- [ ] Props typées avec `defineProps<{}>()`
- [ ] Emits typés avec `defineEmits<{}>()`
- [ ] Pas de logique métier dans le template
- [ ] `storeToRefs()` pour destructurer les stores
- [ ] Nettoyage des listeners dans `onUnmounted()`
- [ ] Pas d'appel `$fetch` direct dans `setup()` — utiliser `useFetch`
- [ ] `definePageMeta()` sur toutes les pages (layout + middleware)