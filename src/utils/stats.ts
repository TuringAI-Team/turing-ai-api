import fs from "fs";
import axios from "axios";
import puppeteer from "puppeteer";
import delay from "delay";

export async function getUpdatedStats() {
  // using puppeter open the link https://discord.com/oauth2/authorize?client_id=1053015370115588147&scope=bot and get the number of guilds
  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: "new",
  });
  const page = await browser.newPage();
  await page.goto(
    "https://discord.com/application-directory/1053015370115588147"
  );
  await delay(5000);

  let guilds;
  // get the element with the text Used by X servers
  // save screenshot
  await page.screenshot({ path: "screenshot.png" });

  return 0;
  console.log(guilds);
  let guildsNumber = guilds.split(" ")[2];
  await pushStats(parseInt(guildsNumber));
  await browser.close();
  return parseInt(guildsNumber);
}
export async function getStats() {
  if (fs.existsSync("./guilds.txt")) {
    let guilds = fs.readFileSync("./guilds.txt", "utf-8");
    return parseInt(guilds);
  } else {
    let g = await getUpdatedStats();
    return g;
  }
}

async function pushStats(guilds: number) {
  // first update at the stats file
  fs.writeFileSync("./guilds.txt", guilds.toString());
  let shards = Math.round(guilds / 1000);
  // round shards to the nearest integer
  await axios({
    method: "post",
    url: "https://top.gg/api/bots/1053015370115588147/stats",
    headers: {
      Authorization: process.env.TOPGG_TOKEN,
      "Content-Type": "application/json",
    },
    data: {
      server_count: guilds,
      shard_count: shards,
    },
  });
  await axios({
    method: "post",
    url: "https://discord.bots.gg/api/v1/bots/1053015370115588147/stats",
    headers: {
      Authorization: process.env.DISCORD_BOTS_GG,
      "Content-Type": "application/json",
    },
    data: {
      guildCount: guilds,
      shardCount: shards,
    },
  });
}
