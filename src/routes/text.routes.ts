import express from "express";
import { Request, Response } from "express";
import {
  chatGPT35,
  chatGPT3,
  getConversation,
  OpenAssistant,
  Alan,
} from "../modules/text/index.js";
import supabase from "../modules/supabase.js";
import turnstile from "../middlewares/captchas/turnstile.js";
import SaveInDataset from "../modules/text/dataset.js";
import { Configuration, OpenAIApi } from "openai";
import { OpenAIExt } from "openai-ext";
import { StableLM } from "../modules/text/stablelm.js";

const router = express.Router();

<<<<<<< Updated upstream
/*
router.post("/chat/:model", turnstile, async (req: Request, res: Response) => {
  var { model } = req.params;
  var { message, userName, conversationId } = req.body;
  if (model != "sd") {
    var conversation = await getConversation(conversationId, model);
  }
  if (model == "chatgpt") {
    let result = await chatGPT35(
      userName,
      conversation,
      message,
      conversationId
    );
    res.json(result).status(200);
  } else if (model == "gpt-3") {
    let result = await chatGPT3(
      userName,
      conversation,
      message,
      conversationId
    );
    res.json(result).status(200);
  } else if (model == "oa") {
    let result = await OpenAssistant(message);
    res.json(result).status(200);
  }
});*/
router.post("/open-ai", turnstile, async (req: Request, res: Response) => {
=======
router.post(`/:m`, turnstile, async (req: Request, res: Response) => {
  let availableModels = [
    "open-ai",
    "stablelm",
    "open-assistant",
    "dolly",
    "vicuna",
    "langchain",
  ];
  let { m } = req.params;
>>>>>>> Stashed changes
  let {
    messages,
    model = "gpt-3.5-turbo",
    maxTokens = 100,
    temperature = 0.7,
    topP,
    presencePenalty,
  }: {
    messages: Array<{
      content: string;
      role: "system" | "user" | "assistant";
      name?: string;
    }>;
    model: string;
    maxTokens: number;
    temperature: number;
    topP: number;
    presencePenalty: number;
  } = req.body;
  let key = process.env.OPENAI_API_KEY;
  const configuration = new Configuration({
    apiKey: key,
  });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  const openai = new OpenAIApi(configuration);
  let previousContent;
  OpenAIExt.streamServerChatCompletion(
    {
      model: model,
      max_tokens: maxTokens,
      temperature: temperature,
      messages: messages,
    },
    {
      openai: openai,
      handler: {
        // Content contains the string draft, which may be partial. When isFinal is true, the completion is done.
        onContent(content, isFinal, stream) {
          if (!previousContent) {
            res.write(content);
          } else {
            res.write(content.replace(previousContent, ""));
          }
          previousContent = content;
        },
        onDone(stream) {
          res.end();
        },
        onError(error, stream) {
          console.error(error);
        },
      },
    }
  );
});

router.post("/stablelm", turnstile, async (req: Request, res: Response) => {
  let {
    prompt,
    instructions = null,
    maxTokens = 500,
  }: {
    prompt: string;
    instructions: string;
    maxTokens: number;
  } = req.body;
  let result = await StableLM(prompt, maxTokens);
  res.json(result).status(200);
});

router.post(
  "/open-assistant",
  turnstile,
  async (req: Request, res: Response) => {
    let {
      prompt,
      maxTokens = 500,
      model = "oasst-sft-4-pythia-12b-epoch-3.5",
    }: {
      prompt: string;
      maxTokens: number;
      model: string;
    } = req.body;
    let result = await OpenAssistant(prompt, model);
    res.json(result).status(200);
<<<<<<< Updated upstream
=======
  } else if (m == "dolly") {
    let { maxTokens = 500 } = req.body;
    let result: any = await Dolly(prompt, maxTokens);
    result.response = result.response.join(" ");
    res.json(result).status(200);
  } else if (m == "vicuna") {
    let { maxTokens = 500 } = req.body;
    let result: any = await Vicuna(prompt, maxTokens);
    result.response = result.response.join(" ");
    res.json(result).status(200);
  } else if (m == "langchain") {
>>>>>>> Stashed changes
  }
);

router.post("/alan/:model", turnstile, async (req: Request, res: Response) => {
  var { model } = req.params;
  var {
    message,
    userName,
    conversationId,
    searchEngine,
    photo,
    photoDescription,
    imageGenerator,
    nsfwFilter,
    videoGenerator,
    audioGenerator,
    imageModificator,
  } = req.body;
  let conversation = await getConversation(conversationId, `alan-${model}`);
  let result = await Alan(
    userName,
    conversation,
    message,
    conversationId,
    model,
    searchEngine,
    photo,
    photoDescription,
    imageGenerator,
    nsfwFilter,
    videoGenerator,
    audioGenerator,
    imageModificator
  );
  res.json(result).status(200);
});

router.delete(
  "/conversation/:model",
  turnstile,
  async (req: Request, res: Response) => {
    var { model } = req.params;
    var { conversationId, userName } = req.body;
    let conversation = await getConversation(conversationId, model);
    await SaveInDataset(conversation, userName, model);
    var { data } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("model", model);
    res.json({ message: "Conversation deleted" }).status(200);
  }
);

export default router;
