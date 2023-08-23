import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import { generateKey } from "../utils/key.js";
import { pub } from "../db/mq.js";
import { getStats } from "../utils/stats.js";

const router = express.Router();
async function secret(req, res, next) {
  let { secret } = req.headers;
  if (secret == process.env.SUPER_KEY) {
    next();
  } else {
    res.json({ success: false, error: "no permissions" });
  }
}
async function topgg(req, res, next) {
  if (req.headers.authorization == process.env.TOPGG_AUTH) {
    next();
  } else {
    res.status(401).json({ success: false });
  }
}

router.post(
  "/mp3-to-mp4",
  key,
  turnstile,
  async (req: Request, res: Response) => {
    let { audio, image, duration } = req.body;
    try {
      // generate  a video from an audio and an image
      convertToVideo(audio, image, duration, (videoBase64) => {
        res.json({ success: true, videoBase64 });
      });
    } catch (error) {
      console.log(error);
      res.json({ error: error, success: false }).status(400);
    }
  }
);

async function convertToVideo(audio, image, duration, callback) {
  //  convert audio to video with ffmpeg using image as background
  // audio is a base64 string
  // image is a base64 string
  // duration is the number of seconds of the video
  // callback is a function that will be called with the video base64 string
  let audioBuffer = Buffer.from(audio, "base64");
  let imageBuffer = Buffer.from(image, "base64");
  let audioPath = "./audio.mp3";
  let imagePath = "./image.jpg";
  let videoPath = "./video.mp4";
  fs.writeFileSync(audioPath, audioBuffer);
  fs.writeFileSync(imagePath, imageBuffer);
  ffmpeg()
    .input(audioPath)
    .input(imagePath)
    .outputOptions([
      "-c:v libx264",
      "-c:a aac",
      "-shortest",
      "-vf scale=1280:720",
    ])
    // be sure the image is visible
    .inputOptions(["-loop 1", "-t " + duration])
    // duration of the video is the same as the audio
    .duration(duration)
    .output(videoPath)
    .on("end", function () {
      let videoBuffer = fs.readFileSync(videoPath);
      let videoBase64 = videoBuffer.toString("base64");
      callback(videoBase64);
    })
    .run();
}

router.post(
  "/bot",
  secret,
  key,
  turnstile,
  async (req: Request, res: Response) => {
    let guilds = await getStats();
    res.json({ success: true, guilds });
  }
);

router.post("/top-vote", topgg, async (req: Request, res: Response) => {
  let body = req.body;
  let botId = "1053015370115588147";
  if (body.bot == botId && body.type == "upvote") {
    let userId = body.user;
    console.log(`User ${userId} just voted!`);
    await pub.send(
      {
        exchange: "messages",
        routingKey: "message",
      },
      JSON.stringify({
        id: "vote",
        data: userId,
      })
    );
  }

  res.status(200).json({ success: true });
});

export default router;
