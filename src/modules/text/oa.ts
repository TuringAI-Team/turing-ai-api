import { randomUUID } from "crypto";
import OpenAI from "chatgpt-official";
import { getKey, removeMessage } from "../openai.js";
import getInstruction from "./instructions.js";
import { getMessages, saveMsg } from "./index.js";

export default async function OpenAssistant(
  message: string,
  conversationId?: string
) {
  /*
  let acc = await getKey();
  if (!acc) {
    return {
      error: "We are at maximum capacity, please try again later.",
    };
  }
  let key = acc.key;*/
  try {
    /*
    var prompt: any = await getMessages(
      conversation,
      "gpt3",
      message,
      await getInstruction("gpt3", userName)
    );*/
    const res = await fetch(
      "https://api-inference.huggingface.co/models/OpenAssistant/oasst-sft-1-pythia-12b",
      {
        headers: {
          Authorization: "Bearer ",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: `<|prompter|>${message}<|endoftext|>\n<|assistant|>`,
        }),
      }
    );
    let response = await res.json();

    //await removeMessage(acc.id);
    await saveMsg("openAssistant", message, response, conversationId, true);
    return { response };
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
}
