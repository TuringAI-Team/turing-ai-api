import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "url";
import log from "../utils/log.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function videoHandler(client) {
  if (client.video.length > 0) return;
  const videos = [];
  const videoPath = path.join(__dirname, "../models/video");

  const videoFiles = fs
    .readdirSync(videoPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of videoFiles) {
    const filePath = `../models/video/${file}`;
    const { default: video } = await import(filePath);
    if (!video) {
      log(
        "warning",
        `The command at ${filePath} is missing a required "data" or "execute" property.`
      );
      continue;
    }
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in video && "execute" in video) {
      videos.push(video);
    } else {
      log(
        "warning",
        `The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
  client.video = videos;
  log("info", `Loaded ${videos.length} video models.`);
}
