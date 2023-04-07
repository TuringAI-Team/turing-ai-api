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

const router = express.Router();

// Filter
router.post("/filter", async (req: Request, res: Response) => {
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

// Stable Diffusion
router.post("/sd", async (req: Request, res: Response) => {
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
  res.json(result).status(200);
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
});*/

export default router;
