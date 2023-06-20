import express from "express";
import { Request, Response } from "express";
import { verify } from "hcaptcha";
import { hasVoted, vote } from "../modules/top-gg.js";
import { generateKey } from "../modules/keys.js";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";

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

router.get(
  "/topgg/:id",
  key,
  turnstile,
  async (req: Request, res: Response) => {
    let { id } = req.params;
    let hasvoted = await hasVoted(id);
    res.json({ hasVoted: hasvoted });
  }
);

router.post("/top-vote", key, async (req: Request, res: Response) => {
  let body = req.body;
  let botId = "1053015370115588147";
  if (body.bot == botId && body.type == "upvote") {
    let r = await vote(body.user);
  }

  res.status(200).json({ success: true });
});
router.post("/key", key, turnstile, async (req: Request, res: Response) => {
  let { ips } = req.body;
  let key = await generateKey(ips);
  res.json(key);
});
router.get("/ping", key, turnstile, (req, res) => {
  res.json({ success: true }).status(200);
});

export default router;
