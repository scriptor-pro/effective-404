import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function log(entry) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    ...entry,
  }));
}

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
    log({ level: "warn", event: "redis_unavailable", error: err.message });
  }

  function sanitizeString(val, max) {
    return typeof val === "string" ? val.slice(0, max) : null;
  }
  function sanitizeNumber(val) {
    return typeof val === "number" && isFinite(val) ? val : null;
  }

  const b = typeof req.body === "object" && req.body !== null ? req.body : {};
  const safeBody = {
    url: sanitizeString(b.url, 2000),
    referrer: sanitizeString(b.referrer, 2000),
    userAgent: sanitizeString(b.userAgent, 500),
    platform: sanitizeString(b.platform, 100),
    language: sanitizeString(b.language, 50),
    timezone: sanitizeString(b.timezone, 100),
    screen: b.screen && typeof b.screen === "object" ? {
      width: sanitizeNumber(b.screen.width),
      height: sanitizeNumber(b.screen.height),
      colorDepth: sanitizeNumber(b.screen.colorDepth),
    } : null,
    deviceMemory: sanitizeNumber(b.deviceMemory),
    hardwareConcurrency: sanitizeNumber(b.hardwareConcurrency),
    connection: b.connection && typeof b.connection === "object" ? {
      effectiveType: sanitizeString(b.connection.effectiveType, 20),
      downlink: sanitizeNumber(b.connection.downlink),
      rtt: sanitizeNumber(b.connection.rtt),
    } : null,
    doNotTrack: sanitizeString(b.doNotTrack, 10),
    cookieEnabled: typeof b.cookieEnabled === "boolean" ? b.cookieEnabled : null,
    occurredAt: sanitizeString(b.occurredAt, 30),
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
      log({ level: "error", event: "email_failed", ip, url: payload.url, status: response.status, error: errorText });
    } else {
      log({ level: "info", event: "email_sent", ip, url: payload.url });
    }
  } catch (err) {
    log({ level: "error", event: "email_failed", ip, url: payload.url, error: err.message });
  }

  res.status(204).end();
}
