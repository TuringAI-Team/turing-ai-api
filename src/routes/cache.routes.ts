import express from "express";
import { Request, Response } from "express";
import { verify } from "hcaptcha";
import { hasVoted } from "../modules/top-gg.js";
import {
  checkInCache,
  saveInCache,
  addUsesInCache,
} from "../modules/cache/index.js";

const router = express.Router();

router.post("/savecache", async (req: Request, res: Response) => {
  console.log("svae cache");
  let { message, response, model } = req.body;
  await saveInCache(message, response, model);
  res.json({ success: true }).status(200);
});
router.post("/checkcache", async (req: Request, res: Response) => {
  console.log("check cache");
  let { message, model } = req.body;
  let response = await checkInCache(message, model);
  res.json({ success: true, response: response }).status(200);
});
router.post("/addusescache", async (req: Request, res: Response) => {
  console.log("use cache");

  let { message, model } = req.body;
  await addUsesInCache(message, model);
  res.json({ success: true }).status(200);
});

export default router;
