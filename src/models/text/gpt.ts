import axios from "axios";
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

export default {
  data: {
    name: "gpt",
    fullName: "OpenAI Models",
    parameters: {
      messages: {
        type: "array",
        required: true,
      },
      model: {
        type: "string",
        required: true,
        options: ["gpt-3.5-turbo", "gpt-4"],
      },
      max_tokens: {
        type: "number",
        required: false,
      },
      temperature: {
        type: "number",
        required: false,
      },
      plugins: {
        type: "array",
        required: false,
      },
      pw: {
        type: "boolean",
        required: false,
      },
      stream: {
        type: "boolean",
        required: false,
      },
    },
  },
  execute: async (data) => {
    let { messages, model, max_tokens, temperature, plugins, pw, stream } =
      data;
    if (stream == true) {
      return await streams(data);
    } else {
      return await rest(data);
    }
  },
};

async function streams(data) {
  let { messages, model, max_tokens, temperature, plugins, pw, stream } = data;
  const event = new EventEmitter();
  console.log(data.plugins);
  if (data.plugins && data.plugins.length > 0) {
    let functions = [];
    let messages = data.messages;
    delete data.messages;
    let result = {
      result: "",
      done: false,
      tool: null,
      credits: 0,
      error: null,
    };

    for (let i = 0; i < data.plugins.length; i++) {
      let plugin = pluginList.find((p) => p.name === data.plugins[i]);
      if (plugin) {
        functions.push(plugin);
      }
    }
    console.log(`${functions}`);
    if (data.model == "gpt-3.5-turbo") {
      data.model = "gpt-3.5-turbo-0613";
    }
    event.emit("data", result);
    openai
      .createChatCompletion({
        temperature: data.temperature || 0.9,
        max_tokens: data.max_tokens || 150,
        model: data.model,
        messages: messages,
        functions: functions,
        function_call: "auto",
      })
      .then(async (completion) => {
        let message = completion.data.choices[0].message;
        let pricePerK = 0.002;
        console.log(`model ${data.model} ${message}`);
        if (data.model.includes("gpt-4")) pricePerK = 0.05;
        result.credits +=
          (completion.data.usage.total_tokens / 1000) * pricePerK;
        if (message["function_call"]) {
          let functionName = message["function_call"]["name"];
          result.tool = functionName;
          event.emit("data", result);
          let pluginInfo = pluginList.find((p) => p.name === functionName);
          let args = JSON.parse(message["function_call"]["arguments"]);
          if (
            !pluginInfo.parameters.required ||
            (args[pluginInfo.parameters.required[0]] &&
              pluginInfo.parameters.required.length > 0) ||
            pluginInfo.parameters.required.length == 0
          ) {
            console.log(`args ${JSON.stringify(args)}`);
            let pluginResponse;
            try {
              pluginResponse = await pluginInfo.function(args);
            } catch (e) {
              console.error(e);
              pluginResponse = `Error: ${e}`;
            }
            console.log(`pluginResponse ${JSON.stringify(pluginResponse)}`);
            let body = {
              temperature: data.temperature || 0.9,
              max_tokens: data.max_tokens || 150,
              model: data.model,
              messages: [
                ...messages,
                {
                  role: "function",
                  name: functionName,
                  content: JSON.stringify(pluginResponse),
                },
              ],
              stream: true,
            };
            await fetchEventSource(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify(body),
                onmessage: async (ev) => {
                  let data: any = ev.data;
                  if (data == "[DONE]") {
                    result.done = true;
                    result.credits +=
                      (getPromptLength(result.result) / 1000) * pricePerK;
                    result.credits +=
                      (getChatMessageLength(messages) / 1000) * pricePerK;
                    event.emit("data", result);
                  } else {
                    data = JSON.parse(data);
                    if (data.choices[0].delta.content) {
                      result.result += data.choices[0].delta.content;
                    }
                    event.emit("data", result);
                  }
                },
              }
            );
          }
        } else {
          result.result = message.content;
          result.done = true;
          event.emit("data", result);
        }
      })
      .catch((err) => {
        result.done = true;
        result.error = `Error: ${err}`;
        event.emit("data", result);
      });
    return event;
  } else {
    let key = process.env.OPENAI_API_KEY;
    let response = await axios({
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      responseType: "stream",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },

      data: {
        model: model,
        max_tokens: max_tokens,
        messages: messages,
        temperature: temperature,
        stream: true,
      },
    });

    let result = {
      result: "",
      done: false,
      credits: 0,
    };

    let stream = response.data;
    let tokensSent = 0;
    stream.on("data", (chunk) => {
      let content = chunk.toString();

      if (content == "[DONE]") {
        let tokens = getPromptLength(result.result);
        let pricePerK = 0.002;
        if (model.includes("gpt-4")) pricePerK = 0.05;
        result.credits += (tokens / 1000) * pricePerK;
        result.done = true;
        event.emit("data", result);
      } else {
        tokensSent++;
        content = JSON.parse(content);
        let text = content.choices[0].delta.content;
        result.result += text;
        if (tokensSent >= 30) {
          event.emit("data", result);
          tokensSent = 0;
        }
      }
    });
    return event;
  }
}
async function rest(data) {
  let { messages, model, max_tokens, temperature, plugins, pw, stream } = data;
  if (data.plugins && data.plugins.length > 0) {
    let functions = [];
    let messages = data.messages;
    delete data.messages;
    let result = {
      result: "",
      done: false,
      tool: null,
      credits: 0,
      error: null,
    };

    for (let i = 0; i < data.plugins.length; i++) {
      let plugin = pluginList.find((p) => p.name === data.plugins[i]);
      if (plugin) {
        functions.push(plugin);
      }
    }
    if (data.model == "gpt-3.5-turbo") {
      data.model = "gpt-3.5-turbo-0613";
    }
    const completion = await openai.createChatCompletion({
      temperature: data.temperature || 0.9,
      max_tokens: data.max_tokens || 150,
      model: data.model,
      messages: messages,
      functions: functions,
      function_call: "auto",
    });
    let message = completion.data.choices[0].message;
    let pricePerK = 0.002;
    if (data.model.includes("gpt-4")) pricePerK = 0.05;
    result.credits += (completion.data.usage.total_tokens / 1000) * pricePerK;
    if (message["function_call"]) {
      let functionName = message["function_call"]["name"];
      result.tool = functionName;
      let pluginInfo = pluginList.find((p) => p.name === functionName);
      let args = JSON.parse(message["function_call"]["arguments"]);
      if (
        !pluginInfo.parameters.required ||
        (args[pluginInfo.parameters.required[0]] &&
          pluginInfo.parameters.required.length > 0) ||
        pluginInfo.parameters.required.length == 0
      ) {
        console.log(`args ${JSON.stringify(args)}`);
        let pluginResponse;
        try {
          pluginResponse = await pluginInfo.function(args);
        } catch (e) {
          console.error(e);
          pluginResponse = `Error: ${e}`;
        }
        console.log(`pluginResponse ${JSON.stringify(pluginResponse)}`);
        let body = {
          temperature: data.temperature || 0.9,
          max_tokens: data.max_tokens || 150,
          model: data.model,
          messages: [
            ...messages,
            {
              role: "function",
              name: functionName,
              content: JSON.stringify(pluginResponse),
            },
          ],
          stream: true,
        };
        let completion2 = await axios({
          url: "https://api.openai.com/v1/chat/completions",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          data: JSON.stringify(body),
        });
        let message2 = completion2.data.choices[0].message;
        let pricePerK = 0.002;
        if (data.model.includes("gpt-4")) pricePerK = 0.05;
        result.credits +=
          (completion2.data.usage.total_tokens / 1000) * pricePerK;
        result.result = message2.content;
      }
    } else {
      result.result = message.content;
    }

    return result;
  } else {
    let response;
    let key = process.env.PAWAN_API_KEY;
    pw = false;
    if (!pw) {
      key = process.env.OPENAI_API_KEY;
    }
    try {
      response = await axios({
        url: pw
          ? "https://api.pawan.krd/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },

        data: {
          model: model,
          max_tokens: max_tokens,
          messages: messages,
          temperature: temperature,
        },
      });
    } catch (error: any) {
      console.log(`data: ${JSON.stringify(error.response.data)}`);
      console.log(`${error}, retrying with openai`);
      key = process.env.OPENAI_API_KEY;
      response = await axios({
        url: "https://api.openai.com/v1/chat/completions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },

        data: {
          model: model,
          max_tokens: max_tokens,
          messages: messages,
          temperature: temperature,
        },
      });
      if (response.status == 200) {
        console.log("success with openai");
      }
    }
    return response.data;
  }
}
