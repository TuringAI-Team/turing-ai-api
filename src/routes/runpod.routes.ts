import express from "express";
import { Request, Response } from "express";
import { verify } from "hcaptcha";
import { hasVoted } from "../modules/top-gg.js";
import { generateKey } from "../modules/keys.js";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import { translateModels, request } from "../modules/runpod/index.js";

const router = express.Router();

router.post("/runsync", key, turnstile, async (req: Request, res: Response) => {
  let { model } = req.body;
  let url = await translateModels(model);
  let body = req.body;
  delete body.model;
  let result = await request(url, "runsync", body);
});
router.post("/run", key, turnstile, async (req: Request, res: Response) => {
  let { model } = req.body;
  let url = await translateModels(model);
  let body = req.body;
  delete body.model;
  let result = await request(url, "run", body);
});
router.post("/status", key, turnstile, async (req: Request, res: Response) => {
  let { model } = req.body;
  let url = await translateModels(model);
  let body = req.body;
  delete body.model;
  let result = await request(url, "status", body);
});
router.post("/cancel", key, turnstile, async (req: Request, res: Response) => {
  let { model } = req.body;
  let url = await translateModels(model);
  let body = req.body;
  delete body.model;
  let result = await request(url, "cancel", body);
});

export default router;
