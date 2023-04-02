import { randomUUID } from "crypto";
import OpenAI from "chatgpt-official";
import { getKey, removeMessage } from "../openai.js";
import getInstruction from "./instructions.js";
import { getMessages, saveMsg } from "./index.js";

export default async function chatGPT3(
  userName: string = "Anonymous",
  conversation,
  message: string,
  conversationId: string,
  maxtokens: number = 300
) {
  let acc = await getKey();
  if (!acc) {
    return {
      error: "We are at maximum capacity, please try again later.",
    };
  }
  let key = acc.key;
  try {
    let bot = new OpenAI(key, {
      max_tokens: maxtokens, // OpenAI parameter [Max response size by tokens]
      stop: " Human", // OpenAI parameter
      instructions: await getInstruction("gpt3", userName),
      aiName: "GPT-3",
      model: "text-davinci-003",
    }); // Note: options is optional
    var prompt: any = await getMessages(
      conversation,
      "gpt3",
      message,
      await getInstruction("gpt3", userName)
    );

    let response = await bot.ask(prompt, randomUUID());
    await removeMessage(acc.id);
    await saveMsg("gpt3", message, response, conversationId, true);
    return { response };
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
}
