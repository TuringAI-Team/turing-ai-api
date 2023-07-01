import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "url";
import log from "../utils/log.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function imageHandler(client) {
  if (client.image.length > 0) return;
  const images = [];
  const imagePath = path.join(__dirname, "../models/image");

  const imageFiles = fs
    .readdirSync(imagePath)
    .filter((file) => file.endsWith(".js"));

  for (const file of imageFiles) {
    const filePath = `../models/image/${file}`;
    const { default: image } = await import(filePath);
    if (!image) {
      log(
        "warning",
        `The command at ${filePath} is missing a required "data" or "execute" property.`
      );
      continue;
    }
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in image && "execute" in image) {
      images.push(image);
    } else {
      log(
        "warning",
        `The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
  client.image = images;
  log("info", `Loaded ${images.length} image models.`);
}
