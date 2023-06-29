import axios from "axios";
import * as googleTTS from "google-tts-api";

export default {
  data: {
    name: "tts",
    parameters: {
      model: {
        type: "string",
        required: true,
        options: ["google", "elevenlabs"],
      },
      voice: {
        type: "string",
        required: true,
      },
      text: {
        type: "string",
        required: true,
      },
      language: {
        type: "string",
        required: true,
      },
      slow: {
        type: "boolean",
        required: false,
      },
    },
  },
  execute: async (data) => {
    if (data.model == "google") {
      let { text, language, slow } = data;
      let result = await google(text, language, slow);
      return result;
    } else if (data.model == "elevenlabs") {
      let { text, voice } = data;
      let result = await elevenlabs(text, voice);
      return result;
    }
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
  return response.data;
}
async function google(
  text: string,
  language: string = "en",
  slow: boolean = false
) {
  const results = googleTTS.getAllAudioUrls(text, {
    lang: language,
    slow: slow,
    host: "https://translate.google.com",
    splitPunct: ",.?",
  });
  return results;
}
