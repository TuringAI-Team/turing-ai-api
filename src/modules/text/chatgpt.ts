import { getKey, removeMessage } from "../openai.js";
import getInstruction from "./instructions.js";
import { Configuration, OpenAIApi } from "openai";
import { getMessages, saveMsg } from "./index.js";

export default async function chatGPT35(
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
    const configuration = new Configuration({
      apiKey: key,
    });
    var messages: any = await getMessages(
      conversation,
      "chatgpt",
      message,
      await getInstruction("chatgpt", userName)
    );
    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      max_tokens: maxtokens,
      messages: messages,
    });

    let response = completion.data.choices[0].message.content;
    await removeMessage(acc.id);
    await saveMsg("chatgpt", message, response, conversationId, true);
    return { response };
  } catch (err: any) {
    return {
      error: err.message,
    };
  }
}
