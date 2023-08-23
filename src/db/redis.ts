import { createClient, defineScript } from "redis";

let port: any = process.env.REDIS_PORT;
const redisClient = createClient({
  password: process.env.REDIS_PASSWORD || "password",
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: port,
  },
});

redisClient.on("error", (err) => console.log("Client error: Redis", err));

await redisClient.connect();

export default redisClient;
