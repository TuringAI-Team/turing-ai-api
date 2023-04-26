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
import { Dolly } from "../modules/text/dolly.js";
import { Vicuna } from "../modules/text/vicuna.js";

const router = express.Router();

router.post(`/:m`, turnstile, async (req: Request, res: Response) => {
  let availableModels = [
    "open-ai",
    "stablelm",
    "open-assistant",
    "dolly",
    "vicuna",
  ];
  let { m } = req.params;
  let {
    messages,
    model,
    temperature,
    topP,
    presencePenalty,
    prompt,
    instructions,
  } = req.body;
  if (!availableModels.includes(m)) {
    res.json({ success: false, error: "Model not found" }).status(404);
  }
  if (m === "open-ai") {
    let { maxTokens = 100 } = req.body;
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
  } else if (m === "stablelm") {
    let { maxTokens = 500 } = req.body;
    let result: any = await StableLM(prompt, maxTokens);
    result.response = result.response.join(" ");
    res.json(result).status(200);
  } else if (m === "open-assistant") {
    let result = await OpenAssistant(prompt, model);
    res.json(result).status(200);
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
  }
});
router.post("/is-ai", async (req: Request, res: Response) => {});
router.post("/mod", async (req: Request, res: Response) => {});

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
