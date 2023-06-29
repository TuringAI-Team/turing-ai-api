import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "url";
import log from "../utils/log.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function textHandler(client) {
  if (client.text.length > 0) return;
  const texts = [];
  const textPath = path.join(__dirname, "../models/text");

  const textFiles = fs
    .readdirSync(textPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of textFiles) {
    const filePath = `../models/text/${file}`;
    const { default: text } = await import(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in text && "execute" in text) {
      texts.push(text);
    } else {
      log(
        "warning",
        `The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
  client.text = texts;
  log("info", `Loaded ${texts.length} text models.`);
}
