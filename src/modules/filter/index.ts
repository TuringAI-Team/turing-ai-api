import underagedCebs from "./underagedCelebs.js";
import { OpenAIApi, Configuration } from "openai";

export default async function filter(prompt, model) {
  console.log("Filtering prompt");

  var youngWords = [
    "kid",
    "kids",
    "lolis",
    "loli",
    "children",
    "child",
    "boy",
    "baby",
    "young",
    "younger",
    "teen",
    "teenager",
    "niñita",
    "years",
    "16yo",
    "year old",
    "underage",
    "underaged",
    "under-age",
    "under-aged",
    "juvenile",
    "minor",
    "underaged-minor",
    "youngster",
    "young teen",
    "preteen",
    "pre-teen",
    "infant",
    "toddler",
    "baby",
    "prepubescent",
    "short,",
    "minor-aged",
    "small breasts",
    "young girl",
    "high school",
  ];
  var nsfwModels = ["Hentai Diffusion"];
  var nsfwWords = [
    "naked",
    "nude",
    "uncensored",
    "vagina",
    "dick",
    "tits",
    "boobs",
    "nsfw",
    "dildo",
    "cum",
    "creampied",
    "sex",
    "horny",
    "small breasts",
    "sexy",
    "breasts",
    "butt",
    "small_breasts",
    "breasts",
  ];
  var isNsfw = false;
  var isYoung = false;
  if (nsfwModels.find((x) => x == model)) isNsfw = true;
  if (nsfwWords.some((v) => prompt.toLowerCase().includes(v.toLowerCase())))
    isNsfw = true;
  if (youngWords.some((v) => prompt.toLowerCase().includes(v.toLowerCase())))
    isYoung = true;
  if (underagedCebs.some((v) => prompt.toLowerCase().includes(v.toLowerCase())))
    isYoung = true;
  if (!isYoung) {
    /*  const configuration = new Configuration({
      apiKey: openAIKEY,
    });
    const openai = new OpenAIApi(configuration);
    var result = await openai.createModeration({
      input: prompt,
    });
    isYoung = result.data.results[0].categories["sexual/minors"];*/
  }
  var isCP = false;
  if (isYoung && isNsfw) isCP = true;

  return { isNsfw, isYoung, isCP };
}
