import axios from "axios";
import * as googleTTS from "google-tts-api";

export default {
  data: {
    name: "vision",
    fullName: "Image vision",
    parameters: {
      model: {
        type: "array",
        required: true,
        options: ["blip2", "ocr"],
        default: "blip2",
      },
      image: {
        type: "string",
        required: true,
        description: "Image URL",
      },
    },
  },
  execute: async (data) => {},
};
