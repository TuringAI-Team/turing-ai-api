import { getMessages } from "./index.js";
import { randomUUID } from "crypto";
import supabase from "../supabase.js";
import cld from "cld";
import fs from "fs";

export default async function SaveInDataset(conversation, userName, model) {
  /*let msgs = await getMessages(conversation, "chatgpt");
  let id = randomUUID();
  let data: any = {
    id: id,
    prompt: {
      text: "",
      role: "prompter",
      lang: "",
      replies: [],
    },
  };
  console.log(msgs.length);
  let lastMsg;
  for (let i = 0; i < msgs.length; i++) {
    let msg = msgs[i];
    let content = msg.content.replaceAll(userName, "user");
    // if is first user message
    if (msg.role == "user" && i == 0) {
      data.prompt.text = content;
      data.prompt.lang = await getLang(msg.content);
      lastMsg = data.prompt.replies;
    }
    if (msg.role == "assistant" && i == 1) {
      lastMsg.push({
        text: content,
        role: "assistant",
        lang: await getLang(msg.content),
        replies: [],
      });
      lastMsg = data.prompt.replies[0].replies;
    }
    if (i > 1) {
      lastMsg.push({
        text: content,
        role: "prompter",
        lang: await getLang(msg.content),
        replies: [],
      });
      lastMsg = lastMsg[0].replies;
    }
  }*/
  let id = randomUUID();

  try {
    await supabase.from("dataset").insert([
      {
        id: id,
        model: model,
        data: conversation,
        dataset: `1-alan`,
      },
    ]);
  } catch (err) {
    console.log(err);
  }
}

async function getLang(text) {
  let langCode = "en";
  try {
    let langObj = await cld.detect(text);
    if (langObj.reliable && langObj.languages[0].code != "en") {
      langCode = langObj.languages[0].code;
    }
  } catch (err) {}
  return langCode;
}
