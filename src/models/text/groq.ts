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
import Groq from "groq-sdk";

export default {
  data: {
    name: "groq",
    fullName: "GroqCloud models",
    parameters: {
      messages: {
        type: "array",
        required: true,
      },
      model: {
        type: "string",
        required: false,
        default: "mixtral-8x7b-32768",
        options: ["mixtral-8x7b-32768"],
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
    if (!model) model = "mixtral-8x7b-32768";
    if (!max_tokens) max_tokens = 512;
    if (!temperature) temperature = 0.5;
    result.cost += (getChatMessageLength(messages) / 1000) * 0.0001;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    groq.chat.completions
      .create({
        messages: messages,
        model: model,
        max_tokens: max_tokens,
        temperature: temperature,
        stream: true,
      })
      .then(async (stream) => {
        for await (const chunk of stream) {
          result.result += chunk.choices[0]?.delta?.content || "";
          event.emit("data", result);
        }
        result.done = true;
        result.finishReason = "done";
        result.cost += (getPromptLength(result.result) / 1000) * 0.0001;
        event.emit("data", result);
      });

    return event;
  },
};

async function groq(messages, max_tokens, model, result, event, temperature?) {
  let data: any = {
    messages: messages,
    stream: true,
    max_tokens: max_tokens,
    model: model,
  };
  if (temperature) {
    data["temperature"] = temperature;
  }

  let response = await axios({
    method: "post",
    url: "https://api.groq.com/openai/v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      //   stream response
      Accept: "text/event-stream",
    },
    responseType: "stream",
    data: data,
  });
  let stream = response.data;

  stream.on("data", (d) => {
    d = d.toString();
    let dataArr = d.split("\n");
    dataArr = dataArr.filter((x) => x != "");
    for (var data of dataArr) {
      data = data.replace("data: ", "").trim();
      if (data != "[DONE]") {
        data = JSON.parse(data);
        result.result += data.choices[0].delta?.content || "";
        result.finishReason = data.choices[0].finish_reason;
        if (result.finishReason == "stop") {
          result.done = true;
        }
      }
    }

    event.emit("data", result);
  });

  // when the stream emits end you return the result, wait for the stream to end
  await new Promise((resolve) => {
    stream.on("end", () => {
      resolve(result);
    });
  });

  return result;
}
