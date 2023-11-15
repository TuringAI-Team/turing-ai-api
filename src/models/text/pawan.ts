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

    const newMessages = [
      {
        role: "system",
        text: "You are an a helpful assistant called Zephyr, your task is answering user questions. You are being exceuted inside a discord bot and your model have been created by HuggingFace. Be concise with your answers, unless the user ask for more content or the question requires to write a text.",
      },
      ...messages,
    ];
    pawan(newMessages, max_tokens, model, result, event, temperature)
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
  } catch (e: any) {
    let errorResponseStr = "";

    for await (const message of e.response.data) {
      errorResponseStr += message;
    }

    console.log(errorResponseStr);
  }
}
