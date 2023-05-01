import express from "express";
import { Request, Response } from "express";
import { verify } from "hcaptcha";
import { hasVoted } from "../modules/top-gg.js";
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
/*
Hey everyone!

Big news! We've merged with another ChatGPT Discord bot, Ampere <:ampere_round_bolt:1095676185645678612>. This means we've scrapped the old bot and started fresh with Ampere, which comes with many improvements for you guys, such as partial messages, a settings menu, and an overall better experience with the bot. We've got some awesome updates planned for the coming weeks, so stay tuned!

If you had Premium before on either Turing or Ampere, don't worry, your subscription has already been transferred to the new bot. If you're still having issues, hit us up in our <#1097988861977698484> .

Additionally, the <@1052474023126245447> will be deprecated soon in favor of having a single bot, 

Thanks for all your support, and we hope you enjoy the new and improved <@1053015370115588147> !

Cheers, Turing AI
 */
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
router.post("/key", key, turnstile, async (req: Request, res: Response) => {
  let { ips } = req.body;
  let key = await generateKey(ips);
  res.json(key);
});
router.get("/ping", key, turnstile, (req, res) => {
  res.json({ success: true }).status(200);
});

export default router;
