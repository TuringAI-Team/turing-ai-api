import express from "express";
import { Request, Response } from "express";
import turnstile from "../middlewares/captchas/turnstile.js";
import key from "../middlewares/key.js";
import * as ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";

const router = express.Router();

router.post(
  "/mp3-to-mp4",
  key,
  turnstile,
  async (req: Request, res: Response) => {
    let { audio, image } = req.body;
    try {
      // generate  a video from an audio and an image
      convertToVideo(audio, image, (videoBase64) => {
        res.json({ success: true, videoBase64 });
      });
    } catch (error) {
      console.log(error);
      res.json({ error: error, success: false }).status(400);
    }
  }
);

const convertToVideo = async (
  audioBase64: string,
  imageBase64: string,
  callback: (videoBase64: string) => void
) => {
  // Convert base64 audio to a temporary file
  const audioBuffer = Buffer.from(audioBase64, "base64");
  const audioFilePath = "temp_audio.mp3"; // Temporary audio file path
  fs.writeFileSync(audioFilePath, audioBuffer);

  // Convert base64 image to a temporary file
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const imageFilePath = "temp_image.jpg"; // Temporary image file path
  fs.writeFileSync(imageFilePath, imageBuffer);

  // Create the video using ffmpeg
  const outputFilePath = "output.mp4"; // Temporary output video file path
  ffmpeg()
    .input(imageFilePath)
    .input(audioFilePath)
    .output(outputFilePath)
    .on("end", () => {
      // Read the resulting video file and convert it to base64
      const videoBuffer = fs.readFileSync(outputFilePath);
      const videoBase64 = videoBuffer.toString("base64");

      // Cleanup temporary files
      fs.unlinkSync(audioFilePath);
      fs.unlinkSync(imageFilePath);
      fs.unlinkSync(outputFilePath);

      // Invoke the callback with the video base64
      callback(videoBase64);
    })
    .run();
};

export default router;
