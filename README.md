# 404 Bavarde

Système de surveillance et d'enregistrement automatique des erreurs 404 avec notifications par email. Lorsqu'un visiteur accède à une page inexistante, le système collecte des informations de diagnostic et envoie un email détaillé.

## 🎯 Objectif

Capturer et analyser les accès aux pages 404 sur **scriptor.pro** pour :
- Identifier les URLs cassées ou mal référencées
- Détecter les patterns d'erreur récurrents
- Améliorer la navigation du site
- Monitorer la qualité de l'expérience utilisateur

## 🏗️ Architecture

```
┌─────────────────────┐
│   Page 404 (HTML)   │  Collecte les données du navigateur
└──────────┬──────────┘
           │
           │ fetch("/api/404-log", {POST})
           │
      ┌────▼──────────────────┐
      │  Endpoint Serverless  │  Récupère l'IP, enrichit les données
      │ api/404-log.js        │
      └────┬─────────┬────────┘
           │         │
      ┌────▼──┐  ┌───▼────────────┐
      │ Redis │  │  Resend API    │  Envoie l'email
      │(Rate  │  │ (api.resend)   │
      │ limit)│  └────────────────┘
      └───────┘
```

## 📁 Structure du projet

```
404-bavarde/
├── 404.html                      # Page 404 statique avec script client
├── api/
│   └── 404-log.js               # Endpoint serverless (Vercel)
├── package.json                  # Dépendances (Redis client)
├── .env.local                    # Variables d'environnement (local)
├── .gitignore                    # Fichiers à ignorer
└── README.md                     # Ce fichier
```

## 🛠️ Technologies

- **Frontend** : HTML, vanilla JavaScript
- **Backend** : Node.js serverless (Vercel)
- **Email** : Resend API
- **Rate limiting** : Upstash Redis
- **Hosting** : Vercel

## 📋 Données collectées

Le système recueille les informations suivantes :

### Côté navigateur
- **URL** : la page 404 accédée
- **Referrer** : page source du visiteur
- **User-Agent** : navigateur et OS
- **Résolution d'écran** : width, height, colorDepth
- **Langue** : préférence du navigateur
- **Fuseau horaire** : timezone détectée
- **Ressources** : deviceMemory, hardwareConcurrency
- **Connexion** : effectiveType, downlink, RTT (si disponible)
- **Préférences** : doNotTrack, cookieEnabled
- **Timestamp** : heure précise de l'erreur

### Côté serveur
- **IP** : adresse IP du visiteur (extraite des headers)
- **Referer** : header de referer (confirmé côté serveur)
- **User-Agent** : header user-agent (confirmé côté serveur)

## 🚀 Installation & Setup

### 1. Cloner et installer les dépendances

```bash
git clone https://github.com/scriptor-pro/effective-404.git
cd 404-bavarde
npm install
```

### 2. Configurer Resend

1. Créer un compte sur [Resend.com](https://resend.com)
2. Vérifier le domaine `scriptor.pro`
3. Générer une clé API
4. Ajouter à Vercel → Project Settings → Environment Variables :
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

### 3. Configurer Upstash Redis

1. Créer un compte sur [Upstash](https://upstash.com)
2. Créer une base de données Redis
3. Copier les credentials dans Vercel → Project Settings → Environment Variables :
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxx
   ```

### 4. Variables d'environnement (local)

Créer un fichier `.env.local` :

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxx
```

### 5. Déployer sur Vercel

```bash
vercel deploy
```

## 📧 Format des emails

L'email envoyé contient :
- **Objet** : `404 sur scriptor.pro - /page-inexistante`
- **Corps** :
  - Résumé : URL, Referer, IP, User-Agent
  - Payload JSON complet avec tous les détails

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
404 detectée

URL: https://scriptor.pro/old-page
Referer: https://google.com
IP: 192.168.1.1
UA: Mozilla/5.0...

{
  "url": "https://scriptor.pro/old-page",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  ...
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🔒 Rate limiting

Le système limite l'envoi d'emails à **1 par IP par 5 minutes** pour éviter :
- Les spam bots
- Les attaques par rejeu
- La saturation de mailbox

**Implémentation** : Upstash Redis
```javascript
const key = `rl:404:${ip}`;
const last = await redis.get(key);
if (last && now - last < 5 * 60 * 1000) {
  return; // Skip
}
```

## 🔐 Conformité RGPD

**Bases légales**
- Intérêt légitime : monitoring des erreurs et amélioration du site

**Mesures**
- ✅ Déclaration dans la politique de confidentialité
- ✅ Minimisation des données (limiter à ce qui est strictement utile)
- ✅ Retention limitée (90 jours max)
- ✅ Possibilité de masquage IP (optionnel)
- ✅ Droit d'opposition documenté

## 📊 Monitoring & Observabilité

Le système enregistre :
- Les timestamps de chaque 404
- L'IP du visiteur (pour debug)
- Les patterns récurrents
- Les pics de trafic anormal

**À implémenter** (optionnel)
- Alertes si > 20 erreurs/min
- Tableau de bord de tendances
- Export logs pour analyse BI

## 🧪 Tests

### Test local

1. Accéder à une URL inexistante :
   ```
   http://localhost:3000/nonexistent
   ```

2. Vérifier que le POST arrive à `/api/404-log`

3. Confirmer la réception de l'email

### Vérifier l'IP

L'endpoint doit extraire correctement l'IP depuis les headers :
```javascript
const ip = req.headers["x-vercel-forwarded-for"] ||
           req.headers["x-forwarded-for"] ||
           req.socket?.remoteAddress;
```

## 🔧 Troubleshooting

| Problème | Solution |
|----------|----------|
| Pas d'email reçu | Vérifier `RESEND_API_KEY` dans Vercel env vars |
| Domaine non vérifié | Confirmer le domaine dans Resend dashboard |
| IP manquante | Vérifier les headers X-Forwarded-For |
| Rate limit trop strict | Ajuster le délai (5 min) dans `api/404-log.js:23` |
| Redis timeout | Vérifier les credentials Upstash |

## 📄 Fichiers clés

### `404.html`
Page 404 statique avec :
- Design moderne (gradient, grain, grid)
- Animation d'entrée (rise animation)
- Script d'envoi des données
- Responsive design

### `api/404-log.js`
Endpoint serverless qui :
1. Valide la méthode POST
2. Extrait l'IP du visiteur
3. Applique le rate limiting Redis
4. Enrichit le payload
5. Envoie l'email via Resend
6. Retourne 204 No Content

## 🌍 Domaine cible

- **Domain** : scriptor.pro
- **Email destinataire** : bvh@somebaudy.com
- **Adresse d'envoi** : 404@scriptor.pro (doit être vérifiée dans Resend)

## 📝 Changelog

- **v1.0.0** (5 fév 2025)
  - ✅ Page 404 statique
  - ✅ Endpoint API avec Resend
  - ✅ Rate limiting avec Upstash Redis
  - ✅ Collecte complète de diagnostics

## 🤝 Contribution

Les issues et PRs sont bienvenues ! Consultez le [repo GitHub](https://github.com/scriptor-pro/effective-404).

## 📄 Licence

ISC - Voir le fichier LICENSE pour les détails.

## 📮 Support

En cas de problème :
- Consulter les logs Vercel
- Vérifier les variables d'environnement
- Tester l'endpoint `/api/404-log` avec curl

---

**Créé pour** : Monitoring des erreurs 404 sur scriptor.pro
**Dernière mise à jour** : 23 mars 2026
