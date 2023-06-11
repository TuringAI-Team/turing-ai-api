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
import key from "../middlewares/key.js";
import { Configuration, OpenAIApi } from "openai";
import {
  buttons,
  describe,
  imagine,
  imagineWithQueue,
} from "../modules/image/midjourney.js";
import supabase from "../modules/supabase.js";
import redisClient from "../modules/cache/redis.js";
import axios from "axios";
import sharp from "sharp";
import { queue, actions } from "../modules/image/mj.js";
import { randomUUID } from "crypto";
const router = express.Router();
let configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Filter
router.post("/filter", key, turnstile, async (req: Request, res: Response) => {
  var { prompt, model } = req.body;
  var result = await filter(prompt, model);
  res
    .json({ isCP: result.isCP, isNsfw: result.isNsfw, isYoung: result.isYoung })
    .status(200);
});

// Dall-e
router.post("/dalle", key, turnstile, async (req: Request, res: Response) => {
  try {
    var { prompt, n = 1, size = "512x512" } = req.body;

    const response = await openai.createImage({
      prompt: prompt,
      size: size,
      n: n,
    });
    let result = { response: response.data };
    res.json({ success: true, result }).status(200);
  } catch (err: any) {
    res.json({ error: err, success: false }).status(400);
  }
});
router.post(
  "/dalle/variation",
  key,
  turnstile,
  async (req: Request, res: Response) => {
    try {
      let {
        image,
        n = 1,
        size = "512x512",
      }: {
        image: File;
        n?: number;
        size?: string;
      } = req.body;

      const response = await openai.createImageVariation(image, n, size);
      let result = { response: response.data };
      res.json({ success: true, result }).status(200);
    } catch (err) {
      res.json({ error: err, success: false }).status(400);
    }
  }
);

// Controlnet
router.post(
  "/controlnet",
  key,
  turnstile,
  async (req: Request, res: Response) => {
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
  }
);

// Stable Diffusion
router.post("/sd", key, turnstile, async (req: Request, res: Response) => {
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
router.post(
  "/sd/img2img",
  key,
  turnstile,
  async (req: Request, res: Response) => {
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
  }
);
router.post(
  "/sd/variation",
  key,
  turnstile,
  async (req: Request, res: Response) => {
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
      0.8
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
      res.write(`data: ${JSON.stringify(lastCheck)}\n\n`);
      if (lastCheck.done) {
        images = lastCheck.generations.map((i) => i.img);
        done = true;
        res.end();
      }
    }
  }
);

router.get(
  "/sd/:genid",
  key,
  turnstile,
  async (req: Request, res: Response) => {
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
  }
);

// Midjourney
router.post(
  "/mj/:action",
  key,
  turnstile,
  async (req: Request, res: Response) => {
    let action = req.params.action;
    if (action == "imagine") {
      let { prompt, model, premium = true } = req.body;
      res.set("content-type", "text/event-stream");

      let event = await queue(prompt, model, premium);
      req.on("close", () => {
        console.log("close");
        event.emit("close", {});
      });
      event.on("data", async (data) => {
        res.write("data: " + JSON.stringify(data) + "\n\n");
        if (data.done) {
          console.log("done", data);
          try {
            if (data.image) {
              // uploads image to storage, data.image is a url image
              let image = await axios.get(data.image, {
                responseType: "arraybuffer",
              });
              let buffer = Buffer.from(image.data, "base64");

              // save it as png
              let { error } = await supabase.storage
                .from("mj")
                .upload(`${data.id}.png`, buffer, {
                  cacheControl: "3600",
                  upsert: false,
                  contentType: "image/png",
                });

              if (error) {
                console.log(`upload: ${error}`);
              }
              let { data: dimg } = await supabase.storage
                .from("mj")
                .getPublicUrl(`${data.id}.png`);
              let publicUrl = dimg.publicUrl;
              await supabase.from("dataset").insert([
                {
                  id: randomUUID(),
                  model: data.model,
                  dataset: "1-turingjourney",
                  data: {
                    id: data.id,
                    prompt: data.prompt,
                    image: publicUrl,
                    model: data.model,
                    rating: null,
                  },
                },
              ]);
            }
          } catch (e) {
            console.log(e);
          }
          res.end();
        }
      });
    } else if (action == "describe") {
      let { image } = req.body;
      res.set("content-type", "text/event-stream");

      let event = await describe(image);
      event.on("data", (data) => {
        res.write("data: " + JSON.stringify(data) + "\n\n");
        if (data.done) {
          res.end();
        }
      });
    } else if (
      action == "variation" ||
      action == "upscale" ||
      action == "cancel"
    ) {
      let { id, number, mode, premium } = req.body;
      res.set("content-type", "text/event-stream");
      let event;
      if (action == "upscale") {
        event = await actions(id, action, number);
      } else {
        event = await queue(null, null, premium, "variation", number, id);
      }
      event.on("data", async (data) => {
        res.write("data: " + JSON.stringify(data) + "\n\n");
        if (data.done) {
          if (action == "upscale") {
            try {
              // uploads image to storage, data.image is a url image
              let image = await axios.get(data.image, {
                responseType: "arraybuffer",
              });
              let buffer = Buffer.from(image.data, "base64");

              // save it as png
              let { error } = await supabase.storage
                .from("mj")
                .upload(`${data.jobId}.png`, buffer, {
                  cacheControl: "3600",
                  upsert: false,
                  contentType: "image/png",
                });

              if (error) {
                console.log(error);
              }
              let { data: dimg } = await supabase.storage
                .from("mj")
                .getPublicUrl(`${data.jobId}.png`);
              let publicUrl = dimg.publicUrl;
              await supabase.from("dataset").insert([
                {
                  id: data.jobId,
                  model: data.model,
                  dataset: "0-turingjourney",
                  data: {
                    id: id,
                    jobId: data.jobId,
                    prompt: data.prompt,
                    image: publicUrl,
                    model: data.model,
                    rating: null,
                  },
                },
              ]);
            } catch (e) {
              console.log(e);
            }
          }
          res.end();
        }
      });
    }
  }
);

export default router;
