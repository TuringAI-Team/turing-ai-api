import axios from "axios";
import * as googleTTS from "google-tts-api";
import { EventEmitter } from "events";

export default {
  data: {
    name: "tts",
    fullName: "Text to speech",
    parameters: {
      model: {
        type: "string",
        required: true,
        options: ["google", "elevenlabs"],
        default: "google",
      },
      voice: {
        type: "string",
        required: true,
        default: "adam",
        description: "Voice to use (elevenlabs only)",
      },
      text: {
        type: "string",
        required: true,
        description: "Text to convert to speech",
      },
      language: {
        type: "string",
        required: true,
        default: "en",
        description: "Language code to use (google only)",
      },
      slow: {
        type: "boolean",
        required: false,
        default: false,
        description: "Speak slowly (google only)",
      },
      stream: {
        type: "boolean",
        required: false,
        default: false,
      },
    },
  },
  execute: async (data) => {
    let event = new EventEmitter();
    let result = {
      cost: 0,
      base64: "",
      done: false,
    };
    if (data.model == "google") {
      event.emit("data", result);
      let { text, language, slow } = data;
      google(text, language, slow).then((res) => {
        result.base64 = res;
        result.done = true;
        event.emit("data", result);
      });
    } else if (data.model == "elevenlabs") {
      let { text, voice } = data;
      event.emit("data", result);
      elevenlabs(text, voice).then((res) => {
        result.base64 = res.base64;
        result.done = true;
        event.emit("data", result);
      });
    }
    return event;
  },
};

async function elevenlabs(text: string, voice: string) {
  const voices = [
    "adam",
    "antoni",
    "arnold",
    "bella",
    "josh",
    "rachel",
    "domi",
    "elli",
    "sam",
  ];
  if (!voices.includes(voice)) {
    throw new Error("Voice not found");
  }
  let response = await axios({
    url: "https://api.pawan.krd/tts",
    data: {
      text,
      voice,
    },
    responseType: "arraybuffer",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  let base64 = Buffer.from(response.data, "binary").toString("base64");
  return {
    base64: base64,
  };
}
async function google(
  text: string,
  language: string = "en",
  slow: boolean = false
) {
  const results = googleTTS.getAudioBase64(text, {
    lang: language,
    slow: slow,
    host: "https://translate.google.com",
  });
  return results;
}
