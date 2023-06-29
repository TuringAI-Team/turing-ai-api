import express from "express";
import { Request, Response } from "express";
import { generateKey } from "../utils/key.js";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import { translateModels, request } from "../utils/runpod.js";

const router = express.Router();

router.post("/runsync", key, turnstile, async (req: Request, res: Response) => {
  let { model } = req.body;
  try {
    let url = await translateModels(model);
    let body = req.body;
    delete body.model;
    let result = await request(url, "runsync", body);
    res.json(result);
  } catch (error) {
    res.json({ error: error, success: false }).status(400);
  }
});

router.post("/run", key, turnstile, async (req: Request, res: Response) => {
  let { model } = req.body;
  try {
    let url = await translateModels(model);
    let body = req.body;
    delete body.model;
    let result = await request(url, "run", body);
    res.json(result);
  } catch (error) {
    res.json({ error: error, success: false }).status(400);
  }
});

router.post(
  "/status/:id",
  key,
  turnstile,
  async (req: Request, res: Response) => {
    let { model } = req.body;
    let { id } = req.params;
    try {
      let url = await translateModels(model);
      let body = req.body;
      delete body.model;
      let result = await request(url, `status/${id}`, body);
      res.json(result);
    } catch (error) {
      res.json({ error: error, success: false }).status(400);
    }
  }
);

router.post("/cancel", key, turnstile, async (req: Request, res: Response) => {
  let { model } = req.body;
  try {
    let url = await translateModels(model);
    let body = req.body;
    delete body.model;
    let result = await request(url, "cancel", body);
    res.json(result);
  } catch (error) {
    res.json({ error: error, success: false }).status(400);
  }
});

export default router;
