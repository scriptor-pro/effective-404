import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

interface RecentEvent {
  url: string | null;
  ip: string;
  ts: string;
}

interface TopUrl {
  url: string;
  hits: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }

  const auth = req.headers["authorization"] || "";
  if (auth !== `Bearer ${process.env.STATS_SECRET}`) {
    res.status(401).end();
    return;
  }

  const day = new Date().toISOString().slice(0, 10);

  try {
    const [count, topUrlsRaw, recentRaw] = await Promise.all([
      redis.get<number>(`stats:404:count:${day}`),
      redis.zrange(`stats:404:urls:${day}`, 0, 9, {
        rev: true,
        withScores: true,
      }),
      redis.lrange("stats:404:recent", 0, 19),
    ]);

    const topUrls: TopUrl[] = [];
    if (topUrlsRaw) {
      for (let i = 0; i < topUrlsRaw.length; i += 2) {
        topUrls.push({
          url: String(topUrlsRaw[i]),
          hits: Number(topUrlsRaw[i + 1]),
        });
      }
    }

    const recent: RecentEvent[] = [];
    if (recentRaw) {
      for (const item of recentRaw) {
        try {
          recent.push(
            typeof item === "string" ? JSON.parse(item) : item,
          );
        } catch {
          // Skip malformed entries
        }
      }
    }

    res.status(200).json({
      today: {
        count: count ?? 0,
        topUrls,
      },
      recent,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch stats",
    });
  }
}
