# 🚀 Guide d'Optimisation Performance - DocMaster

## 📊 Diagnostic actuel

### Problèmes identifiés
- ⚠️ App web lente au chargement
- ⚠️ Pas de cache navigateur configuré
- ⚠️ Bundle JavaScript très lourd (1.67MB)
- ⚠️ Images non optimisées
- ⚠️ Requêtes API multiples au chargement

---

## 🎯 OPTIMISATIONS PRIORITAIRES

### 1. ✅ **Cache Navigateur (Headers HTTP)**

#### Backend - Ajouter headers de cache

Fichier : `server/index.ts` (après ligne ~120)

```typescript
// ═════════════════════════════════════════════════════════════════
// CACHE HEADERS - Performance
// ═════════════════════════════════════════════════════════════════

// Cache pour les assets statiques (images, fonts, etc.)
app.use('/uploads', express.static('uploads', {
  maxAge: '1y', // Cache 1 an
  immutable: true,
  setHeaders: (res, path) => {
    // Images
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || 
        path.endsWith('.png') || path.endsWith('.webp') || 
        path.endsWith('.svg')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Documents PDF
    else if (path.endsWith('.pdf')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 jour
    }
  }
}));

// Cache pour les assets du frontend (dist)
app.use(express.static('dist', {
  maxAge: '1h', // Cache 1 heure pour HTML
  setHeaders: (res, path) => {
    // JS/CSS avec hash → cache 1 an
    if (path.match(/\.(js|css)$/) && path.includes('-')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // HTML → pas de cache (toujours frais)
    else if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
    // Fonts
    else if (path.match(/\.(woff2?|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Headers cache pour les réponses API
app.use((req, res, next) => {
  // API endpoints publics → cache court
  if (req.path.startsWith('/api/document-types') || 
      req.path.startsWith('/api/settings')) {
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min
  }
  // API endpoints dynamiques → pas de cache
  else if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
});
```

---

### 2. ✅ **Compression GZIP**

#### Backend - Activer compression

Fichier : `server/index.ts` (après imports)

```typescript
import compression from 'compression';

// Dans createApp(), après CORS :
app.use(compression({
  level: 6, // Niveau de compression (0-9)
  threshold: 1024, // Compresser seulement > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

Installer le package :
```bash
npm install compression
npm install --save-dev @types/compression
```

---

### 3. ✅ **Optimisation Vite Build**

#### Frontend - Améliorer la config Vite

Fichier : `vite.config.js`

```javascript
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  envDir: ".",
  plugins: [tailwindcss()],
  
  build: {
    outDir: "dist",
    emptyOutDir: true,
    
    // Optimisations de build
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Supprimer console.log en production
        drop_debugger: true,
      },
    },
    
    // Code splitting amélioré
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks: {
          // Vendor chunks séparés
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mantine-vendor': ['@mantine/core', '@mantine/hooks'],
          'icons': ['@tabler/icons-react', '@ant-design/icons'],
          'firebase': ['firebase/app', 'firebase/messaging'],
        },
        // Noms de fichiers avec hash pour cache
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Optimisation CSS
    cssCodeSplit: true,
  },
  
  server: {
    port: 3003,
    host: "0.0.0.0",
    open: false,
    allowedHosts: ["docmaster.net", "www.docmaster.net"],
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  
  // Optimisations supplémentaires
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});
```

Installer terser :
```bash
npm install --save-dev terser
```

---

### 4. ✅ **Images optimisées**

#### Convertir images en WebP

```bash
# Installer sharp pour conversion
npm install --save-dev sharp

# Script de conversion (créer convert-images.js)
import sharp from 'sharp';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const convertImages = async (dir) => {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const fullPath = join(dir, file);
    
    if (statSync(fullPath).isDirectory()) {
      await convertImages(fullPath);
      continue;
    }
    
    if (/\.(jpg|jpeg|png)$/i.test(file)) {
      const webpPath = fullPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      
      await sharp(fullPath)
        .webp({ quality: 85 })
        .toFile(webpPath);
      
      console.log(`✅ ${file} → ${webpPath}`);
    }
  }
};

// Convertir les uploads
convertImages('./uploads');
```

Exécuter :
```bash
node convert-images.js
```

---

### 5. ✅ **Lazy Loading des routes**

#### Frontend - Code splitting par routes

Fichier : `src/main.tsx` ou `App.tsx`

```typescript
import { lazy, Suspense } from 'react';

// Lazy load des pages
const Home = lazy(() => import('./pages/public/Home'));
const MesDocuments = lazy(() => import('./pages/auth/MesDocuments'));
const MesGains = lazy(() => import('./pages/auth/MesGains'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Dans le router
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/documents" element={<MesDocuments />} />
    <Route path="/gains" element={<MesGains />} />
    <Route path="/admin/*" element={<AdminDashboard />} />
  </Routes>
</Suspense>
```

---

### 6. ✅ **Optimiser les requêtes API**

#### Backend - Index database

```sql
-- Créer des index sur colonnes fréquemment utilisées
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_declarations_user_id ON declarations(user_id);
CREATE INDEX IF NOT EXISTS idx_declarations_status ON declarations(status);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_provider ON withdrawals(provider);

CREATE INDEX IF NOT EXISTS idx_earnings_history_user_id ON earnings_history(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_history_created_at ON earnings_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
```

Fichier : `server/src/database/schema/69_performance_indexes.sql`

---

### 7. ✅ **Connection Pooling PostgreSQL**

#### Backend - Optimiser le pool

Fichier : `server/src/database/db.ts`

```typescript
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Optimisations pool
  max: 20, // Max connexions
  min: 5, // Min connexions gardées
  idleTimeoutMillis: 30000, // 30s avant fermeture idle
  connectionTimeoutMillis: 10000, // 10s timeout connexion
  
  // Keep-alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});
```

---

### 8. ✅ **Redis pour cache API**

#### Backend - Ajouter Redis cache

```bash
npm install redis
```

Créer : `server/src/services/cache.service.ts`

```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.connect();

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  },
  
  async set(key: string, value: any, ttl: number = 300) {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  },
  
  async del(key: string) {
    await redisClient.del(key);
  },
};

// Middleware cache
export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: any, res: any, next: any) => {
    const key = `cache:${req.originalUrl}`;
    
    const cached = await cache.get(key);
    if (cached) {
      return res.json(cached);
    }
    
    // Intercept res.json
    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      cache.set(key, data, ttl);
      return originalJson(data);
    };
    
    next();
  };
};
```

Utilisation dans routes :
```typescript
import { cacheMiddleware } from '../services/cache.service.js';

// Cache 5 minutes
router.get('/document-types', cacheMiddleware(300), controller.getAll);
router.get('/settings', cacheMiddleware(300), controller.getSettings);
```

---

### 9. ✅ **Service Worker pour PWA**

#### Frontend - Cache offline

Créer : `public/sw.js`

```javascript
const CACHE_NAME = 'docmaster-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/main.js',
  '/assets/main.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

Enregistrer dans `index.html` :
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

---

### 10. ✅ **CDN pour assets statiques**

#### Utiliser Cloudflare CDN

1. Ajouter domain à Cloudflare
2. Activer :
   - Auto Minify (JS, CSS, HTML)
   - Brotli compression
   - HTTP/2
   - Cache Level: Standard
3. Page Rules :
   - `docmaster.net/uploads/*` → Cache Everything, TTL 1 month
   - `docmaster.net/assets/*` → Cache Everything, TTL 1 year

---

## 📊 CHECKLIST D'OPTIMISATION

### Backend
- [ ] Headers cache HTTP configurés
- [ ] Compression GZIP activée
- [ ] Index database créés
- [ ] Pool PostgreSQL optimisé
- [ ] Redis cache installé et configuré
- [ ] Middleware cache sur routes publiques

### Frontend
- [ ] Vite config optimisée (code splitting)
- [ ] Terser minification activée
- [ ] Lazy loading des routes
- [ ] Images converties en WebP
- [ ] Service Worker configuré
- [ ] Console.log supprimés en production

### Infrastructure
- [ ] CDN Cloudflare configuré
- [ ] Compression Brotli activée
- [ ] HTTP/2 activé
- [ ] Cache rules définies

---

## 🎯 RÉSULTATS ATTENDUS

### Avant
- Bundle JS : **1.67 MB**
- First Load : **~5s**
- Time to Interactive : **~7s**
- Lighthouse Score : **~50-60**

### Après
- Bundle JS : **~800 KB** (split en chunks)
- First Load : **~1.5s**
- Time to Interactive : **~2.5s**
- Lighthouse Score : **~85-95**

---

## 🚀 DÉPLOIEMENT

```bash
# 1. Installer dépendances
npm install compression terser --save-dev

# 2. Rebuild avec optimisations
npm run build

# 3. Créer index database
psql -U docmaster_user -d docmaster -f server/src/database/schema/69_performance_indexes.sql

# 4. Redémarrer server
pm2 restart docmaster-api

# 5. Tester
# Vérifier headers cache :
curl -I https://docmaster.net/assets/main.js

# Vérifier compression :
curl -H "Accept-Encoding: gzip" -I https://docmaster.net/api/settings
```

---

## 📈 MONITORING

### Outils recommandés
- **Lighthouse** (Chrome DevTools) - Score performance
- **WebPageTest** - Analyse détaillée
- **GTmetrix** - Performance globale
- **pm2 monit** - Monitoring serveur Node.js

### Commandes utiles
```bash
# Logs serveur
pm2 logs docmaster-api

# Monitoring temps réel
pm2 monit

# Stats PostgreSQL
psql -U docmaster_user -d docmaster -c "
  SELECT schemaname, tablename, 
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables 
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
"
```

---

**Priorité** : Commencer par 1-4 (cache + compression + build) = **gain immédiat ~60%**  
**Temps estimé** : 2-3 heures d'implémentation  
**Impact** : Performance x2-3
