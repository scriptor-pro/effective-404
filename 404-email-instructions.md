# Page 404 avec email automatique (Resend)

Objectif: lorsqu'un visiteur tombe sur la page 404, envoyer un email detaille a une adresse definie. La page est statique, donc l'envoi d'email passe par un petit endpoint serveur (serverless ou backend) qui recoit les donnees et appelle l'API Resend.

## Donnees collectees

- URL 404 (page actuelle)
- Referer (page precedente si disponible)
- User-Agent
- OS / plateforme (derivee du user-agent ou navigator.platform)
- IP (uniquement cote serveur)
- Taille ecran (width/height), colorDepth
- Langue du navigateur
- Fuseau horaire
- deviceMemory, hardwareConcurrency (si disponible)
- connection (downlink, effectiveType) si disponible
- doNotTrack, cookieEnabled

Limites: le navigateur ne donne pas l'IP directement. L'IP doit etre recuperee par l'endpoint serveur via les headers (ex: `x-forwarded-for`, `cf-connecting-ip`). Certaines infos ne sont pas disponibles selon le navigateur.

## Etape 1 - Creer la page 404 statique

Dans votre fichier `404.html`, ajoutez un script qui envoie les donnees a un endpoint `/api/404-log`.

```html
<script>
  (function () {
    var payload = {
      url: window.location.href,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent,
      platform: navigator.platform || null,
      language: navigator.language || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
      },
      deviceMemory: navigator.deviceMemory || null,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      connection:
        (navigator.connection && {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
        }) ||
        null,
      doNotTrack: navigator.doNotTrack || null,
      cookieEnabled: navigator.cookieEnabled,
      occurredAt: new Date().toISOString(),
    };

    fetch("/api/404-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(function () {
      // pas de retry sur la page 404
    });
  })();
</script>
```

La page 404 et l'endpoint etant sur le meme domaine, aucun CORS n'est necessaire.

### Exemple complet de page 404 (HTML/CSS/JS)

Creer `404.html`:

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>404 - Scriptor</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #f6f2ea;
        --bg-2: #efe9df;
        --ink: #1f1f24;
        --muted: #5b5f6b;
        --accent: #002fa7;
        --card: #ffffff;
        --shadow: rgba(0, 0, 0, 0.12);
      }
      * {
        box-sizing: border-box;
      }
      html,
      body {
        height: 100%;
      }
      body {
        margin: 0;
        color: var(--ink);
        background:
          radial-gradient(1200px 600px at 0% -10%, #dfe6f7 0%, transparent 60%),
          radial-gradient(900px 900px at 100% 10%, #f0e6d6 0%, transparent 55%),
          linear-gradient(135deg, var(--bg), var(--bg-2));
        font-family:
          "Inter",
          system-ui,
          -apple-system,
          sans-serif;
        display: grid;
        place-items: center;
        padding: 32px 20px;
      }
      .frame {
        max-width: 920px;
        width: 100%;
        background: linear-gradient(
          145deg,
          rgba(255, 255, 255, 0.8),
          rgba(255, 255, 255, 0.65)
        );
        border: 1px solid rgba(31, 31, 36, 0.08);
        border-radius: 20px;
        padding: 40px;
        box-shadow: 0 30px 80px var(--shadow);
        position: relative;
        overflow: hidden;
      }
      .grain {
        position: absolute;
        inset: 0;
        opacity: 0.08;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
        pointer-events: none;
        mix-blend-mode: soft-light;
      }
      .grid {
        position: absolute;
        inset: -80px;
        background:
          repeating-linear-gradient(
            90deg,
            rgba(31, 31, 36, 0.06) 0,
            rgba(31, 31, 36, 0.06) 1px,
            transparent 1px,
            transparent 60px
          ),
          repeating-linear-gradient(
            0deg,
            rgba(31, 31, 36, 0.06) 0,
            rgba(31, 31, 36, 0.06) 1px,
            transparent 1px,
            transparent 60px
          );
        opacity: 0.12;
        pointer-events: none;
      }
      .content {
        position: relative;
        display: grid;
        gap: 18px;
      }
      .eyebrow {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        color: var(--muted);
      }
      .headline {
        font-size: clamp(36px, 7vw, 72px);
        line-height: 1.05;
        margin: 0;
      }
      .headline span {
        color: var(--accent);
      }
      .desc {
        font-size: clamp(18px, 2.3vw, 22px);
        color: var(--muted);
        max-width: 60ch;
        margin: 0;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 10px;
      }
      .btn {
        padding: 12px 18px;
        border-radius: 12px;
        border: 1px solid rgba(31, 31, 36, 0.15);
        background: #ffffff;
        color: var(--ink);
        text-decoration: none;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition:
          transform 0.2s ease,
          border-color 0.2s ease,
          background 0.2s ease;
      }
      .btn:hover {
        transform: translateY(-2px);
        border-color: rgba(31, 31, 36, 0.3);
        background: #f4f6fb;
      }
      .btn.alt {
        background: transparent;
      }
      .meta {
        margin-top: 18px;
        font-size: 12px;
        color: var(--muted);
      }
      .meta code {
        color: var(--ink);
        background: rgba(31, 31, 36, 0.08);
        padding: 2px 6px;
        border-radius: 6px;
      }
      .reveal {
        opacity: 0;
        transform: translateY(12px);
        animation: rise 0.7s ease forwards;
      }
      .reveal:nth-child(2) {
        animation-delay: 0.05s;
      }
      .reveal:nth-child(3) {
        animation-delay: 0.1s;
      }
      .reveal:nth-child(4) {
        animation-delay: 0.15s;
      }
      .reveal:nth-child(5) {
        animation-delay: 0.2s;
      }
      @keyframes rise {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @media (max-width: 640px) {
        .frame {
          padding: 28px 22px;
        }
        .actions {
          flex-direction: column;
          align-items: stretch;
        }
      }
    </style>
  </head>
  <body>
    <main class="frame">
      <div class="grid"></div>
      <div class="grain"></div>
      <div class="content">
        <div class="eyebrow reveal">Scriptor.pro</div>
        <h1 class="headline reveal">404<span>.</span> Page introuvable</h1>
        <p class="desc reveal">
          Cette page n'existe pas ou a ete deplacee. L'incident a ete enregistre
          pour correction.
        </p>
        <div class="actions reveal">
          <a class="btn" href="/">Retour a l'accueil</a>
          <a class="btn alt" href="/contact">Signaler un lien</a>
        </div>
        <div class="meta reveal">
          Erreur: <code>404</code> • <code id="path"></code>
        </div>
      </div>
    </main>

    <script>
      document.getElementById("path").textContent = window.location.pathname;

      (function () {
        var payload = {
          url: window.location.href,
          referrer: document.referrer || null,
          userAgent: navigator.userAgent,
          platform: navigator.platform || null,
          language: navigator.language || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
          screen: {
            width: window.screen.width,
            height: window.screen.height,
            colorDepth: window.screen.colorDepth,
          },
          deviceMemory: navigator.deviceMemory || null,
          hardwareConcurrency: navigator.hardwareConcurrency || null,
          connection:
            (navigator.connection && {
              effectiveType: navigator.connection.effectiveType,
              downlink: navigator.connection.downlink,
              rtt: navigator.connection.rtt,
            }) ||
            null,
          doNotTrack: navigator.doNotTrack || null,
          cookieEnabled: navigator.cookieEnabled,
          occurredAt: new Date().toISOString(),
        };

        fetch("/api/404-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(function () {
          // pas de retry sur la page 404
        });
      })();
    </script>
  </body>
</html>
```

## Etape 2 - Creer un endpoint Vercel

La page etant statique, il faut un endpoint serverless pour:

1. recuperer l'IP et les headers
2. enrichir le payload
3. appeler Resend

### Exemple Vercel (Pages Router, Node serverless)

Creer un fichier `api/404-log.js` a la racine du projet:

```js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const ipHeader =
    req.headers["x-vercel-forwarded-for"] ||
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "";
  const ip = Array.isArray(ipHeader)
    ? ipHeader[0]
    : String(ipHeader).split(",")[0].trim();

  const payload = {
    ...req.body,
    ip,
    requestHeaders: {
      referer: req.headers["referer"] || null,
      userAgent: req.headers["user-agent"] || null,
    },
  };

  const subject = `404 sur scriptor.pro - ${payload.url || ""}`;
  const text = JSON.stringify(payload, null, 2);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 12px;">404 detectee</h2>
      <p style="margin:0 0 12px;"><strong>URL:</strong> ${payload.url || ""}</p>
      <p style="margin:0 0 12px;"><strong>Referer:</strong> ${payload.referrer || ""}</p>
      <p style="margin:0 0 12px;"><strong>IP:</strong> ${payload.ip || ""}</p>
      <p style="margin:0 0 12px;"><strong>User-Agent:</strong> ${payload.requestHeaders?.userAgent || ""}</p>
      <pre style="background:#f7f7f7; padding:12px; border-radius:8px; overflow:auto;">${text}</pre>
    </div>
  `;
  const htmlCompact = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 8px;">404</h2>
      <p style="margin:0;"><strong>URL:</strong> ${payload.url || ""}</p>
      <p style="margin:0;"><strong>Referer:</strong> ${payload.referrer || ""}</p>
      <p style="margin:0;"><strong>IP:</strong> ${payload.ip || ""}</p>
      <p style="margin:0;"><strong>UA:</strong> ${payload.requestHeaders?.userAgent || ""}</p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "404 <404@scriptor.pro>",
      to: ["bvh@somebaudy.com"],
      subject,
      text,
      html,
    }),
  });

  res.status(204).end();
}
```

Notes:

- Remplacez `from` par une adresse verifiee dans Resend (domaine valide).
- Ajoutez `RESEND_API_KEY` dans Vercel: Project Settings -> Environment Variables.
- Gardez l'endpoint prive a votre domaine.
- Pour un email compact, remplacez `html` par `htmlCompact` dans le body Resend.

### Version TypeScript (Pages Router, Node serverless)

Creer `api/404-log.ts` (choisir cette variante OU la variante Edge ci-dessous):

```ts
import type { NextApiRequest, NextApiResponse } from "next";

type Payload = Record<string, unknown> & { url?: string | null };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const ipHeader =
    req.headers["x-vercel-forwarded-for"] ||
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "";
  const ip = Array.isArray(ipHeader)
    ? ipHeader[0]
    : String(ipHeader).split(",")[0].trim();

  const body = (req.body || {}) as Payload;

  const payload: Payload & {
    ip: string;
    requestHeaders: { referer: string | null; userAgent: string | null };
  } = {
    ...body,
    ip,
    requestHeaders: {
      referer: (req.headers["referer"] as string) || null,
      userAgent: (req.headers["user-agent"] as string) || null,
    },
  };

  const subject = `404 sur scriptor.pro - ${payload.url || ""}`;
  const text = JSON.stringify(payload, null, 2);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 12px;">404 detectee</h2>
      <p style="margin:0 0 12px;"><strong>URL:</strong> ${payload.url || ""}</p>
      <p style="margin:0 0 12px;"><strong>Referer:</strong> ${payload.referrer || ""}</p>
      <p style="margin:0 0 12px;"><strong>IP:</strong> ${payload.ip || ""}</p>
      <p style="margin:0 0 12px;"><strong>User-Agent:</strong> ${payload.requestHeaders?.userAgent || ""}</p>
      <pre style="background:#f7f7f7; padding:12px; border-radius:8px; overflow:auto;">${text}</pre>
    </div>
  `;
  const htmlCompact = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 8px;">404</h2>
      <p style="margin:0;"><strong>URL:</strong> ${payload.url || ""}</p>
      <p style="margin:0;"><strong>Referer:</strong> ${payload.referrer || ""}</p>
      <p style="margin:0;"><strong>IP:</strong> ${payload.ip || ""}</p>
      <p style="margin:0;"><strong>UA:</strong> ${payload.requestHeaders?.userAgent || ""}</p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "404 <404@scriptor.pro>",
      to: ["bvh@somebaudy.com"],
      subject,
      text,
      html,
    }),
  });

  res.status(204).end();
}
```

### Variante Edge Function (Pages Router)

Si vous voulez plus de latence reduite, utilisez le runtime edge.
Creer `api/404-log.js` avec:

```js
export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const body = await req.json();

  const ipHeader =
    req.headers.get("x-vercel-forwarded-for") ||
    req.headers.get("x-forwarded-for") ||
    "";
  const ip = ipHeader.split(",")[0].trim();

  const payload = {
    ...body,
    ip,
    requestHeaders: {
      referer: req.headers.get("referer"),
      userAgent: req.headers.get("user-agent"),
    },
  };

  const subject = `404 sur scriptor.pro - ${payload.url || ""}`;
  const text = JSON.stringify(payload, null, 2);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 12px;">404 detectee</h2>
      <p style="margin:0 0 12px;"><strong>URL:</strong> ${payload.url || ""}</p>
      <p style="margin:0 0 12px;"><strong>Referer:</strong> ${payload.referrer || ""}</p>
      <p style="margin:0 0 12px;"><strong>IP:</strong> ${payload.ip || ""}</p>
      <p style="margin:0 0 12px;"><strong>User-Agent:</strong> ${payload.requestHeaders?.userAgent || ""}</p>
      <pre style="background:#f7f7f7; padding:12px; border-radius:8px; overflow:auto;">${text}</pre>
    </div>
  `;
  const htmlCompact = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 8px;">404</h2>
      <p style="margin:0;"><strong>URL:</strong> ${payload.url || ""}</p>
      <p style="margin:0;"><strong>Referer:</strong> ${payload.referrer || ""}</p>
      <p style="margin:0;"><strong>IP:</strong> ${payload.ip || ""}</p>
      <p style="margin:0;"><strong>UA:</strong> ${payload.requestHeaders?.userAgent || ""}</p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "404 <404@scriptor.pro>",
      to: ["bvh@somebaudy.com"],
      subject,
      text,
      html,
    }),
  });

  return new Response(null, { status: 204 });
}
```

### Mini rate-limit (optionnel) avec Upstash Redis

Objectif: limiter a 1 email / IP / 5 minutes.

1. Installer Upstash Redis:

```bash
npm install @upstash/redis
```

2. Ajouter les variables Redis dans Vercel (Project Settings -> Environment Variables):

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

3. Ajouter ce bloc avant l'appel a Resend:

#### Node serverless (Pages Router)

```ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const key = `rl:404:${ip}`;
const now = Date.now();
const last = await redis.get<number>(key);
if (last && now - last < 5 * 60 * 1000) {
  res.status(204).end();
  return;
}
await redis.set(key, now, { ex: 5 * 60 });
```

#### Edge Function (Pages Router)

```ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const key = `rl:404:${ip}`;
const now = Date.now();
const last = await redis.get<number>(key);
if (last && now - last < 5 * 60 * 1000) {
  return new Response(null, { status: 204 });
}
await redis.set(key, now, { ex: 5 * 60 });
```

Notes:

- L'in-memory rate-limit (Map) n'est pas fiable en serverless (instances multiples).
- Upstash via Vercel Marketplace est la voie recommandee.

### Version TypeScript (Edge Function)

Creer `api/404-log.ts` (choisir cette variante OU la variante Node serverless):

```ts
export const config = {
  runtime: "edge",
};

type Payload = Record<string, unknown> & { url?: string | null };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  let body: Payload = {};
  try {
    body = (await req.json()) as Payload;
  } catch {
    body = {};
  }

  const ipHeader =
    req.headers.get("x-vercel-forwarded-for") ||
    req.headers.get("x-forwarded-for") ||
    "";
  const ip = ipHeader.split(",")[0].trim();

  const payload = {
    ...body,
    ip,
    requestHeaders: {
      referer: req.headers.get("referer"),
      userAgent: req.headers.get("user-agent"),
    },
  };

  const subject = `404 sur scriptor.pro - ${payload.url || ""}`;
  const text = JSON.stringify(payload, null, 2);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 12px;">404 detectee</h2>
      <p style="margin:0 0 12px;"><strong>URL:</strong> ${payload.url || ""}</p>
      <p style="margin:0 0 12px;"><strong>Referer:</strong> ${payload.referrer || ""}</p>
      <p style="margin:0 0 12px;"><strong>IP:</strong> ${payload.ip || ""}</p>
      <p style="margin:0 0 12px;"><strong>User-Agent:</strong> ${payload.requestHeaders?.userAgent || ""}</p>
      <pre style="background:#f7f7f7; padding:12px; border-radius:8px; overflow:auto;">${text}</pre>
    </div>
  `;
  const htmlCompact = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 8px;">404</h2>
      <p style="margin:0;"><strong>URL:</strong> ${payload.url || ""}</p>
      <p style="margin:0;"><strong>Referer:</strong> ${payload.referrer || ""}</p>
      <p style="margin:0;"><strong>IP:</strong> ${payload.ip || ""}</p>
      <p style="margin:0;"><strong>UA:</strong> ${payload.requestHeaders?.userAgent || ""}</p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "404 <404@scriptor.pro>",
      to: ["bvh@somebaudy.com"],
      subject,
      text,
      html,
    }),
  });

  return new Response(null, { status: 204 });
}
```

## Etape 3 - Configurer Resend

1. Creez un compte Resend.
2. Verifiez le domaine `scriptor.pro`.
3. Creez une cle API et stockez-la en variable d'environnement `RESEND_API_KEY`.
4. Testez un envoi manuel avant de brancher la page 404.

## Etape 4 - RGPD / conformite

- Base legale: documentez l'interet legitime (monitoring d'erreurs et amelioration du site).
- Transparence: mentionnez la collecte dans la politique de confidentialite.
- Minimisation: meme si vous collectez "tout ce qui est possible", limitez l'usage aux besoins de diagnostic.
- Retention: fixez une duree (ex: 30/90 jours) et supprimez regulierement.
- IP: si possible, proposez un masquage (ex: /24) ou hash, sauf besoin justifie.
- Droit d'opposition: indiquez un contact.

## Etape 5 - Tests

- Forcer une URL inexistante pour verifier la reception de l'email.
- Verifier que l'IP apparait bien depuis l'endpoint serveur.
- Verifier que la page 404 reste rapide (l'envoi est asynchrone).

## Etape 6 - Observabilite (optionnel)

- Logs: loggez une ligne par 404 (timestamp, ip, url) pour diagnostiquer les anomalies.
- Monitoring: ajoutez un compteur (ex: KV ou un outil externe) pour suivre le volume de 404.
- Alertes: declenchez une alerte si un pic de 404 apparait (ex: 20/min).
- Retention: supprimez les logs au bout de 30/90 jours.

## Etape 7 - Securite (optionnel)

Pour eviter les appels frauduleux sur `/api/404-log`, vous pouvez signer le payload cote client et verifier la signature cote serveur.

### Principe

- Cote client: generer `signature = HMAC_SHA256(payload, SECRET)`
- Cote serveur: recalculer et comparer

### Exemple (client)

```js
// pseudo-code (ne mettez pas le secret cote client en production)
const signature = hmacSHA256(JSON.stringify(payload), "SECRET");
fetch("/api/404-log", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Signature": signature },
  body: JSON.stringify(payload),
});
```

### Exemple (serveur)

```ts
import crypto from "crypto";

const signature = req.headers["x-signature"] as string;
const expected = crypto
  .createHmac("sha256", process.env.LOG_HMAC_SECRET || "")
  .update(JSON.stringify(req.body))
  .digest("hex");

if (!signature || signature !== expected) {
  res.status(401).end();
  return;
}
```

Notes:

- Le secret ne doit jamais etre expose cote client. Pour une vraie securite, signez cote serveur (ex: middleware) ou utilisez un token court (JWT) genere cote serveur.
- Alternative simple: limiter par IP + verifier l'origin / referer.

## Check rapide

- Page 404 charge le script
- Endpoint `/api/404-log` en ligne
- `RESEND_API_KEY` configure
- Domaine Resend verifie
- Emails recus a `bvh@somebaudy.com`
