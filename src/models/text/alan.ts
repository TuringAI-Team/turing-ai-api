import axios from "axios";
import {
  getChatMessageLength,
  getPromptLength,
} from "../../utils/tokenizer.js";
import { EventEmitter } from "events";
import supabase from "../../db/supabase.js";
import { getToday } from "../../utils/ms.js";

//MODELS
import dall_e from "../image/dall-e.js";
import music from "../audio/music.js";
import controlnet from "../image/controlnet.js";

import gptNew from "./gpt-new.js";

export default {
  data: {
    name: "alan",
    fullName: "Alan",
    alert: "This model is unfinished and is not working yet.",
    parameters: {
      userName: {
        type: "string",
        required: true,
      },
      messages: {
        type: "array",
        required: true,
      },
      searchEngine: {
        type: "string",
        required: false,
        options: ["google", "none"],
      },
      image: {
        type: "string",
        required: false,
      },
      imageDescription: {
        type: "string",
        required: false,
      },
      imageGenerator: {
        type: "string",
        required: false,
        options: ["sdxl", "kandinsky", "none"],
      },
      nsfw: {
        type: "boolean",
        default: false,
        required: false,
      },
      audioGenerator: {
        type: "string",
        options: ["musicgen"],
        required: false,
      },
      imageModificator: {
        type: "string",
        options: ["controlnet", "none"],
        required: false,
      },
      max_tokens: {
        type: "number",
        default: 250,
        required: false,
      },
    },
  },
  execute: async (data) => {
    let { searchEngine, imageGenerator, imageModificator, userName } = data;
    let plugins = [];
    if (searchEngine == "google") plugins.push("google");
    if (imageGenerator) plugins.push("image");

    return await gptNew.execute({
      messages: [
        {
          role: "system",
          content: `You are an AI named Alan which have been developed by TuringAI (discord.gg/turing). You are running as a discord bot with the id "1053015370115588147", the bot invite link is "https://link.turing.sh/bot".\nYou can view images, execute code and search in internet for real-time information. YOU CAN DISPLAY AND GENERATE IMAGES, VIDEOS AND SONGS.\nConsider the following in your responses:\n- Be conversational\n- Add unicode emoji to be more playful in your responses\n- Current date: ${getToday()}\n- Name of the user talking to: ${userName}`,
        },
        ...data.messages,
      ],
      model: "gpt-3.5-turbo",
      max_tokens: data.max_tokens || 250,
      temperature: 0.7,
      plugins: plugins,
    });
  },
};
