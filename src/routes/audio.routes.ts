import express from "express";
import { Request, Response } from "express";
import STT from "../modules/audio/stt.js";

const router = express.Router();

router.post("/transcript", async (req: Request, res: Response) => {
  let { ai, model, file } = req.body;
  let result = await STT("gladia", "", file);
  res.json(result).status(200);
});

export default router;
