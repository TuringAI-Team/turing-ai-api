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
import { get } from "http";
import { randomUUID } from "crypto";

let prices = {
  "gpt-3.5-turbo": {
    input: 0.0015,
    output: 0.002,
  },
  "gpt-4": {
    input: 0.03,
    output: 0.06,
  },
  "gpt-3.5-turbo-16k": {
    input: 0.003,
    output: 0.004,
  },
};

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
      tool: {
        type: "object",
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
    let { messages, model, max_tokens, temperature, plugins, id } = data;

    let result: any = {
      result: "",
      done: false,
      cost: 0,
      id: null,
      tool: {
        name: null,
        input: null,
        result: null,
        error: null,
      },
      finishReason: null,
      record: [],
    };
    if (!model) model = "gpt-3.5-turbo";
    if (!max_tokens) max_tokens = 512;
    if (!temperature) temperature = 0.9;
    if (!plugins) plugins = null;
    if (!id) id = randomUUID();
    let functions = [];

    for (let i = 0; i < data.plugins?.length; i++) {
      let plugin = pluginList.find((p) => p.name === data.plugins[i]);
      if (plugin) {
        functions.push(plugin);
      }
    }

    result.cost +=
      (getChatMessageLength(messages) / 1000) * prices[model].input;
    chatgpt(messages, max_tokens, model, result, event, temperature, functions)
      .then(async (x) => {
        result = x;
        if (result.done) {
          result.id = id;
        }
        event.emit("data", result);
        if (result.result) {
          result.cost +=
            (getPromptLength(result.result) / 1000) * prices[model].output;
        }
        let j = 0;
        while (!result.done) {
          j++;
          if (result.tool.name) {
            // execute tool

            let pluginInfo = pluginList.find(
              (p) => p.name === result.tool.name
            );
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
              let pluginResponse;
              try {
                pluginResponse = await pluginInfo.function(result.tool.input);
                result.tool.result = pluginResponse;
              } catch (e) {
                console.error(e);
                result.tool.result = `Error: ${e}`;
                result.tool.error = e;
              }
              result.cost +=
                (getPromptLength(JSON.stringify(result.tool.result)) / 1000) *
                prices[model].input;

              console.log(
                `pluginResponse ${JSON.stringify(result.tool.result)}`
              );
              messages = [
                ...messages,
                {
                  role: "function",
                  name: result.tool.name,
                  content: JSON.stringify(result.tool.result),
                },
              ];

              let fns = [];
              if (pluginInfo.secPlugin) {
                let plugin = pluginList.find(
                  (p) => p.name === pluginInfo.secPlugin
                );
                if (plugin) {
                  fns.push(plugin);
                }
              }

              if (result.tool.name == "diagrams") {
                messages = [
                  ...messages,
                  {
                    role: "system",
                    content:
                      "Do not include the markdown code block (```) in your message just include the url of the rendered diagram.",
                  },
                ];
              }
              // execute func
              result = await chatgpt(
                messages,
                max_tokens,
                model,
                result,
                event,
                temperature,
                fns
              );
              if (result.result) {
                result.cost +=
                  (getPromptLength(result.result) / 1000) *
                  prices[model].output;
              }
              if (result.finishReason == "stop") {
                result.done = true;
                result.id = id;
                console.log("done1");
              }
            } else {
              result.done = true;
              result.id = id;
              console.log("done2");
            }

            event.emit("data", result);
          } else {
            result.done = true;
            result.id = id;
            event.emit("data", result);
          }
        }
      })
      .catch((e) => {
        console.log(e);
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
  result.tool.input = "";
  result.record = [
    ...result.record,
    {
      type: "gpt_input",
      data: data,
    },
  ];
  let lastOutput;
  await fetchEventSource("https://api.openai.com/v1/chat/completions", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(data),
    onopen: async (response) => {},
    onmessage: (msg) => {
      let d: any = msg.data;
      d = d.toString();
      let dataArr = d.split("\n\n");
      dataArr = dataArr.filter((x) => x != "");
      for (var data of dataArr) {
        data = data.replace("data: ", "").trim();
        if (data != "[DONE]") {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.log(d);
            console.log(e);
          }
          if (data.choices) {
            lastOutput = data;
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
          }
        } else {
          if (lastOutput.choices[0].delta?.content) {
            lastOutput.choices[0].delta.content = result.result;
          }
          if (lastOutput.choices[0].delta.function_call?.arguments) {
            lastOutput.choices[0].delta.function_call.arguments =
              result.tool.input;
          }
          result.record = [
            ...result.record,
            {
              type: "gpt_output",
              data: {
                ...lastOutput,
              },
            },
          ];
          if (result.tool.name && result.tool.input != "") {
            // removpe null world
            if (typeof result.tool.input == "string") {
              result.tool.input = result.tool.input.replace("null", "");
              console.log(`result.tool.input ${result.tool.input}`);
              try {
                result.tool.input = JSON.parse(result.tool.input);
              } catch (e) {
                console.log(e);
              }
            }
          }
          if (result.finishReason == "stop") {
            result.done = true;
          }
        }
      }

      event.emit("data", result);
    },
  });

  // when the stream emits end you return the result, wait for the stream to end
  /*await new Promise((resolve) => {
    stream.on("end", () => {
      resolve(result);
    });
  })*/

  return result;
}
