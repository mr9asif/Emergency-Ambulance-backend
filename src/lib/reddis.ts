import { createClient } from "redis";
import config from "../config/index.js";

export const reddisClient = createClient({
  username: config.redis_user,
  password: config.redis_password,

  socket: {
    host: config.redis_host,
    port: Number(config.redis_port),
  },
});

reddisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

reddisClient.on("connect", () => {
  console.log("🔄 Redis connecting...");
});

reddisClient.on("ready", () => {
  console.log("✅ Redis ready!");
});
