import { VoteClient } from "topgg-votes";
import fs from "fs";
import redisClient from "./cache/redis.js";
import supabase from "./supabase.js";

const votesClient = new VoteClient()
  .setToken(process.env.TOPGG_TOKEN)
  .setPort(randomPort());
try {
  votesClient.postWebhook();
} catch (err) {
  console.log(err);
  votesClient.setPort(randomPort());
  votesClient.postWebhook();
}

function randomPort() {
  let port = Math.floor(Math.random() * (65535 - 1024) + 1024);
  // check if port is being used
  try {
    fs.accessSync(`http://localhost:${port}`);
    return randomPort();
  } catch (e) {
    return port;
  }
}
export async function hasVoted(userId) {
  try {
    let hasVoted = await Promise.race([
      votesClient.hasVoted(userId),
      new Promise<boolean>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Timeout"));
        }, 5000);
      }),
    ]);
    return hasVoted;
  } catch (e) {
    return false;
  }
}
votesClient.on("botVote", async ({ userId }) => {
  console.log(`User ${userId} just voted!`);
  let user = await redisClient.get(`users:${userId}`);
  if (user) {
    let userData = JSON.parse(user);
    userData.voted = new Date().toISOString();
    redisClient.set(`users:${userId}`, userData);
    let { data: userDB, error } = await supabase
      .from("users_new")
      .select("*")
      .eq("id", userId)
      .single();

    if (userDB) {
      userDB.voted = new Date().toISOString();
      await supabase.from("users_new").update(userDB).eq("id", userId);
    }
  }
});
