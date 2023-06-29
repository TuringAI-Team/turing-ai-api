import FormData from "form-data";
import { randomUUID } from "crypto";
import axios from "axios";
import fs from "fs";
import { getKey, removeMessage } from "../openai.js";
import { Configuration, OpenAIApi } from "openai";

async function oggToMp3(oggBuffer) {}

export default async function STT(
  ai: "gladia" | "whisper" | "whisper-fast" = "whisper-fast",
  model: string,
  url: string
) {
  if (ai == "gladia") {
    try {
      const form = new FormData();

      form.append("audio_url", url);
      form.append("language_behaviour", "automatic single language");
      form.append("toggle_diarization", "true");
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
      return res;
    } catch (err: any) {
      console.log(err);
      return { error: err };
    }
  }
  if (ai == "whisper-fast") {
    let models = ["tiny", "base", "small", "medium", "large-v1", "large-v2"];
    let modelName = models.includes(model) ? model : "base";
    console.log(url);
    const input = {
      audio: url,
      model: modelName,
      transcription: "plain text",
      translate: false,
      temperature: 0,
      best_of: 5,
      beam_size: 5,
      suppress_tokens: "-1",
      condition_on_previous_text: false,
      temperature_increment_on_fallback: 0.2,
      compression_ratio_threshold: 2.4,
      logprob_threshold: -1,
      no_speech_threshold: 0.6,
    };
    try {
      let response = await axios({
        url: "https://api.runpod.ai/v2/faster-whisper/runsync",
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RUNPOD_KEY}`,
          accept: "application/json",
        },
        data: {
          input,
        },
      });
      return response.data;
    } catch (err: any) {
      console.log(err);
      return { error: err };
    }
  }
  if (ai == "whisper") {
    let models = ["tiny", "base", "small", "medium", "large-v1", "large-v2"];
    let modelName = models.includes(model) ? model : "base";
    try {
      let response = await axios({
        url: "https://api.runpod.ai/v2/whisper/runsync",
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RUNPOD_KEY}`,
          accept: "application/json",
        },
        data: {
          input: {
            audio: url,
            model: modelName,
            transcription: "plain text",
            translate: false,
            temperature: 0,
            best_of: 5,
            beam_size: 5,
            suppress_tokens: "-1",
            condition_on_previous_text: false,
            temperature_increment_on_fallback: 0.2,
            compression_ratio_threshold: 2.4,
            logprob_threshold: -1,
            no_speech_threshold: 0.6,
          },
        },
      });
      return response.data;
    } catch (err: any) {
      console.log(err);
      return { error: err };
    }
  }
}
