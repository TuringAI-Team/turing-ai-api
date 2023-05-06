import { randomUUID } from "crypto";
import OpenAI from "chatgpt-official";
import { getKey, removeMessage } from "../openai.js";
import getInstruction from "./instructions.js";
import { getMessages, saveMsg } from "./index.js";
import axios from "axios";
import { textGeneration } from "../hf.js";

export default async function RedPajama(
  message: string,
  conversationId?: string
) {
  let result = await huggingface(
    `togethercomputer/RedPajama-INCITE-Chat-7B-v0.1`,
    message
  );
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
      let answer = response.generated_text.split("<bot>:")[1];
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
