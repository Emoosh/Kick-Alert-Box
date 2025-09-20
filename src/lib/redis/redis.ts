import * as dotenv from "dotenv";
import Redis from "ioredis";

// .env.local dosyasını yükle
dotenv.config({ path: ".env.local" });

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (redis) return redis;

  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    });
  } else {
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined,
      maxRetriesPerRequest: 3,
    });
  }

  redis.on("connect", () => {
    console.log("Redis connected");
  });

  redis.on("error", (error) => {
    console.error("Redis error:", error);
  });

  return redis;
}
