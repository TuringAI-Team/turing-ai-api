import { Configuration, OpenAIApi } from "openai";
import googleAPI from "googlethis";
import { EventEmitter } from "events";
import axios from "axios";
import { fetchEventSource } from "@waylaidwanderer/fetch-event-source";
import yts from "yt-search";

export async function pluginsChat(config, plugins) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const event = new EventEmitter();
  const openai = new OpenAIApi(configuration);
  let functions = [];
  let messages = config.messages;
  delete config.messages;
  let result = {
    result: "",
    done: false,
    tool: null,
    credits: 0,
  };

  for (let i = 0; i < plugins.length; i++) {
    let plugin = pluginList.find((p) => p.name === plugins[i]);
    if (plugin) {
      functions.push(plugin);
    }
  }
  event.emit("data", result);
  openai
    .createChatCompletion({
      ...config,
      messages: messages,
      functions: functions,
      function_call: "auto",
    })
    .then(async (completion) => {
      let message = completion.data.choices[0].message;
      let pricePerK = 0.002;
      if (config.model.includes("gpt-4")) pricePerK = 0.05;
      result.credits += (completion.data.usage.total_tokens / 1000) * pricePerK;
      if (message["function_call"]) {
        let functionName = message["function_call"]["name"];
        result.tool = functionName;
        event.emit("data", result);
        let pluginInfo = pluginList.find((p) => p.name === functionName);
        let args = JSON.parse(message["function_call"]["arguments"]);
        if (args[pluginInfo.parameters.required[0]]) {
          console.log(args);
          let pluginResponse = await pluginInfo.function(args);
          let secondCompletation = await openai.createChatCompletion({
            ...config,
            messages: [
              ...messages,
              {
                role: "function",
                name: functionName,
                content: JSON.stringify(pluginResponse),
              },
            ],
          });
          result.credits +=
            (secondCompletation.data.usage.total_tokens / 1000) * pricePerK;
          result.result = secondCompletation.data.choices[0].message.content;
          result.done = true;
          event.emit("data", result);
        }
      } else {
        result.result = message.content;
        result.done = true;
        event.emit("data", result);
      }
    });
  return event;
}

let pluginList = [
  {
    name: "google",
    description:
      "Searches Google to get updated information from internet, based on the user query.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A very descriptive query for google search.",
        },
      },
      required: ["query"],
    },
    function: async (params) => {
      // use google-it
      const options = {
        page: 0,
        safe: false, // Safe Search
        parse_ads: false, // If set to true sponsored results will be parsed
        additional_params: {},
      };

      let response: any = await googleAPI.search(params.query, options);
      //  return first 2 results
      response.results = response.results.slice(0, 4);
      return response;
    },
  },
  {
    name: "youtube-search",
    description:
      "Searches youtube videos to display the most relevant videos based on the user query.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A very descriptive query for youtube search.",
        },
        count: {
          type: "number",
          description: "Number of videos to return. Default is 3",
        },
      },
      required: ["query"],
    },
    function: async (params) => {
      const r = await yts(params.query);
      let videos = r.videos.slice(0, params.count || 3);
      return videos;
    },
  },
  {
    name: "weather",
    description: "Get weather information for a specific location.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Location to get weather information.",
        },
      },
      required: ["location"],
    },
    function: async (params) => {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${params.location}&appid=${process.env.OPEN_WEATHER}`
      );
      return response.data;
    },
  },
  {
    name: "wikipedia",
    description: "Get wikipedia information for a specific topic.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Topic to get wikipedia information.",
        },
      },
      required: ["topic"],
    },
    function: async (params) => {
      const response = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${params.topic}`
      );
      return response.data;
    },
  },
  {
    // more interesting plugins
    name: "url-reader",
    description: "Reads the content of a url and returns the text.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Url to read.",
        },
      },
      required: ["url"],
    },
    function: async (params) => {
      let req = await axios({
        url: "https://greenyroad.com/api/readUrls",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          urls: params.url,
        },
      });
      return req.data;
    },
  },
];
