// src/lib/redis/redis.ts - Düzelt
import * as dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config({ path: ".env.local" });

// Singleton connection (genel kullanım için)
let sharedRedis: Redis | null = null;

// Shared connection (tek seferlik işlemler için)
export function getRedisClient(): Redis {
  if (sharedRedis) return sharedRedis;

  sharedRedis = createRedisConnection();
  return sharedRedis;
}

// Her çağrıda yeni connection (worker'lar için)
export function createRedisConnection(): Redis {
  let redis: Redis;

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
    console.log("🔗 New Redis connection established");
  });

  redis.on("error", (error) => {
    console.error("🚨 Redis connection error:", error);
  });

  return redis;
}
