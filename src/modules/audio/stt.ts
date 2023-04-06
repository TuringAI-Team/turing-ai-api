import FormData from "form-data";
import { randomUUID } from "crypto";
import axios from "axios";
import fs from "fs";
import { getKey, removeMessage } from "../openai.js";
import { Configuration, OpenAIApi } from "openai";

async function oggToMp3(oggBuffer) {}

export default async function STT(
  ai: "gladia" | "whisper" = "gladia",
  model: string,
  file
) {
  if (ai == "gladia") {
    try {
      const form = new FormData();
      // file is data:audio/ogg; codecs=opus;base64,T2dnUwACAAAAAAAAAAD+////AgAAAP////8AAAAA
      // modify it so is a base64 url
      file = file.replace("data:audio/mp3; codecs=opus;base64,", "");
      // base64 to buffer
      let buff = Buffer.from(file, "base64");
      // ogg to mp3
      fs.writeFileSync("audio.mp3", buff);
      form.append("audio", buff, "audio.mp3;audio/mpeg");
      form.append("language_behaviour", "automatic single language");
      const response = await axios.post(
        "https://api.gladia.io/audio/text/audio-transcription/",
        form,
        {
          params: {
            model: "large-v2",
          },
          headers: {
            ...form.getHeaders(),
            accept: "application/json",
            "x-gladia-key": process.env.GLADIA_API_KEY,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      var res = response.data;
      console.log(res);
      var transcription = "";
      for (var i = 0; i < res.prediction.length; i++) {
        var tr = res.prediction[i];
        transcription += `${tr.transcription} `;
      }
      console.log(transcription);
      return transcription;
    } catch (err: any) {
      console.log(err);
      return { error: err };
    }
  }
  if (ai == "whisper") {
    let acc = await getKey();
    if (!acc) {
      return {
        error: "We are at maximum capacity, please try again later.",
      };
    }
    let key = acc.key;
    file = file.replace("data:audio/mp3; codecs=opus;base64,", "");
    // base64 to buffer
    let buff: any = Buffer.from(file, "base64");
    let filePath = `./temp/${randomUUID()}.mp3`;
    fs.writeFileSync(filePath, buff);
    try {
      const configuration = new Configuration({
        apiKey: key,
      });

      const openai = new OpenAIApi(configuration);
      let stream: any = fs.createReadStream(filePath);
      let resp = await openai.createTranscription(stream, "whisper-1");
      // delete file
      await fs.unlinkSync(filePath);
      await removeMessage(acc.id);

      return { text: resp.data.text };
    } catch (err: any) {
      await fs.unlinkSync(filePath);

      console.log(err.data);
      return {
        error: err.message,
      };
    }
  }
}
