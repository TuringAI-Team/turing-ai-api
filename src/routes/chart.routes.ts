import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import { getChartImage } from "../utils/chart.js";

const router = express.Router();
router.post("/:chart", key, turnstile, async (req: Request, res: Response) => {
  let { chart } = req.params;
  let { filter, period, type = "line" } = req.body;
  try {
    if (!period) period = "1d";
    if (period == "1w") period = "7d";
    if (period == "2w") period = "14d";
    if (period == "1m") period = "30d";
    if (period == "3m") period = "90d";
    let result = await getChartImage(chart, filter, period, type);
    res.json({ success: true, ...result });
  } catch (error) {
    console.log(error);
    res.json({ error: error, success: false }).status(400);
  }
});

export default router;
