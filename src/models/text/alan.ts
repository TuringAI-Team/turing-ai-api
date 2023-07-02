import { Configuration, OpenAIApi } from "openai";
import axios from "axios";
import {
  getChatMessageLength,
  getPromptLength,
} from "../../utils/tokenizer.js";
import { fetchEventSource } from "@waylaidwanderer/fetch-event-source";
import { EventEmitter } from "events";
import googleAPI from "googlethis";
import supabase from "../../db/supabase.js";
import { getToday } from "../../utils/ms.js";

//MODELS
import kandinsky from "../image/kandinsky.js";
import dall_e from "../image/dall-e.js";
import sdxl from "../image/sdxl.js";
import music from "../audio/music.js";
import controlnet from "../image/controlnet.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default {
  data: {
    name: "alan",
    fullName: "Alan",
    parameters: {
      userName: {
        type: "string",
        required: true,
      },
      conversationId: {
        type: "string",
        required: true,
      },
      message: {
        type: "string",
        required: true,
      },
      searchEngine: {
        type: "string",
        required: false,
        options: ["google", "none"],
      },
      photo: {
        type: "string",
        required: false,
      },
      photoDescription: {
        type: "string",
        required: false,
      },
      imageGenerator: {
        type: "string",
        required: false,
        options: ["sdxl", "kandinsky", "dall-e", "none"],
      },
      nsfwFilter: {
        type: "boolean",
        required: false,
      },
      videoGenerator: {
        type: "string",
        required: false,
      },
      audioGenerator: {
        type: "string",
        required: false,
      },
      imageModificator: {
        type: "string",
        required: false,
      },
      max_tokens: {
        type: "number",
        required: false,
      },
    },
  },
  execute: async (data) => {
    let {
      searchEngine,
      imageGenerator,
      imageModificator,
      audioGenerator,
      videoGenerator,
    } = data;
    const event = new EventEmitter();
    let functions = [];
    const conversation = await getAlanConversation(
      data.conversationId,
      `alan-chatgpt`
    );
    let preivousMessages = conversation.slice(
      Math.max(conversation.length - 6, 0)
    );
    preivousMessages = preivousMessages.map((x) => {
      return {
        content: x.message,
        role: x.role,
      };
    });
    let messages: any = [];
    const instructions = `You are an AI named Alan which have been developed by TuringAI with GPT-3.5 model that was developed by OpenAI.\nYou can view images, search in internet for real-time information, DISPLAY AND GENERATE IMAGES, VIDEOS AND SONGS.\n\nContext for your conversation: - Current date: ${getToday()}\n- Name of the user talking to: ${
      data.userName
    }\n- TuringAI discord server: https://discord.gg/turing\n- TuringAI website: https://turingai.sh\n\nConsider the following in your responses:\n- Be conversational\n- Add unicode emoji to be more playful in your responses\n- Write spoilers using spoiler tags. For example ||At the end of The Sixth Sense it is revealed that he is dead||.\n- You respond helpfully if people have technical or knowledge-based questions, or if you used a tool. But don't refer to yourself as an assistant, and don't ask how you can help.`;
    messages.push({
      role: "system",
      content: instructions,
    });
    // push previous messages
    messages.push(...preivousMessages);
    let result = {
      result: "",
      done: false,
      tool: null,
      credits: 0,
      error: null,
      generations: null,
    };

    data.model = "gpt-3.5-turbo-0613";
    event.emit("data", result);
    if (searchEngine || searchEngine != "none") {
      functions.push(pluginList.find((p) => p.name === "search"));
    }
    if (imageGenerator || imageGenerator != "none") {
      functions.push(pluginList.find((p) => p.name === "image-gen"));
    }

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
            if (pluginInfo.name == "search") {
              args["engine"] = searchEngine;
            }
            if (pluginInfo.name == "image-gen") {
              args["generator"] = imageGenerator;
            }
            args["event"] = event;
            console.log(`args ${JSON.stringify(args)}`);
            let pluginResponse;
            try {
              pluginResponse = await pluginInfo.function(args);
              if (pluginInfo.name == "search") {
                result.generations = pluginResponse.generations;
                result.tool = null;
              }
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
                  content:
                    pluginInfo.name == "search"
                      ? JSON.stringify(pluginResponse)
                      : pluginResponse.message,
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
  },
};

const pluginList = [
  {
    name: "search",
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
      if (params.engine == "google") {
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
      }
    },
  },
  {
    name: "image-gen",
    description:
      "Generates images based on the user query. It uses AI to generate images.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "Image generation prompt with fitting & descriptive keywords, using booru tagging. Separate by ','",
        },
      },
      required: ["prompt"],
    },
    function: async (params) => {
      let returnObj = {
        message: "",
        generations: [],
      };
      if (params.generator == "kandinsky") {
      }
    },
  },
];

export async function getAlanConversation(id, model): Promise<any> {
  id = `${id}-alan`;
  var { data } = await supabase
    .from("conversations_new")
    .select("*")
    .eq("id", id)
    .eq("tone", model);
  if (data && data[0]) {
    if (!data[0].history) return [];
    return data[0].history;
  }
  return [];
}
export async function saveAlan(model, input, output, fulloutput, id) {
  model = `alan-${model}`;
  id = `${id}-alan`;
  let { data: conversation } = await supabase
    .from("conversations_new")
    .select("*")
    .eq("id", id)
    .eq("tone", model)
    .eq("model", "alan");

  let newInput = {
    role: "user",
    message: input.message,
    userName: input.userName,
    settings: {
      imageGenerator: input.settings.imageGenerator,
      videoGenerator: input.settings.videoGenerator,
      pluginList: input.settings.pluginList,
      audioGenerator: input.settings.audioGenerator,
      imageModificator: input.settings.imageModificator,
      nsfwFilter: input.settings.nsfwFilter,
      searchEngine: input.settings.searchEngine,
    },
    photo: input.photo,
    photoDescription: input.photoDescription,
  };
  let newOutput = {
    role: "assistant",
    message: output.message,
    search: {
      queries: output.search.queries,
      results: output.search.results,
    },
    multimedia: {
      audio: output.multimedia.audio,
      video: output.multimedia.video,
      image: output.multimedia.image,
      modifiedImage: output.multimedia.modifiedImage,
    },
    fullOutput: fulloutput,
    credits: output.credits,
  };
  if (!conversation || !conversation[0]) {
    let { error } = await supabase.from("conversations_new").insert({
      id: id,
      tone: model,
      history: [newInput, newOutput],
      model: "alan",
    });
    console.log(error);
  } else {
    let previous = conversation[0].history;
    if (previous) {
      previous.push(newInput);
      previous.push(newOutput);
    }
    let { error } = await supabase
      .from("conversations_new")
      .update({
        history: previous,
      })
      .eq("id", id)
      .eq("tone", model)
      .eq("model", "alan");
    console.log(error);
  }
  return;
}
