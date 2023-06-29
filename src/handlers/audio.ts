import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "url";
import log from "../utils/log.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function audioHandler(client) {
  if (client.audio.length > 0) return;
  const audios = [];
  const audioPath = path.join(__dirname, "../models/audio");

  const audioFils = fs
    .readdirSync(audioPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of audioFils) {
    const filePath = `../models/audio/${file}`;
    const { default: audio } = await import(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in audio && "execute" in audio) {
      audios.push(audio);
    } else {
      log(
        "warning",
        `The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
  client.audio = audios;
  log("info", `Loaded ${audios.length} audio models.`);
}
