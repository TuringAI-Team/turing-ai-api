import { Client } from "discord.js-selfbot-v13";
const client = new Client({
  // See other options here
  // https://discordjs-self-v13.netlify.app/#/docs/docs/main/typedef/ClientOptions
  // All partials are loaded automatically
  checkUpdate: false,
});
import redisClient from "./modules/cache/redis.js";

client.on("ready", async () => {
  console.log(`${client.user.username} is ready!`);
});
client.on("messageCreate", async (message) => {
  try {
    if (message.embeds.length > 0) {
      let footer = message.embeds[0].footer;
      let title = message.embeds[0].title;
      let prompt = footer?.text.split("/imagine")[1]?.trim();
      console.log(prompt);
      if (prompt) {
        redisClient.set(`imagine:${prompt}`, title);
      }
    }
  } catch (e) {
    console.log(e);
  }
});

client.login(process.env.SELFBOT_TOKEN);

export default client;
