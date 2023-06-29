import axios from "axios";
import { Configuration, OpenAIApi } from "openai";
import { nsfwWords, underagedCebs, youngWords } from "../../utils/keywords.js";
const availableFilters = ["nsfw", "cp", "toxicity"];

export default {
  data: {
    name: "filter",
    parameters: {
      text: {
        type: "string",
        required: true,
      },
      filters: {
        type: "array",
        required: true,
      },
    },
  },
  execute: async (data) => {
    let { text, filters }: { text: string; filters: string[] } = data;
    filters = filters.filter((f) => availableFilters.includes(f));
    if (filters.length === 0) {
      throw new Error("No valid filters provided");
    }
    let result = {
      isNsfw: false,
      isYouth: false,
      isCP: false,
      isToxic: false,
    };
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_KEY,
    });
    const openai = new OpenAIApi(configuration);
    var res = await openai.createModeration({
      input: text,
    });
    if (filters.find((f) => f === "nsfw")) {
      let isNsfw = false;

      if (
        res.data.results[0].categories["sexual"] ||
        res.data.results[0].categories["sexual/minors"]
      ) {
        isNsfw = true;
      }
      if (!isNsfw) {
        if (nsfwWords.some((v) => text.toLowerCase().includes(v.toLowerCase())))
          isNsfw = true;
      }
      result.isNsfw = isNsfw;
    } else if (filters.find((f) => f === "cp")) {
      let isNsfw = false;
      let isYouth = false;
      let isCP = false;
      if (res.data.results[0].categories["sexual"]) {
        isNsfw = true;
      }

      if (res.data.results[0].categories["sexual/minors"]) {
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
      result.isNsfw = isNsfw;
      result.isYouth = isYouth;
      result.isCP = isCP;
    } else if (filters.find((f) => f === "toxicity")) {
      let isToxic = false;
      if (
        res.data.results[0].categories["hate"] ||
        res.data.results[0].categories["harrassment"] ||
        res.data.results[0].categories["self-harm"] ||
        res.data.results[0].categories["violence"]
      ) {
        isToxic = true;
      }
      result.isToxic = isToxic;
    }
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
