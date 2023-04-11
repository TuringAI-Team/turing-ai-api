import { getMessages } from "./index.js";
import { randomUUID } from "crypto";
import supabase from "../supabase.js";
import cld from "cld";
import fs from "fs";

export default async function SaveInDataset(conversation, userName) {
  let msgs = await getMessages(conversation, "chatgpt");
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
  var lastR = {};
  for (let i = 0; i < msgs.length; i++) {
    let msg = msgs[i];
    // if is first user message
    if (msg.role == "user" && i == 0) {
      data.prompt.text = msg.content;
      data.prompt.lang = await getLang(msg.content);
    }
    // for the next replies follow this format, the assistant add a reply to the prompter, the prompter apply a reply to the assistant, the assistant apply a reply to the prompter reply and so on.
  }
  console.log(JSON.stringify(data));
  fs.writeFileSync("./data1.json", JSON.stringify(data), "utf-8");
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
