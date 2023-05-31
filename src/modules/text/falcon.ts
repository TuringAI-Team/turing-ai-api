import { randomUUID } from "crypto";
import OpenAI from "chatgpt-official";
import { getKey, removeMessage } from "../openai.js";
import getInstruction from "./instructions.js";
import { getMessages, saveMsg } from "./index.js";
import axios from "axios";
import { textGeneration } from "../hf.js";

export default async function Falcon(message: string, conversationId?: string) {
  let result = await huggingface(`tiiuae/falcon-7b`, message);
  console.log(result);
  if (result.error) {
    return result;
  }

  return { response: result.response };
}

export async function huggingface(model, input) {
  try {
    let oldText;
    let loop = true;
    while (loop) {
      let response = await textGeneration(model, {
        inputs: input,
      });
      let answer = response.generated_text.split("AI:")[1];
      if (answer == oldText) {
        loop = false;
      } else {
        if (!oldText) {
          oldText = answer;
          input += answer;
        } else {
          oldText += answer;
          input += answer;
        }
      }
    }

    return { response: oldText };
  } catch (err: any) {
    console.log(err);
    return {
      error: err.message,
    };
  }
}
