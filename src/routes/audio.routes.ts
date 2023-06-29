import express from "express";
import { Request, Response } from "express";
import STT from "../modules/audio/stt.js";
import TTS from "../modules/audio/tts.js";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";

const router = express.Router();

router.post(
  "/transcript",
  key,
  turnstile,
  async (req: Request, res: Response) => {
    let { ai = "whisper-fast", model = "base", url } = req.body;
    let result = await STT(ai, model, url);
    res.json(result).status(200);
  }
);
router.post("/tts", key, async (req: Request, res: Response) => {
  let { ai, voice, msg } = req.body;
  let result = await TTS(ai, voice, msg);
  console.log(result);
  //  answer with the buffer
  res.send(result).status(200);
});

export default router;
