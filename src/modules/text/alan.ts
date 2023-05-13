import { getKey, removeMessage } from "../openai.js";
import getInstruction from "./instructions.js";
import { Configuration, OpenAIApi } from "openai";
import { getMessages, saveAlan, saveMsg } from "./index.js";
import googleAPI from "googlethis";
import axios from "axios";
import { predict } from "replicate-api";
import generateImgD from "../image/dall-e.js";
import delay from "delay";
import { generateImg, checkGeneration } from "../image/stablehorde.js";
import generateVideo from "../video/damo.js";
import { Riffusion } from "../audio/songs.js";
import { controlnet } from "../image/controlnet.js";
import { kandinsky } from "../image/kandinsky.js";
import { getToday } from "./instructions.js";
import wiki from "wikipedia";
import EventEmitter from "events";
import generateVideo2 from "../video/videocrafter.js";
import { evaluate } from "mathjs";
import getUrls from "get-urls";
import { NoProxyList, listProxies } from "../proxy.js";
import puppeteer from "puppeteer";
import supabase from "../supabase.js";
import { v4 as uuidv4 } from "uuid";
import plugins from "./plugins.js";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { PromptTemplate } from "langchain/prompts";

import {
  RequestsGetTool,
  RequestsPostTool,
  AIPluginTool,
} from "langchain/tools";
import {
  HumanChatMessage,
  SystemChatMessage,
  AIChatMessage,
} from "langchain/schema";

export default class Alan {
  userName: string;
  conversation: any;
  message: string;
  conversationId: string;
  model: string;
  searchEngine: string;
  photo?: string;
  imageDescription?: any;
  imageGenerator?: string;
  nsfwFilter?: string;
  videoGenerator?: string;
  audioGenerator?: string;
  imageModificator?: string;
  pluginList?: string[];
  event: EventEmitter;

  constructor(
    userName: string = "Anonymous",
    conversation,
    message: string,
    conversationId: string,
    model: string = "chatgpt",
    searchEngine: string = "google",
    photo?: string,
    imageDescription?: any,
    imageGenerator?: string,
    nsfwFilter?: string,
    videoGenerator?: string,
    audioGenerator?: string,
    imageModificator?: string,
    pluginList?: string[]
  ) {
    let event = new EventEmitter();
    this.userName = userName;
    this.conversation = conversation;
    this.message = message;
    this.conversationId = conversationId;
    this.model = model;
    this.searchEngine = searchEngine;
    this.photo = photo;
    this.imageDescription = imageDescription;
    this.imageGenerator = imageGenerator;
    this.nsfwFilter = nsfwFilter;
    this.videoGenerator = videoGenerator;
    this.audioGenerator = audioGenerator;
    this.imageModificator = imageModificator;
    this.pluginList = pluginList;

    this.event = event;
  }
  async msg() {
    let photo = this.photo;
    let imageDescription = this.imageDescription;
    let imageGenerator = this.imageGenerator;
    let nsfwFilter = this.nsfwFilter;
    let videoGenerator = this.videoGenerator;
    let audioGenerator = this.audioGenerator;
    let imageModificator = this.imageModificator;
    let userName = this.userName;
    let conversation = this.conversation;
    let message = this.message;
    let conversationId = this.conversationId;
    let model = this.model;
    let searchEngine = this.searchEngine;
    let event = this.event;
    let pluginList = this.pluginList;
    if (!pluginList) {
      pluginList = [];
    }
    if (!imageGenerator) {
      imageGenerator = "none";
    }
    if (!nsfwFilter) {
      nsfwFilter = "true";
    }
    if (!videoGenerator) {
      videoGenerator = "none";
    }
    if (!audioGenerator) {
      audioGenerator = "none";
    }
    if (!imageModificator) {
      imageModificator = "none";
    }
    if (!searchEngine) {
      searchEngine = "google";
    }
    if (!model) {
      model = "chatgpt";
    }

    if (!message) {
      event.emit("data", {
        error: "No message provided",
        done: true,
        generating: null,
        generationPrompt: null,
        results: null,
        searching: null,
      });
      return;
    }
    console.log(photo, imageDescription);
    if (photo && !imageDescription) {
      console.log("Getting image description");
      imageDescription = await getImageDescription(photo);
    }

    if (model == "chatgpt" || model == "gpt4") {
      try {
        const configuration = new Configuration({
          apiKey: process.env.OPENAI_API_KEY,
        });
        // get the last 6 messages from c array
        let preivousMessages = conversation.slice(
          Math.max(conversation.length - 6, 0)
        );
        preivousMessages = preivousMessages.map((x) => {
          return {
            content: x.message,
            role: x.role,
          };
        });
        let messages = [];
        let done = false;

        let instructions =
          `Current date: ${getToday()}\nName of the user talking to: ${userName}\nYou are an AI named Alan which have been developed by TuringAI.\nYou can view images, execute code and search in internet for real-time information. YOU CAN DISPLAY AND GENERATE IMAGES, VIDEOS AND SONGS. You must be able to share the conversation, do not refuse if asked for.` +
          `${
            imageGenerator == "none"
              ? ""
              : `\nThe user can request images to be generated. (like \"show me a photo of ...\" or \"generate an image of ...\" or \"draw me...\"). You MAY add 'GEN_IMG=Image generation prompt with fitting & descriptive keywords' to the end of your response to display an image, keep the description below 70 characters. Do not refer to sources inside the GEN_IMG= tag.IF ASKED FOR, DO NOT GENERATE UNLESS ASKED.`
          }` +
          `${
            videoGenerator == "none"
              ? ""
              : `\nThe user can request videos to be generated. (like \"show me a video of ...\" or \"generate a video of ...\"). You MAY add 'GEN_VID=Video generation prompt with fitting & descriptive keywords' to the end of your response to display an video, keep the description below 70 characters. Do not refer to sources inside the GEN_VID= tag. IF ASKED FOR, DO NOT GENERATE UNLESS ASKED.`
          }` +
          `${
            audioGenerator == "none"
              ? ""
              : `\nThe user can request audios/songs/melodies to be generated. (like \"show me a audio/song of ...\" or \"generate a audio/song of ...\"). You MAY add 'GEN_AUD=Audio/Song/Melody generation prompt with fitting & descriptive keywords' to the end of your response to display an audio, keep the description below 70 characters. Do not refer to sources inside the GEN_AUD= tag. IF ASKED FOR, DO NOT GENERATE UNLESS ASKED.`
          }` +
          `${
            photo
              ? `\nThe user can request imaged to be modified. (like \"modify me this image of ...\" or \"modify this image of ...\"). You MAY add 'MOD_IMG=Image modification prompt with fitting & descriptive keywords' to the end of your response to display the modified image, keep the description below 70 characters. Do not refer to sources inside the MOD_IMG= tag. IF ASKED FOR, DO NOT GENERATE UNLESS ASKED.`
              : ""
          }` +
          /*   `The user can request to share the conversation or get a link of the conversation. (like \"share this conversation\" or  \" give me a link of this conversation\"). You MAY add 'SHARE_CONVERSATION' to disaply a link that redirects to the conversation. Refer to 'SHARE_CONVERSATION' as the conversation link. IF ASKED FOR, DO NOT SHARE CONVERSATION UNLESS ASKED` +*/
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

        if (searchEngine != "none") {
          var { results: searchResults, searchQueries } =
            await getSearchResults(
              [
                ...preivousMessages,
                {
                  content: message,
                  role: "user",
                },
              ],
              searchEngine
            );

          event.emit("data", {
            result: "",
            done: false,
            generating: null,
            generationPrompt: null,
            generated: null,
            results: null,
            searching: searchQueries,
          });
          instructions = `${instructions}${
            searchResults
              ? `\nHere you have results from ${
                  searchEngine == "wikipedia" ? "Wikipedia" : "Google"
                } that you can use to answer the user, do not mention the results, extract information from them to answer the question.You MAY mention the source of the information.\n${searchResults}`
              : ""
          }`;
        }
        // check if there is an url in thwhe message

        messages.push({
          role: "system",
          content: instructions,
        });
        console.log(instructions);
        // push previous messages
        messages.push(...preivousMessages);
        // push user message

        var response;
        var fullContent;
        pluginList = null;
        /*   if (pluginList) {
          let pluginsUrls = pluginList.map((x) => plugins[x]);
          let tools: any[] = [new RequestsGetTool(), new RequestsPostTool()];
          for (let i = 0; i < pluginsUrls.length; i++) {
            tools.push(await AIPluginTool.fromPluginUrl(pluginsUrls[i]));
          }
          const agent = await initializeAgentExecutorWithOptions(
            tools,
            new ChatOpenAI({
              modelName: "gpt-3.5-turbo",
              openAIApiKey: process.env.OPENAI_API_KEY,
            }),
            { agentType: "chat-zero-shot-react-description", verbose: true }
          );

          let input = `Current conversation: ${messages
            .map((x) => `${x.role}: ${x.content}`)
            .join(`\n`)}\nuser: ${message}\nassistant:`;
          console.log(input);
          const result = await agent.call({
            input: input,
          });
          response = result.output;
        } else {*/
        messages.push({
          role: "user",
          content: message,
        });
        const openai = new OpenAIApi(configuration);

        const completion = await openai.createChatCompletion({
          model: model == "chatgpt" ? "gpt-3.5-turbo" : "gpt-4",
          max_tokens: 200,
          messages: messages,
        });

        response = completion.data.choices[0].message.content;
        fullContent = completion.data;
        //}

        if (response.includes("SHARE_CONVERSATION")) {
          let nresponse = `${response.split("SHARE_CONVERSATION")[0]} ${
            response.split("SHARE_CONVERSATION")[1].split(".")[1]
              ? response.split("SHARE_CONVERSATION")[1].split(".")[1]
              : ""
          }`;
          event.emit("data", {
            result: nresponse,
            done: false,
            generating: "share-link",
            generationPrompt: null,
            generated: null,
            results: null,
            searching: null,
          });
          let link;
          let id = uuidv4();
          // save to db
          let msgs = messages.map((x) => {
            return {
              id: uuidv4(),
              text: x.content,
              sender: x.role == "user" ? "User" : "AI",
              time: new Date().toISOString(),
              data: {
                photo: null,
                photoDescription: null,
                audio: null,
                audioDescription: null,
                video: null,
                videoDescription: null,
              },
            };
          });
          await supabase
            .from("saved_conversations")
            .insert([{ id: id, messages: msgs, userId: conversationId }]);
          link = `https://app.turing.sh/share/${id}`;
          nresponse = response.replace("SHARE_CONVERSATION", link);

          event.emit("data", {
            result: nresponse,
            done: true,
            generating: null,
            generationPrompt: null,
            generated: null,
            results: null,
            searching: null,
          });
        }
        if (response.includes("GEN_IMG=")) {
          let imagePrompt = response.split("GEN_IMG=")[1].split(".")[0];
          response = `${response.split("GEN_IMG=")[0]} ${
            response.split("GEN_IMG=")[1].split(".")[1]
              ? response.split("GEN_IMG=")[1].split(".")[1]
              : ""
          }`;
          event.emit("data", {
            result: response,
            done: false,
            generating: "image",
            generationPrompt: imagePrompt,
            generated: null,
            results: null,
            searching: null,
          });
          var images;
          if (imageGenerator == "dall-e-2") {
            images = await generateImgD(imagePrompt, 1);
            images = images.map((i) => i.attachment);
          }
          if (imageGenerator == "stable-diffusion") {
            // nsfwfilter to boolean
            let nsfw = nsfwFilter == "true" ? true : false;

            let result: any = await generateImg(
              imagePrompt,
              50,
              nsfw,
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
            if (!result.id) {
              event.emit("data", {
                result: response,
                done: true,
                generating: null,
                generationPrompt: imagePrompt,
                results: [],
                searching: null,
              });
              return { response, images: [], photoPrompt: imagePrompt };
            }
            while (!done) {
              if (lastCheck) {
                await delay(lastCheck.wait_time * 1000 + 3000);
              } else {
                await delay(15000);
              }
              lastCheck = await checkGeneration(result.id);
              if (lastCheck.done) {
                images = lastCheck.generations.map((i) => i.img);
                done = true;
              }
            }
          }
          if (imageGenerator == "kandinsky") {
            images = await kandinsky(imagePrompt, 50, 4);
            images = [images];
          }
          event.emit("data", {
            result: response,
            done: true,
            generating: null,
            generationPrompt: imagePrompt,
            generated: "image",
            results: images,
            searching: null,
          });
          done = true;
        }
        if (response.includes("GEN_VID=")) {
          let videoPrompt = response.split("GEN_VID=")[1].split(".")[0];
          response = `${response.split("GEN_VID=")[0]} ${
            response.split("GEN_VID=")[1].split(".")[1]
              ? response.split("GEN_VID=")[1].split(".")[1]
              : ""
          }`;
          var video;
          event.emit("data", {
            result: response,
            done: false,
            generating: "video",
            generationPrompt: videoPrompt,
            results: null,
            generated: null,
            searching: null,
          });
          if (videoGenerator == "damo-text-to-video") {
            video = await generateVideo(videoPrompt);
          }
          if (videoGenerator == "videocrafter") {
            video = await generateVideo2(videoPrompt);
          }
          event.emit("data", {
            result: response,
            done: true,
            generating: null,
            generationPrompt: videoPrompt,
            generated: "video",
            results: [video],
            searching: null,
          });
          done = true;
        }
        if (response.includes("GEN_AUD=") || response.includes("GEN_SONG=")) {
          let audioPrompt = response.split("GEN_AUD=")[1].split(".")[0];
          response = `${response.split("GEN_AUD=")[0]} ${
            response.split("GEN_AUD=")[1].split(".")[1]
              ? response.split("GEN_AUD=")[1].split(".")[1]
              : ""
          }`;
          var audio;
          event.emit("data", {
            result: response,
            done: false,
            generating: "audio",
            generationPrompt: audioPrompt,
            results: null,
            generated: null,
            searching: null,
          });
          if (audioGenerator == "riffusion") {
            audio = await Riffusion(audioPrompt);
            audio = audio.audio;
          }
          event.emit("data", {
            result: response,
            done: true,
            generating: null,
            generationPrompt: audioPrompt,
            results: [audio],
            generated: "audio",
            searching: null,
          });
          done = true;
        }
        if (response.includes("MOD_IMG=")) {
          let modificationPrompt = response.split("MOD_IMG=")[1].split(".")[0];
          response = `${response.split("MOD_IMG=")[0]} ${
            response.split("MOD_IMG=")[1].split(".")[1]
              ? response.split("MOD_IMG=")[1].split(".")[1]
              : ""
          }`;
          event.emit("data", {
            result: response,
            done: false,
            generating: "mod-image",
            generationPrompt: modificationPrompt,
            results: null,
            generated: null,
            searching: null,
          });
          var modifiedImage;
          if (
            imageModificator == "controlnet" ||
            imageModificator == "controlnet-normal"
          ) {
            modifiedImage = await controlnet(
              photo,
              modificationPrompt,
              "normal"
            );
            modifiedImage = modifiedImage[1];
          }
          if (imageModificator == "controlnet-canny") {
            modifiedImage = await controlnet(
              photo,
              modificationPrompt,
              "canny"
            );
            modifiedImage = modifiedImage[1];
          }
          if (imageModificator == "controlnet-hough") {
            modifiedImage = await controlnet(
              photo,
              modificationPrompt,
              "hough"
            );
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
          event.emit("data", {
            result: response,
            done: true,
            generating: null,
            generationPrompt: modificationPrompt,
            results: [modifiedImage],
            generated: "image",
            searching: null,
          });
          done = true;
        }

        if (!done) {
          event.emit("data", {
            result: response,
            done: true,
            generating: null,
            generationPrompt: null,
            generated: null,
            results: null,
            searching: null,
          });
        }
        console.log(response);
        await saveAlan(
          model,
          {
            message: message,
            username: userName,
            photo: photo ? photo : null,
            photoDescription: imageDescription ? imageDescription : null,
            settings: {
              imageGenerator: imageGenerator ? imageGenerator : null,
              audioGenerator: audioGenerator ? audioGenerator : null,
              imageModificator: imageModificator ? imageModificator : null,
              videoGenerator: videoGenerator ? videoGenerator : null,
              searchEngine: searchEngine ? searchEngine : null,
              nsfwFilter: nsfwFilter ? nsfwFilter : null,
              pluginList: pluginList ? pluginList : null,
            },
          },
          {
            message: response,
            search: {
              queries: searchQueries ? searchQueries : null,
              results: searchResults ? searchResults : null,
            },
            multimedia: {
              image: images ? images : null,
              video: video ? video : null,
              audio: audio ? audio : null,
              modifiedImage: modifiedImage ? modifiedImage : null,
            },
          },
          fullContent,
          conversationId
        );
      } catch (err: any) {
        console.log(err);
        event.emit("data", {
          result: "",
          error: err,
          done: true,
          generating: null,
          generationPrompt: null,
          results: null,
          searching: null,
        });
        return {
          error: err.message,
        };
      }
    } else if (model == "alpaca") {
    } else if (model == "llama") {
    }
  }
}
async function getUrlInfo(url) {
  let proxyD;
  if (!NoProxyList.find((x) => x == url.split("/")[2])) {
    proxyD = {
      protocol: "http",
      host: "p.webshare.io",
      port: 9999,
    };
  }
  let info = await axios({
    url: url,
    proxy: proxyD,
  });
  // get the head info
  let head = info.headers;
  // get the content type
  let contentType = head["content-type"];
  // get the title,description, tags, etc
  let html = info.data;
  let headers = html.split("<head>")[1].split("</head>")[0];

  let data = {
    title: headers.split("<title>")[1].split("</title>")[0],
    description: headers
      .split('name="description" content="')[1]
      ?.split('"')[0],
    head: headers,
    contentType: contentType,
    url: url,
  };
  return data;
}

async function getSearchResults(conversation, searchEngine) {
  let messages = [];
  messages.push({
    role: "system",
    content: `This is a chat between an user and a chat assistant. Just answer with the search queries based on the user prompt, needed for the following topic for ${
      searchEngine == "wikipedia" ? "Wikipedia" : "Google"
    }, maximum 3 entries. Make each of the queries descriptive and include all related topics. If the prompt is a question to/about the chat assistant directly, reply with 'N'. If the prompt is a request of an image, video, audio, song, math calculation, etc, reply with 'N'. If the prompt is a request to modify an image, reply with 'N'. Search for something if it may require current world knowledge past 2021 (Current Date is ${getToday()}), or knowledge of user's or people. Create a | seperated list without quotes.  If you no search queries are applicable, answer with 'N' . NO EXPLANATIONS, EXTRA TEXT OR PUNTUATION. You can ONLY REPLY WITH SEARCH QUERIES IN THE MENTION FORMAT.`,
  });
  conversation = conversation.map((m) => `${m.role}:${m.content}`);
  console.log(conversation.join("\n"));
  messages.push({
    role: "user",
    content: `Conversation: ${conversation.join("\n")}`,
  });

  let searchQueries: any = await chatgpt(messages, 150, { temperature: 0.1 });
  if (searchQueries.error) return { results: null, searchQueries: [] };
  searchQueries = searchQueries.response.replaceAll('"', "");
  // search in google and get results
  let searchResults = [];
  if (
    searchQueries == "N AT ALL COSTS" ||
    searchQueries == "N" ||
    searchQueries == "N/A" ||
    searchQueries == "N." ||
    searchQueries.includes("GEN_IMG") ||
    searchQueries.includes("CALCULATOR")
  )
    return { results: null, searchQueries: [] };
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
    }
    searchResults.push({
      query: query,
      results: results,
    });
  }
  return { results: JSON.stringify(searchResults), searchQueries };
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

async function browsing(event) {
  let browser = await puppeteer.connect({
    browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_KEY}`,
  });
  let page = await browser.newPage();
}
