import StableHorde from "@zeldafan0225/stable_horde";
const stable_horde = new StableHorde({
  cache_interval: 1000 * 10,
  cache: {
    generations_check: 1000 * 30,
  },
  client_agent: "TuringAPI:1.0:(discord)Mrlol#0333",
  default_token: process.env.STABLE_HORDE,
});
import { createCanvas, loadImage, Image } from "canvas";
import sharp from "sharp";
import supabase from "../supabase.js";
import "dotenv/config";
import filter from "../filter/index.js";

export async function generateImg(
  prompt: string,
  steps: number = 50,
  nsfw: boolean = false,
  n: number = 1,
  model: string = "Dreamshaper",
  width: number = 512,
  height: number = 512,
  sampler_name: string = "k_dpmpp_sde",
  cfg_scale?: number
) {
  var passFilter = await filter(prompt, model);
  if (passFilter.isCP) {
    return {
      id: null,
      error: true,
      message:
        "To prevent generation of unethical images, we cannot allow this prompt with NSFW models/tags.",
      filter: true,
      ...passFilter,
    };
  }
  try {
    const generation = await stable_horde.postAsyncGenerate({
      prompt: prompt,
      nsfw: nsfw,
      censor_nsfw: nsfw == true ? false : true,
      r2: true,
      shared: true,
      models: [model],
      params: {
        n: n,
        steps: steps,
        // @ts-ignore
        sampler_name: sampler_name,
        width: width,
        height: height,
        cfg_scale: cfg_scale,
      },
    });
    return { ...generation, error: false };
  } catch (e) {
    return { message: e, ...passFilter, error: true, id: null };
  }
}
export async function generateImg2img(
  prompt: string,
  model: string = "Dreamshaper",
  steps: number = 50,
  amount: number = 1,
  nsfw: boolean = false,
  source_image: string,
  width: number = 512,
  height: number = 512,
  sampler_name: string = "k_dpmpp_sde",
  cfg_scale: number,
  strength: number = 0.5
) {
  var passFilter = await filter(prompt, model);
  if (passFilter.isCP) {
    return {
      error: true,
      id: null,
      message:
        "To prevent generation of unethical images, we cannot allow this prompt with NSFW models/tags.",
      ...passFilter,
    };
  }
  try {
    const generation = await stable_horde.postAsyncGenerate({
      prompt: prompt,
      nsfw: nsfw,
      censor_nsfw: nsfw == true ? false : true,
      r2: false,
      shared: true,
      models: [model],
      source_image,
      source_processing: StableHorde.SourceImageProcessingTypes.img2img,
      params: {
        n: amount,
        steps: steps,
        // @ts-ignore
        sampler_name: sampler_name,
        width: width,
        height: height,
        cfg_scale: cfg_scale,
        denoising_strength: strength,
      },
    });
    return { ...generation, ...passFilter, error: false };
  } catch (e) {
    return { message: e, ...passFilter, error: true, id: null };
  }
}
export async function mergeBase64(imgs: Buffer[], width, height) {
  var totalW = width * 2;
  var totalH = height * 2;

  if (imgs.length == 1) {
    totalW = totalW / 2;
    totalH = totalH / 2;
  }
  if (imgs.length == 2) {
    totalH = totalH / 2;
  }
  var canvas = createCanvas(totalW, totalH);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < imgs.length; i++) {
    var im = await sharp(imgs[i]).toFormat("png").toBuffer();
    var b64 = Buffer.from(im).toString("base64");
    const img = new Image();
    var x = 0;
    var y = 0;
    if (i == 0) {
      x = 0;
      y = 0;
    }
    if (i == 1) {
      x = width;
      y = 0;
    }
    if (i == 2) {
      x = 0;
      y = height;
    }
    if (i == 3) {
      x = width;
      y = height;
    }
    img.onload = () => ctx.drawImage(img, x, y, width, height);
    img.onerror = (err) => {
      throw err;
    };
    img.src = `data:image/png;base64,${b64}`;
  }

  const dataURL = canvas.toDataURL();
  return dataURL;
}
export async function checkGeneration(generationId: string) {
  // check the status of your generation using the generations id
  const check = await stable_horde.getGenerationStatus(generationId);
  return check;
}
