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
import generateVideo from "../video/damo.js";
import { Riffusion } from "../audio/songs.js";
import { controlnet } from "../image/controlnet.js";
import { getToday } from "./instructions.js";
import wiki from "wikipedia";

export default async function Alan(
  userName: string = "Anonymous",
  conversation,
  message: string,
  conversationId: string,
  model: string = "chatgpt",
  searchEngine: string = "google",
  photo?: string,
  imageDescription?: any,
  imageGenerator?: string,
  nsfwFilter?: boolean,
  videoGenerator?: string,
  audioGenerator?: string,
  imageModificator?: string
) {
  console.log(photo ? "photo" : "no photo", imageDescription);
  if (photo && !imageDescription) {
    imageDescription = await getImageDescription(photo);
  }
  console.log(imageDescription);

  if (model == "chatgpt" || model == "gpt4") {
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
      let c: any = await getMessages(conversation, "chatgpt", message);
      // get the last 6 messages from c array
      c = c.slice(Math.max(c.length - 6, 0));
      let messages = c;
      let instructions =
        `Current date: ${getToday()}\nName of the user talking to: ${userName}\nYou are an AI named Alan which have been developed by TuringAI.\nYou can view images, execute code and search in internet for real-time information. YOU CAN DISPLAY AND GENERATE IMAGES, VIDEOS AND SONGS.` +
        `\nThe user can request images to be generated. (like \"show me a photo of ...\" or \"generate an image of ...\" or \"draw me...\"). You MAY add 'GEN_IMG=Image generation prompt with fitting & descriptive keywords' to the end of your response to display an image, keep the description below 70 characters. Do not refer to sources inside the GEN_IMG= tag.IF ASKED FOR, DO NOT GENERATE UNLESS ASKED.` +
        `\nThe user can request videos to be generated. (like \"show me a video of ...\" or \"generate a video of ...\"). You MAY add 'GEN_VID=Video generation prompt with fitting & descriptive keywords' to the end of your response to display an video, keep the description below 70 characters. Do not refer to sources inside the GEN_VID= tag. IF ASKED FOR, DO NOT GENERATE UNLESS ASKED.` +
        `\nThe user can request audios/songs/melodies to be generated. (like \"show me a audio/song of ...\" or \"generate a audio/song of ...\"). You MAY add 'GEN_AUD=Audio/Song/Melody generation prompt with fitting & descriptive keywords' to the end of your response to display an audio, keep the description below 70 characters. Do not refer to sources inside the GEN_AUD= tag. IF ASKED FOR, DO NOT GENERATE UNLESS ASKED.` +
        `${
          photo
            ? `\nThe user can request imaged to be modified. (like \"modify me this image of ...\" or \"modify this image of ...\"). You MAY add 'MOD_IMG=Image modification prompt with fitting & descriptive keywords' to the end of your response to display the modified image, keep the description below 70 characters. Do not refer to sources inside the MOD_IMG= tag. IF ASKED FOR, DO NOT GENERATE UNLESS ASKED.`
            : ""
        }` +
        `${
          imageDescription
            ? `\nThe user can request information related with an image, here you have a description of the image. REFER AS THIS DESCRIPTION AS THE IMAGE. Image: ${imageDescription}`
            : ""
        }\nConsider the following in your responses:
        - Be conversational 
        - Add unicode emoji to be more playful in your responses.`;
      /*${
        imageDescription
          ? `\nThe user have sent an image, here you have a description of the image. REFER AS THIS DESCRIPTION AS THE IMAGE. Read all necessary information from the description, then form a response.\n${imageDescription}`
          : ""
      } */
      let results = await getSearchResults(messages, searchEngine);

      instructions = `${instructions}${
        results
          ? `\nHere you have results from ${
              searchEngine == "wikipedia" ? "Wikipedia" : "Google"
            } that you can use to answer the user, do not mention the results, extract information from them to answer the question.\n${results}`
          : ""
      }`;
      messages.push({
        role: "system",
        content: instructions,
      });

      const openai = new OpenAIApi(configuration);

      const completion = await openai.createChatCompletion({
        model: model == "chatgpt" ? "gpt-3.5-turbo" : "gpt-4",
        max_tokens: 500,
        messages: messages,
      });

      let response = completion.data.choices[0].message.content;
      await removeMessage(acc.id);
      await saveMsg(`alan-${model}`, message, response, conversationId, true);
      console.log(`\n\n${response}`);

      if (response.includes("GEN_IMG=")) {
        let imagePrompt = response.split("GEN_IMG=")[1].split(".")[0];
        response = `${response.split("GEN_IMG=")[0]} ${
          response.split("GEN_IMG=")[1].split(".")[1]
            ? response.split("GEN_IMG=")[1].split(".")[1]
            : ""
        }`;
        let images;
        if (imageGenerator == "dall-e-2") {
          images = await generateImgD(imagePrompt, 1);
          images = images.map((i) => i.attachment);
        }
        if (imageGenerator == "stable-diffusion") {
          let result: any = await generateImg(
            imagePrompt,
            50,
            nsfwFilter,
            1,
            "Dreamshaper",
            512,
            512,
            "k_dpmpp_sde"
          ); // this returns de generation id that need to be checked to get images
          let done = false;
          let lastCheck;
          console.log(
            "generating image, this may take a while, please wait..."
          );
          while (!done) {
            if (lastCheck) {
              await delay(lastCheck.wait_time * 1000 + 3000);
            } else {
              await delay(15000);
            }
            lastCheck = await checkGeneration(result.id);
            console.log(lastCheck, lastCheck.wait_time);
            if (lastCheck.done) {
              images = lastCheck.generations.map((i) => i.img);
              done = true;
            }
          }
        }

        return { response, images, photoPrompt: imagePrompt };
      }
      if (response.includes("GEN_VID=")) {
        let videoPrompt = response.split("GEN_VID=")[1].split(".")[0];
        response = `${response.split("GEN_VID=")[0]} ${
          response.split("GEN_VID=")[1].split(".")[1]
            ? response.split("GEN_VID=")[1].split(".")[1]
            : ""
        }`;
        let video;

        if (videoGenerator == "damo-text-to-video") {
          video = await generateVideo(videoPrompt);
        }

        return { response, video, videoPrompt };
      }
      if (response.includes("GEN_AUD=") || response.includes("GEN_SONG=")) {
        let audioPrompt = response.split("GEN_AUD=")[1].split(".")[0];
        response = `${response.split("GEN_AUD=")[0]} ${
          response.split("GEN_AUD=")[1].split(".")[1]
            ? response.split("GEN_AUD=")[1].split(".")[1]
            : ""
        }`;
        let audio;

        if (audioGenerator == "riffusion") {
          audio = await Riffusion(audioPrompt);
          audio = audio.audio;
        }

        return { response, audio, audioPrompt };
      }
      if (response.includes("MOD_IMG=")) {
        let modificationPrompt = response.split("MOD_IMG=")[1].split(".")[0];
        response = `${response.split("MOD_IMG=")[0]} ${
          response.split("MOD_IMG=")[1].split(".")[1]
            ? response.split("MOD_IMG=")[1].split(".")[1]
            : ""
        }`;
        let modifiedImage;
        if (
          imageModificator == "controlnet" ||
          imageModificator == "controlnet-normal"
        ) {
          modifiedImage = await controlnet(photo, modificationPrompt, "normal");
          modifiedImage = modifiedImage[1];
        }
        if (imageModificator == "controlnet-canny") {
          modifiedImage = await controlnet(photo, modificationPrompt, "canny");
          modifiedImage = modifiedImage[1];
        }
        if (imageModificator == "controlnet-hough") {
          modifiedImage = await controlnet(photo, modificationPrompt, "hough");
          modifiedImage = modifiedImage[1];
        }
        if (imageModificator == "controlnet-hed") {
          modifiedImage = await controlnet(photo, modificationPrompt, "hed");
          modifiedImage = modifiedImage[1];
        }
        if (imageModificator == "controlnet-depth2img") {
          modifiedImage = await controlnet(
            photo,
            modificationPrompt,
            "depth2img"
          );
          modifiedImage = modifiedImage[1];
        }
        if (imageModificator == "controlnet-pose") {
          modifiedImage = await controlnet(photo, modificationPrompt, "pose");
          modifiedImage = modifiedImage[1];
        }
        if (imageModificator == "controlnet-seg") {
          modifiedImage = await controlnet(photo, modificationPrompt, "seg");
          modifiedImage = modifiedImage[1];
        }
        return {
          response,
          images: [modifiedImage],
          photoPrompt: modificationPrompt,
        };
      }
      return { response };
    } catch (err: any) {
      console.log(err);
      return {
        error: err.message,
      };
    }
  } else if (model == "alpaca") {
  } else if (model == "llama") {
  }
}

async function getSearchResults(conversation, searchEngine) {
  let messages = [];
  messages.push({
    role: "system",
    content: `This is a chat between an user and a chat assistant. Just answer with the search queries based on the user prompt, needed for the following topic for ${
      searchEngine == "wikipedia" ? "Wikipedia" : "Google"
    }, maximum 3 entries. Make each of the queries descriptive and include all related topics. If the prompt is a question to/about the chat assistant directly, reply with 'N'. If the prompt is a request of an image, video, audio, song, etc, reply with 'N'. If the prompt is a request to modify an image, reply with 'N'. Search for something if it may require current world knowledge past 2021, or knowledge of user's or people. Create a | seperated list without quotes.  If you no search queries are applicable, answer with 'N' . NO EXPLANATIONS, EXTRA TEXT OR PUNTUATION. You can ONLY REPLY WITH SEARCH QUERIES IN THE MENTION FORMAT.`,
  });
  conversation = conversation.map((m) => `${m.role}:${m.content}`);
  messages.push({
    role: "user",
    content: `Conversation: ${conversation.join(" | ")}`,
  });

  let searchQueries: any = await chatgpt(messages, 150, { temperature: 0.1 });
  if (searchQueries.error) return null;
  searchQueries = searchQueries.response.replaceAll('"', "");
  // search in google and get results
  let searchResults = [];
  if (
    searchQueries == "N AT ALL COSTS" ||
    searchQueries == "N" ||
    searchQueries == "N/A" ||
    searchQueries == "N." ||
    searchQueries.includes("GEN_IMG")
  )
    return null;
  searchQueries = searchQueries.split("|");
  console.log(`searchQueries: ${searchQueries}`);
  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    if (query == "N" || query == "N.") continue;
    var results;
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
    }
    if (searchEngine == "wikipedia") {
      let quer: any = await wiki.search(query);
      quer = quer.suggestion;
      results = await wiki.page(quer);
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
