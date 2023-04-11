import express from "express";
import { Request, Response } from "express";
import { verify } from "hcaptcha";
import { hasVoted } from "../modules/top-gg.js";

const router = express.Router();

router.post("/hcaptcha", async (req: Request, res: Response) => {
  let { token } = req.body;
  const data = await verify(process.env.HCAPTCHA_SECRET, token);
  if (data.success) {
    res.json({ success: true }).status(200);
  } else {
    res.json({ success: false }).status(400);
  }
});
router.get("/topgg/:id", async (req: Request, res: Response) => {
  let { id } = req.params;
  let hasvoted = await hasVoted(id);
  res.json({ hasVoted: hasvoted });
});

export default router;
