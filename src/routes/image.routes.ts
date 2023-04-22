import express from "express";
import { Request, Response } from "express";
import filter from "../modules/filter/index.js";
import {
  generateImg,
  generateImg2img,
  mergeBase64,
  checkGeneration,
} from "../modules/image/stablehorde.js";
import generateImgD from "../modules/image/dall-e.js";
import turnstile from "../middlewares/captchas/turnstile.js";
import delay from "delay";
import { controlnet } from "../modules/image/controlnet.js";

const router = express.Router();

// Filter
router.post("/filter", turnstile, async (req: Request, res: Response) => {
  var { prompt, model } = req.body;
  var result = await filter(prompt, model);
  res
    .json({ isCP: result.isCP, isNsfw: result.isNsfw, isYoung: result.isYoung })
    .status(200);
});

/*
// Dall-e
router.post("/dalle", async (req: Request, res: Response) => {
  var { prompt, number } = req.body;
  var result = await generateImgD(prompt, number);
  res.json(result).status(200);
});
*/
// Controlnet
router.post("/controlnet", turnstile, async (req: Request, res: Response) => {
  let { model, image, prompt } = req.body;
  let availableModels = [
    "normal",
    "canny",
    "hough",
    "hed",
    "depth2img",
    "pose",
    "seg",
  ];
  if (!availableModels.includes(model)) {
    res.json({ error: "Invalid model" }).status(400);
    return;
  }
  var result = await controlnet(image, prompt, model);
  res.json(result).status(200);
});

// Stable Diffusion
router.post("/sd", turnstile, async (req: Request, res: Response) => {
  var {
    prompt,
    model,
    nsfw,
    steps,
    n,
    width,
    height,
    sampler_name,
    cfg_scale,
  } = req.body;

  var result = await generateImg(
    prompt,
    steps,
    nsfw,
    n,
    model,
    width,
    height,
    sampler_name,
    cfg_scale
  );
  let done = false;
  let lastCheck;
  let images = [];
  if (result.message || result.error || !result.id) {
    res.json(result).status(400);
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Transfer-Encoding": "chunked",
  });
  console.log("generating image, this may take a while, please wait...");
  lastCheck = await checkGeneration(result.id);
  res.write(`${JSON.stringify(lastCheck)}\n`);

  while (!done) {
    if (lastCheck) {
      await delay(lastCheck.wait_time * 1000 + 3000);
    } else {
      await delay(15000);
    }
    lastCheck = await checkGeneration(result.id);
    res.write(`${JSON.stringify(lastCheck)}\n`);
    if (lastCheck.done) {
      images = lastCheck.generations.map((i) => i.img);
      done = true;
      res.end();
    }
  }
});
router.post("/sd/img2img", turnstile, async (req: Request, res: Response) => {
  var {
    prompt,
    model,
    steps,
    amount,
    nsfw,
    source_image,
    width,
    height,
    sampler_name,
    cfg_scale,
    strength,
  } = req.body;

  var result = await generateImg2img(
    prompt,
    model,
    steps,
    amount,
    nsfw,
    source_image,
    width,
    height,
    sampler_name,
    cfg_scale,
    strength
  );
  let done = false;
  let lastCheck;
  let images = [];
  if (result.message || result.error || !result.id) {
    res.json(result).status(400);
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Transfer-Encoding": "chunked",
  });
  console.log("generating image, this may take a while, please wait...");
  lastCheck = await checkGeneration(result.id);
  res.write(`${JSON.stringify(lastCheck)}\n`);

  while (!done) {
    if (lastCheck) {
      await delay(lastCheck.wait_time * 1000 + 3000);
    } else {
      await delay(15000);
    }
    lastCheck = await checkGeneration(result.id);
    res.write(`${JSON.stringify(lastCheck)}\n`);
    if (lastCheck.done) {
      images = lastCheck.generations.map((i) => i.img);
      done = true;
      res.end();
    }
  }
});
router.get("/sd/:genid", async (req: Request, res: Response) => {
  var { genid } = req.params;
  try {
    var status = await checkGeneration(genid);
    console.log(status);
    if (status.done) {
      let imgs = status.generations.map((g, i) => {
        const sfbuff = Buffer.from(g.img, "base64");
        return sfbuff;
      });

      let base64: any = await mergeBase64(imgs, 512 / 2, 512 / 2);
      base64 = base64.split("base64,")[1];
      let sfbuff = Buffer.from(base64, "base64");
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": sfbuff.length,
      });
      res.end(sfbuff);
    }
    res.json(status).status(200);
  } catch (e: any) {
    res.json({ error: e.rawError.message }).status(400);
  }
});

export default router;
