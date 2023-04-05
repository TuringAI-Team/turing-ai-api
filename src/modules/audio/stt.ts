import FormData from "form-data";
import { randomUUID } from "crypto";
import axios from "axios";

export default async function STT(
  ai: "gladia" | "whisper" = "gladia",
  model: string,
  file
) {
  if (ai == "gladia") {
    try {
      console.log(file);
      const form = new FormData();
      form.append("audio_url", file);
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
    } catch (err) {
      console.log(err);
      return { error: err };
    }
  }
}
