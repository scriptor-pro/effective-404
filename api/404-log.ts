import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function log(entry: Record<string, unknown>): void {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    ...entry,
  }));
}

function sanitizeString(val: unknown, max: number): string | null {
  return typeof val === "string" ? val.slice(0, max) : null;
}

function sanitizeNumber(val: unknown): number | null {
  return typeof val === "number" && isFinite(val) ? val : null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
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

  // ========== Security: Origin/Referer check ==========
  const origin = req.headers["origin"] || req.headers["referer"] || "";
  if (!String(origin).startsWith("https://scriptor.pro")) {
    log({ level: "warn", event: "origin_rejected", origin, ip });
    res.status(204).end();
    return;
  }

  // ========== Global daily rate limit ==========
  const day = new Date().toISOString().slice(0, 10);
  const globalKey = `rl:404:global:${day}`;
  const DAILY_LIMIT = 500;

  try {
    const globalCount = await redis.incr(globalKey);
    if (globalCount === 1) {
      await redis.expire(globalKey, 2 * 24 * 3600);
    }
    if (globalCount > DAILY_LIMIT) {
      log({ level: "warn", event: "daily_limit_reached", count: globalCount });
      res.status(204).end();
      return;
    }
  } catch (err) {
    log({
      level: "warn",
      event: "redis_unavailable",
      error: (err as Error).message,
    });
  }

  // ========== Per-IP rate limit ==========
  try {
    const key = `rl:404:${ip}`;
    const now = Date.now();
    const last = await redis.get(key);
    if (last && now - Number(last) < 5 * 60 * 1000) {
      log({ level: "info", event: "rate_limited", ip });
      res.status(204).end();
      return;
    }
    await redis.set(key, now, { ex: 5 * 60 });
  } catch (err) {
    log({
      level: "warn",
      event: "redis_unavailable",
      error: (err as Error).message,
    });
  }

  // ========== Validate & sanitize payload ==========
  const b = typeof req.body === "object" && req.body !== null ? req.body : {};
  const safeBody = {
    url: sanitizeString((b as any).url, 2000),
    referrer: sanitizeString((b as any).referrer, 2000),
    userAgent: sanitizeString((b as any).userAgent, 500),
    platform: sanitizeString((b as any).platform, 100),
    language: sanitizeString((b as any).language, 50),
    timezone: sanitizeString((b as any).timezone, 100),
    screen:
      (b as any).screen && typeof (b as any).screen === "object"
        ? {
            width: sanitizeNumber((b as any).screen.width),
            height: sanitizeNumber((b as any).screen.height),
            colorDepth: sanitizeNumber((b as any).screen.colorDepth),
          }
        : null,
    deviceMemory: sanitizeNumber((b as any).deviceMemory),
    hardwareConcurrency: sanitizeNumber((b as any).hardwareConcurrency),
    connection:
      (b as any).connection && typeof (b as any).connection === "object"
        ? {
            effectiveType: sanitizeString(
              (b as any).connection.effectiveType,
              20,
            ),
            downlink: sanitizeNumber((b as any).connection.downlink),
            rtt: sanitizeNumber((b as any).connection.rtt),
          }
        : null,
    doNotTrack: sanitizeString((b as any).doNotTrack, 10),
    cookieEnabled:
      typeof (b as any).cookieEnabled === "boolean"
        ? (b as any).cookieEnabled
        : null,
    occurredAt: sanitizeString((b as any).occurredAt, 30),
  };

  const payload = {
    ...safeBody,
    ip,
    requestHeaders: {
      referer: req.headers["referer"] || null,
      userAgent: req.headers["user-agent"] || null,
    },
  };

  log({ level: "info", event: "404_received", ip, url: payload.url });

  // ========== Send email ==========
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

  try {
    const response = await fetch("https://api.resend.com/emails", {
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

    if (!response.ok) {
      const errorText = await response.text();
      log({
        level: "error",
        event: "email_failed",
        ip,
        url: payload.url,
        status: response.status,
        error: errorText,
      });
    } else {
      log({ level: "info", event: "email_sent", ip, url: payload.url });
    }
  } catch (err) {
    log({
      level: "error",
      event: "email_failed",
      ip,
      url: payload.url,
      error: (err as Error).message,
    });
  }

  // ========== Write stats to Redis ==========
  try {
    const recentEntry = JSON.stringify({
      url: payload.url,
      ip,
      ts: new Date().toISOString(),
    });
    await Promise.all([
      redis.incr(`stats:404:count:${day}`),
      redis.zincrby(`stats:404:urls:${day}`, 1, payload.url ?? "(unknown)"),
      redis.lpush("stats:404:recent", recentEntry),
    ]);
    await redis.ltrim("stats:404:recent", 0, 199);
    // Fire-and-forget TTL
    redis.expire(`stats:404:count:${day}`, 90 * 24 * 3600);
    redis.expire(`stats:404:urls:${day}`, 30 * 24 * 3600);
  } catch (err) {
    log({
      level: "warn",
      event: "stats_write_failed",
      error: (err as Error).message,
    });
  }

  res.status(204).end();
}
