import { getKey, removeMessage } from "../openai.js";
import getInstruction from "./instructions.js";
import { Configuration, OpenAIApi } from "openai";
import { getMessages, saveMsg } from "./index.js";
import googleAPI from "googlethis";
import axios from "axios";
import { predict } from "replicate-api";
import generateImgD from "../image/dall-e.js";
import delay from "delay";
import { generateImg, checkGeneration } from "../image/stablehorde.js";

export default async function Alan(
  userName: string = "Anonymous",
  conversation,
  message: string,
  conversationId: string,
  model: string = "chatgpt",
  searchEngine: string = "google",
  photo?: string,
  imageGenerator?: string
) {
  var imageDescription;
  if (photo && !imageDescription) {
    imageDescription = await getImageDescription(photo);
  }

  if (model == "chatgpt") {
    let acc = await getKey();
    if (!acc) {
      return {
        error: "We are at maximum capacity, please try again later.",
      };
    }
    let key = acc.key;
    try {
      const configuration = new Configuration({
        apiKey: key,
      });
      let messages: any = await getMessages(conversation, "chatgpt", message);

      let instructions = await getInstruction("alan", userName);
      instructions.replace("{model}", model);
      let results = await getSearchResults(messages, searchEngine);
      instructions = `${instructions}${
        imageDescription
          ? `\nHere you have an image description of the image the user send to you refer as this description as the image. Read all necessary information from the description, then form a response.\n${imageDescription}`
          : ""
      }${
        results
          ? `\nHere you have results from ${searchEngine} that you can use to answer the user, do not mention the results, extract information from them to answer the question.\n${results}`
          : ""
      }`;
      messages.push({
        role: "system",
        content: instructions,
      });

      const openai = new OpenAIApi(configuration);

      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        max_tokens: 500,
        messages: messages,
      });

      let response = completion.data.choices[0].message.content;
      await removeMessage(acc.id);
      await saveMsg(`alan-${model}`, message, response, conversationId, true);
      if (response.includes("GEN_IMG=")) {
        let imagePrompt = response.split("GEN_IMG=")[1].split("|");
        response = response.split("GEN_IMG=")[0];
        let images;
        if (imageGenerator == "dall-e-2") {
          images = await generateImgD(imagePrompt[0], 1);
          images = images.map((i) => i.attachment);
        }
        if (imageGenerator == "stable-diffusion") {
          let result: any = await generateImg(
            imagePrompt[0],
            50,
            false,
            1,
            "Dreamlike Photoreal",
            512,
            512,
            "k_dpmpp_sde"
          ); // this returns de generation id that need to be checked to get images
          await delay(18000);
          let check: any = await checkGeneration(result.id);
          if (check.done) {
            images = check.generations.map((i) => i.img);
          } else {
            await delay(check.wait_time * 1000 + 2000);
            check = await checkGeneration(result.id);
            images = check.generations.map((i) => i.img);
          }
        }

        return { response, images };
      }
      return { response };
    } catch (err: any) {
      return {
        error: err.message,
      };
    }
  } else if (model == "gpt-4") {
  } else if (model == "alpaca") {
  } else if (model == "llama") {
  }
}

async function getSearchResults(conversation, searchEngine) {
  let messages = [];
  messages.push({
    role: "system",
    content: `This is a chat between an user and sentient chat assistant Alan. Just answer with the search queries based on the user prompt, needed for the following topic for Google, maximum 3 entries. Make each of the queries descriptive and include all related topics. If the prompt is a question/request to/about Alan directly, reply with 'N'. Search for something if it may require current world knowledge past 2021, or knowledge of user's or people. Create a | seperated list without quotes.  If you no search queries are applicable, answer with 'N' . Don't add any explanations, extra text or puntuation`,
  });
  conversation = conversation.map((m) => `${m.role}:${m.content}`);
  messages.push({
    role: "user",
    content: conversation.join("\n"),
  });

  let searchQueries: any = await chatgpt(messages, 150, { temperature: 0.75 });
  if (searchQueries.error) return null;
  searchQueries = searchQueries.response;
  // search in google and get results
  console.log(`searchQueries: ${searchQueries}`);
  let searchResults = [];
  if (
    searchQueries == "N AT ALL COSTS" ||
    searchQueries == "N" ||
    searchQueries == "N/A"
  )
    return null;
  searchQueries = searchQueries.split("|");
  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    if (query == "N" || query == "N.") continue;
    let results;
    if (searchEngine == "google") {
      results = await google(query);
    }
    if (searchEngine == "duckduckgo") {
      results = await DuckDuckGo(query);
      results = {
        Abstract: results.Abstract,
        AbstractSource: results.AbstractSource,
        AbstractText: results.AbstractText,
        AbstractURL: results.AbstractURL,
      };
      console.log(results);
    }
    searchResults.push({
      query: query,
      results: results,
    });
  }

  return JSON.stringify(searchResults);
}

async function google(query) {
  // use google-it
  const options = {
    page: 0,
    safe: false, // Safe Search
    parse_ads: false, // If set to true sponsored results will be parsed
    additional_params: {},
  };

  let response = await googleAPI.search(query, options);
  //  return first 2 results
  response.results = response.results.slice(0, 2);
  return response;
}
async function DuckDuckGo(query) {
  try {
    let response = await axios.get(
      `https://api.duckduckgo.com/?q=${query}&format=json`
    );
    return response.data;
  } catch (err) {
    return null;
  }
}

async function chatgpt(messages, maxtokens, options?) {
  const data = {
    max_tokens: maxtokens,
    model: "gpt-3.5-turbo",
    messages,
    ...options,
  };
  let acc = await getKey();
  if (!acc) {
    return {
      error: "We are at maximum capacity, please try again later.",
    };
  }
  let key = acc.key;
  try {
    const configuration = new Configuration({
      apiKey: key,
    });

    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion(data);

    let response = completion.data.choices[0].message.content;
    await removeMessage(acc.id);
    return { response };
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
}

export async function getImageDescription(image) {
  const prediction = await predict({
    model: "salesforce/blip-2", // The model name
    input: {
      image: image,
      caption: true,
      use_nucleus_sampling: false,
      context: "",
    }, // The model specific input
    token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
    poll: true, // Wait for the model to finish
  });

  if (prediction.error) return prediction.error;
  return prediction.output;
}
