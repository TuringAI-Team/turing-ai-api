import axios from "axios";
import { Configuration, OpenAIApi } from "openai";
import { nsfwWords, underagedCebs, youngWords } from "../../utils/keywords.js";
import { EventEmitter } from "events";

const availableFilters = ["nsfw", "cp", "toxicity"];
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
export default {
  data: {
    name: "filter",
    fullName: "Text Filter",
    parameters: {
      text: {
        type: "string",
        required: true,
        description: "Text you want to filter",
      },
      filters: {
        type: "array",
        required: true,
        options: availableFilters,
        description: "Filters you want to apply",
      },
      stream: {
        type: "boolean",
        required: false,
        default: false,
      },
    },
    response: {
      nsfw: {
        type: "boolean",
        description: "Whether the text is nsfw or not",
      },
      youth: {
        type: "boolean",
        description: "Whether the text is youth or not",
      },
      cp: {
        type: "boolean",
        description: "Whether the text is cp or not",
      },
      toxic: {
        type: "boolean",
        description: "Whether the text is toxic or not",
      },
      done: {
        type: "boolean",
        description: "Whether the request is done or not",
      },
    },
  },
  execute: async (data) => {
    let { text, filters }: { text: string; filters: string[] } = data;
    filters = filters.filter((f) => availableFilters.includes(f));
    if (filters.length === 0) {
      throw new Error("No valid filters provided");
    }
    let event = new EventEmitter();
    let result = {
      nsfw: false,
      youth: false,
      cp: false,
      toxic: false,
      done: false,
    };
    event.emit("data", result);
    var res;
    try {
      res = await openai.createModeration({
        input: text,
      });
    } catch (e: any) {
      console.log(e.response.data);
      res = {};
    }
    if (filters.find((f) => f === "nsfw")) {
      let isNsfw = false;

      if (
        res?.data?.results[0].categories["sexual"] ||
        res?.data?.results[0].categories["sexual/minors"]
      ) {
        isNsfw = true;
      }
      if (!isNsfw) {
        if (nsfwWords.some((v) => text.toLowerCase().includes(v.toLowerCase())))
          isNsfw = true;
      }
      result.nsfw = isNsfw;
    } else if (filters.find((f) => f === "cp")) {
      let isNsfw = false;
      let isYouth = false;
      let isCP = false;
      if (res?.data?.results[0].categories["sexual"]) {
        isNsfw = true;
      }

      if (res?.data?.results[0].categories["sexual/minors"]) {
        isYouth = true;
        isCP = true;
      }
      if (!isNsfw) {
        if (nsfwWords.some((v) => text.toLowerCase().includes(v.toLowerCase())))
          isNsfw = true;
      }
      if (!isYouth) {
        if (checkYouth(text)) isYouth = true;
      }
      if (!isCP) {
        if (isNsfw && isYouth) isCP = true;
      }
      result.nsfw = isNsfw;
      result.youth = isYouth;
      result.cp = isCP;
    } else if (filters.find((f) => f === "toxicity")) {
      let isToxic = false;
      if (
        res?.data?.results[0].categories["hate"] ||
        res?.data?.results[0].categories["harrassment"] ||
        res?.data?.results[0].categories["self-harm"] ||
        res?.data?.results[0].categories["violence"]
      ) {
        isToxic = true;
      }
      result.toxic = isToxic;
    }
    result.done = true;
    setTimeout(() => {
      event.emit("data", result);
    }, 1000);
    return event;
  },
};

function checkYouth(text: string) {
  let isYouth = false;
  if (youngWords.some((v) => text.toLowerCase().includes(v.toLowerCase())))
    isYouth = true;
  if (underagedCebs.some((v) => text.toLowerCase().includes(v.toLowerCase())))
    isYouth = true;
  return isYouth;
}
