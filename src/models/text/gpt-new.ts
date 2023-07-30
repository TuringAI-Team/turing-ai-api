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
      tool: {
        name: null,
        input: null,
        result: null,
        error: null,
      },
      finishReason: null,
    };
    if (!model) model = "gpt-3.5-turbo";
    if (!max_tokens) max_tokens = 512;
    if (!temperature) temperature = 0.9;
    if (!plugins) plugins = null;

    let functions = [];

    for (let i = 0; i < data.plugins.length; i++) {
      let plugin = pluginList.find((p) => p.name === data.plugins[i]);
      if (plugin) {
        functions.push(plugin);
      }
    }
    chatgpt(
      messages,
      max_tokens,
      model,
      result,
      event,
      temperature,
      functions
    ).then(async (x) => {
      result = x;
      event.emit("data", result);
      let j = 0;
      while (!result.done) {
        j++;
        if (result.tool.name) {
          // execute tool

          let pluginInfo = pluginList.find((p) => p.name === result.tool.name);
          if (typeof result.tool.input == "string") {
            result.tool.input = JSON.parse(result.tool.input);
            console.log(
              `result.tool.input ${JSON.stringify(result.tool.input)}`
            );
          }

          if (
            !pluginInfo.parameters.required ||
            (result.tool.input[pluginInfo.parameters.required[0]] &&
              pluginInfo.parameters.required.length > 0) ||
            pluginInfo.parameters.required.length == 0
          ) {
            console.log(`execute ${result.tool.name}`);
            let pluginResponse;
            try {
              pluginResponse = await pluginInfo.function(result.tool.input);
              result.tool.result = pluginResponse;
            } catch (e) {
              console.error(e);
              result.tool.result = `Error: ${e}`;
              result.tool.error = e;
            }
            console.log(`pluginResponse ${JSON.stringify(result.tool.result)}`);
            messages = [
              ...messages,
              {
                role: "function",
                name: result.tool.name,
                content: JSON.stringify(result.tool.result),
              },
            ];
            // execute func
            result = await chatgpt(
              messages,
              max_tokens,
              model,
              result,
              event,
              temperature,
              []
            );
            if (result.finishReason == "stop") {
              result.done = true;
              console.log("stop");
            }
          } else {
            result.done = true;
          }
          event.emit("data", result);
        } else {
          result.done = true;
          event.emit("data", result);
        }
      }
    });
    return event;
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
  if (functions && functions.length > 0) {
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

  stream.on("data", (d) => {
    d = d.toString();
    let dataArr = d.split("\n");
    dataArr = dataArr.filter((x) => x != "");
    for (var data of dataArr) {
      data = data.replace("data: ", "").trim();
      if (data != "[DONE]") {
        data = JSON.parse(data);

        if (data.choices[0].delta.function_call) {
          if (data.choices[0].delta.function_call.name) {
            result.tool.name = data.choices[0].delta.function_call.name;
          }
          result.tool.input +=
            data.choices[0].delta.function_call?.arguments || "";
        } else {
          result.result += data.choices[0].delta?.content || "";
        }
        result.finishReason = data.choices[0].finish_reason;
      } else {
        if (result.tool.name) {
          // removpe null world
          if (typeof result.tool.input == "string") {
            result.tool.input = result.tool.input.replace("null", "");
            console.log(`result.tool.input ${result.tool.input}`);
            result.tool.input = JSON.parse(result.tool.input);
          }
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
