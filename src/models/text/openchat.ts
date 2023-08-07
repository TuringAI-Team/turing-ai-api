import delay from "delay";
import EventEmitter from "events";
import pluginList from "../../utils/plugins.js";
import {
  getChatMessageLength,
  getPromptLength,
} from "../../utils/tokenizer.js";

import axios from "axios";
import { get } from "http";

export default {
  data: {
    name: "openchat",
    fullName: "OpenChat models",
    parameters: {
      messages: {
        type: "array",
        required: true,
      },
      model: {
        type: "string",
        required: false,
        default: "openchat_v3.2",
        options: ["openchat_v3.2"],
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
    if (!model) model = "openchat_v3.2";
    if (!max_tokens) max_tokens = 512;
    if (!temperature) temperature = 0.9;
    result.cost += (getChatMessageLength(messages) / 1000) * 0.0001;
    chatgpt(messages, max_tokens, model, result, event, temperature).then(
      async (x) => {
        result = x;
        result.cost += (getPromptLength(result.result) / 1000) * 0.0001;
        event.emit("data", result);
      }
    );
    return event;
  },
};

async function chatgpt(
  messages,
  max_tokens,
  model,
  result,
  event,
  temperature?
) {
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
    url: "https://api.openchat.team/v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENCHAT_API_KEY}`,
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