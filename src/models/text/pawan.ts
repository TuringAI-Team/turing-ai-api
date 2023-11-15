import delay from "delay";
import EventEmitter from "events";
import pluginList from "../../utils/plugins.js";
import {
  getChatMessageLength,
  getPromptLength,
} from "../../utils/tokenizer.js";

import axios from "axios";
import { get } from "http";
import { randomUUID } from "crypto";

export default {
  data: {
    name: "pawan",
    fullName: "Pawan.krd models",
    parameters: {
      messages: {
        type: "array",
        required: true,
      },
      model: {
        type: "string",
        required: false,
        default: "zephyr-7b-beta",
        options: ["zephyr-7b-beta", "pai-001-light-beta"],
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
      autoSystemMessage: {
        type: "boolean",
        required: false,
        default: true,
        description: "Send system messages automatically",
      },
    },
    response: {
      result: {
        type: "string",
        required: true,
      },
      done: {
        type: "boolean",
        required: true,
      },
      cost: {
        type: "number",
        required: true,
      },
      finishReason: {
        type: "string",
        required: true,
      },
      id: {
        type: "string",
        required: true,
        description: "ID of the conversation (used for data saving)",
      },
    },
  },
  execute: async (data) => {
    let event = new EventEmitter();
    let { messages, model, max_tokens, temperature } = data;

    let result: any = {
      result: "",
      done: false,
      cost: 0,
      finishReason: null,
    };
    if (!model) model = "zephyr-7b-beta";
    if (!max_tokens) max_tokens = 512;
    if (!temperature) temperature = 0.9;
    result.cost += (getChatMessageLength(messages) / 1000) * 0.0001;
    pawan(messages, max_tokens, model, result, event, temperature)
      .then(async (x) => {
        result = x;
        result.cost += (getPromptLength(result.result) / 1000) * 0.0001;
        event.emit("data", result);
      })
      .catch((e) => {
        console.log(e);
      });
    return event;
  },
};

async function pawan(messages, max_tokens, model, result, event, temperature?) {
  let data: any = {
    messages: messages,
    stream: true,
    max_tokens: max_tokens,
    //model: model,
  };
  if (temperature) {
    data["temperature"] = temperature;
  }
  if (model == "zephyr-7b-beta") {
    data["model"] = "pai-001-light-beta";
  }
  try {
    async function* chunksToLines(chunksAsync) {
      let previous = "";
      for await (const chunk of chunksAsync) {
        const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        previous += bufferChunk;
        let eolIndex;
        while ((eolIndex = previous.indexOf("\n")) >= 0) {
          const line = previous.slice(0, eolIndex + 1).trimEnd();
          if (line === "data: [DONE]") break;
          if (line.startsWith("data: ")) yield line;
          previous = previous.slice(eolIndex + 1);
        }
      }
    }
    async function* linesToMessages(linesAsync) {
      for await (const line of linesAsync) {
        const message = line.substring("data :".length);
        yield message;
      }
    }
    async function* streamCompletion(data) {
      yield* linesToMessages(chunksToLines(data));
    }
    let response = await axios({
      method: "post",
      url: `https://api.pawan.krd${
        model == "pai-001-light-beta" ? "/pai-001-light-beta" : ""
      }/v1/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PAWAN_API_KEY}`,
        //   stream response
        Accept: "text/event-stream",
      },
      responseType: "stream",
      data: data,
    });
    for await (const message of streamCompletion(response.data)) {
      try {
        const parsed = JSON.parse(message);
        result += parsed.choices[0].delta?.content || "";

        event.emit("data", result);
        if (parsed.choices[0].finish_reason == "stop") {
          result.done = true;
          result.finishReason = "stop";
          break;
        }
        if (parsed.choices[0].finish_reason == "max_tokens") {
          result.done = true;
          result.finishReason = "max_tokens";
          break;
        }
      } catch (error) {
        console.error("Could not JSON parse stream message", message, error);
      }
    }
    return result;
  } catch (e: any) {
    console.log(`error: ${JSON.stringify(e.response)}`);
    return result;
  }
}
