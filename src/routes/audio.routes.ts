import express from "express";
import { Request, Response } from "express";
import STT from "../modules/audio/stt.js";
import turnstile from "../middlewares/captchas/turnstile.js";

const router = express.Router();

router.post("/transcript", turnstile, async (req: Request, res: Response) => {
  let { ai, model, file } = req.body;
  let result = await STT(ai, "", file);
  res.json(result).status(200);
});

export default router;
