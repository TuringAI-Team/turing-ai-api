import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import generateVideo from "../modules/video/damo.js";

const router = express.Router();

router.post("/damo", key, turnstile, async (req: Request, res: Response) => {
  let { prompt } = req.body;
  if (!prompt) return res.json({ error: "No prompt provided" }).status(400);
  let result = await generateVideo(prompt);
  res.json(result).status(200);
});

export default router;
