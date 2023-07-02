import { Client } from "discord.js-selfbot-v13";
const client = new Client({
  checkUpdate: false,
});

client.on("ready", async () => {
  console.log(`${client.user.username} is ready!`);
});

client.login(process.env.SELFBOT_TOKEN);

export default client;
