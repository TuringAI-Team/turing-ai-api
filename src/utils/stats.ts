import fs from "fs";
import axios from "axios";
import puppeteer from "puppeteer";
import delay from "delay";

export async function getUpdatedStats() {
  try {

    let res = await fetch(
      "https://discord.com/api/v9/applications/1053015370115588147",
      {
        headers: {
          accept: "*/*",
          "accept-language": "es-ES,es;q=0.9,en;q=0.8",
          authorization: process.env.STATS_AUTH,
          "sec-ch-ua":
            '"Chromium";v="116", "Not)A;Brand";v="24", "Brave";v="116"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "sec-gpc": "1",
        },
        referrer:
          "https://discord.com/developers/applications/1053015370115588147/information",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include",
      }
    );
    let answer = await res.json();
    let guildsNumber = answer.approximate_guild_count;
    await pushStats(guildsNumber);
    return guildsNumber;
  } catch (error) {
    return 296000
  }
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
  try {
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
  } catch (error) { }
  try {
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
  } catch (error) { }
}
