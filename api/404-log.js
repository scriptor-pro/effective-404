import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

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

  const key = `rl:404:${ip}`;
  const now = Date.now();
  const last = await redis.get(key);
  if (last && now - Number(last) < 5 * 60 * 1000) {
    res.status(204).end();
    return;
  }
  await redis.set(key, now, { ex: 5 * 60 });

  const body = req.body && typeof req.body === "object" ? req.body : {};

  const payload = {
    ...body,
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

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "404 <noreply@scriptor.pro>",
      to: ["bvh@somebaudy.com"],
      subject,
      text,
      html,
    }),
  });

  res.status(204).end();
}
