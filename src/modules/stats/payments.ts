import redisClient from "../cache/redis.js";
import supabase from "../supabase.js";
import { v4 as uuidv4 } from "uuid";

export default async function SavePaymentMetrics() {
  let stats: any = await redisClient.get("payment-stats");

  if (stats) {
    stats = JSON.parse(stats);
    await supabase.from("metrics").insert([
      {
        id: uuidv4(),
        time: new Date(),
        type: "payments",
        data: stats,
      },
    ]);
    await redisClient.set("payment-stats", JSON.stringify({}));
  }
}
