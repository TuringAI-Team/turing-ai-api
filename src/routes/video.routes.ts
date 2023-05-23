import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import generateVideo from "../modules/video/damo.js";
import generateVideo2 from "../modules/video/videocrafter.js";
import Gen2 from "../modules/video/gen2.js";

const router = express.Router();

router.post("/:m", key, turnstile, async (req: Request, res: Response) => {
  try {
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
    if (m == "gen2") {
      let { prompt } = req.body;
      if (!prompt) return res.json({ error: "No prompt provided" }).status(400);
      let result = await Gen2(prompt);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");
      result.on("data", (chunk) => {
        if (chunk) res.write(chunk);
        if (chunk.end) res.end();
      });
    }
  } catch (err: any) {
    console.log(`err video: ${JSON.stringify(err)}}`);
    res.json({ error: err, success: false }).status(400);
  }
});

export default router;
