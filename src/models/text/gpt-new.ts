import delay from "delay";
import EventEmitter from "events";
import { Configuration, OpenAIApi } from "openai";
import pluginList from "../../utils/plugins.js";
import {
  getChatMessageLength,
  getPromptLength,
} from "../../utils/tokenizer.js";
import { fetchEventSource } from "@waylaidwanderer/fetch-event-source";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
import axios from "axios";

export default {
  data: {
    name: "gpt-new",
    fullName: "OpenAI models",
    parameters: {
      messages: {
        type: "array",
        required: true,
      },
      model: {
        type: "string",
        required: true,
        options: ["gpt-3.5-turbo", "gpt-4", "gpt-3.5-turbo-16k"],
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
      plugins: {
        type: "array",
        required: false,
        default: [],
        options: pluginList.map((p) => p.name),
      },
    },
  },
  execute: async (data) => {
    let event = new EventEmitter();
    let { messages, model, max_tokens, temperature, plugins } = data;

    let result: any = {
      result: "",
      done: false,
      cost: 0,
      tool: null,
      toolInput: null,
      finishReason: null,
    };
    result = await chatgpt(
      messages,
      max_tokens,
      model,
      result,
      event,
      temperature,
      plugins
    );

    if (result.tool) {
      // execute tool

      let pluginInfo = pluginList.find((p) => p.name === result.tool);
      let args = JSON.parse(result.toolInput);
      if (
        !pluginInfo.parameters.required ||
        (args[pluginInfo.parameters.required[0]] &&
          pluginInfo.parameters.required.length > 0) ||
        pluginInfo.parameters.required.length == 0
      ) {
        console.log(`args ${JSON.stringify(args)}`);
        result.toolInput = args;
        let pluginResponse;
        try {
          pluginResponse = await pluginInfo.function(args);
        } catch (e) {
          console.error(e);
          pluginResponse = `Error: ${e}`;
        }
        result.toolResult = pluginResponse;
        console.log(`pluginResponse ${JSON.stringify(pluginResponse)}`);
      }
    }

    return result;
  },
};

async function chatgpt(
  messages,
  max_tokens,
  model,
  result,
  event,
  temperature?,
  functions?
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
  if (functions) {
    data["functions"] = functions;
  }
  let response = await axios({
    method: "post",
    url: "https://api.openai.com/v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      //   stream response
      Accept: "text/event-stream",
    },
    responseType: "stream",
    data: data,
  });
  let stream = response.data;

  stream.on("data", (data) => {
    console.log(data);
  });

  // when the stream emits end you return the result, wait for the stream to end
  await new Promise((resolve) => {
    stream.on("end", () => {
      resolve(result);
    });
  });
  return result;
}
