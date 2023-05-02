import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import generateVideo from "../modules/video/damo.js";
import generateVideo2 from "../modules/video/videocrafter.js";

const router = express.Router();

router.post("/:m", key, turnstile, async (req: Request, res: Response) => {
  let { m } = req.params;
  if (m == "damo") {
    let {
      prompt,
      num_frames = 50,
      num_inference_steps = 50,
      fps = 8,
    } = req.body;
    if (!prompt) return res.json({ error: "No prompt provided" }).status(400);
    let result = await generateVideo(
      prompt,
      num_frames,
      num_inference_steps,
      fps
    );
    res.json(result).status(200);
  }
  if (m == "videocrafter") {
    let { prompt, ddim_steps = 50, lora_model = "None" } = req.body;
    if (!prompt) return res.json({ error: "No prompt provided" }).status(400);
    let result = await generateVideo2(prompt, ddim_steps, lora_model);
    res.json(result).status(200);
  }
});

export default router;
