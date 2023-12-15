import axios from "axios";
import {
  getChatMessageLength,
  getPromptLength,
} from "../../utils/tokenizer.js";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import {
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from "@google-cloud/vertexai";
import delay from "delay";
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID,
  location: "us-central1",
});

export default {
  data: {
    name: "google",
    fullName: "Google Models",
    parameters: {
      messages: {
        type: "array",
        required: true,
      },

      model: {
        type: "string",
        required: false,
        options: ["gemini-pro", "gemini-pro-vision"],
        default: "gemini-pro",
      },
      max_tokens: {
        type: "number",
        required: false,
        default: 512,
      },
      temperature: {
        type: "number",
        required: false,
        default: 0.9,
      },
      id: {
        type: "string",
        required: false,
        default: randomUUID(),
        description: "ID of the conversation (used for data saving)",
      },
    },
    response: {
      cost: {
        type: "number",
        description: "Cost of the request in USD",
      },
      result: {
        type: "string",
        description: "Result of the request",
      },
      done: {
        type: "boolean",
        description: "Whether the request is done or not",
      },
      id: {
        type: "string",
        description: "ID of the conversation (used for data saving)",
      },
    },
  },
  execute: async (data) => {
    let { messages, model, max_tokens, temperature, id } = data;
    if (!model) {
      model = "gemini-pro";
    }
    let event = new EventEmitter();
    let res: any = {
      cost: 0,
      done: false,
      result: "",
      record: null,
      id: id || randomUUID(),
    };
    // get message that is message.role == "system"
    let message = messages.find((message) => message.role == "system");
    messages = messages.map((message) => {
      if (message.role != "system") {
        return {
          content: message.content,
          author: message.role == "user" ? "user" : "bot",
        };
      }
    });
    // filter messages that are not null
    messages = messages.filter((message) => message != null);
    const generativeModel = vertexAI.preview.getGenerativeModel({
      model: model,
      // The following parameters are optional
      // They can also be passed to individual content generation requests
      safety_settings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      generation_config: { max_output_tokens: max_tokens },
    });

    event.emit("data", res);
    res.record = {
      input: {
        instances: [
          {
            context: message
              ? message.content
              : "You are PaLM 2 a AI chatbot created by Google.",
            messages: messages,
            examples: [],
          },
        ],
        parameters: {
          temperature: temperature || 0.2,
          maxOutputTokens: max_tokens || 250,
          topP: 0.8,
          topK: 40,
        },
      },
    };

    const request = {
      contents: messages.map((message) => {
        return {
          role: message.author == "user" ? "user" : "model",
          parts: [{ text: message.content }],
        };
      }),
    };
    let promptLength = 0;
    generativeModel
      .generateContentStream(request)
      .then(async (streamingResp) => {
        const cost = 0;
        let resultLength = 0;
        for await (const item of streamingResp.stream) {
          res.result = item.candidates[0]?.content?.parts[0]?.text || "";
          resultLength = item.usageMetadata?.candidates_token_count || 0;
          promptLength = item.usageMetadata?.prompt_token_count || 0;
          event.emit("data", res);
        }
        res.cost += (promptLength / 1000) * 0.0001;
        res.cost += (resultLength / 1000) * 0.0002;
        res.done = true;
        res.record = {
          ...res.record,
          output: res.result,
          cost: cost,
          promtLength: promptLength,
          resultLength: resultLength,
        };
        res = {
          ...res,
        };
        event.emit("data", res);
      });
    return event;
  },
};
