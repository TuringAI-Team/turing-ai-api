import chatGPT3 from "./gpt-3.js";
import chatGPT35 from "./chatgpt.js";
import supabase from "../supabase.js";
import OpenAssistant from "./oa.js";
import Alan from "./alan.js";

export async function getConversation(id, model): Promise<any> {
  var { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("model", model);
  if (data && data[0]) {
    if (!data[0].conversation) return;
    return data[0].conversation;
  }
  return;
}

export async function saveMsg(model, userMsg, aiMsg, id, ispremium) {
  var conversation;
  if (model == "gpt-3") {
    conversation = `\n<split>User: ${userMsg}\nAI: ${aiMsg}`;
  }
  if (
    model == "chatgpt" ||
    model == "dan" ||
    model == "alan-gpt3" ||
    model == "alan-chatgpt"
  ) {
    conversation = `user: ${userMsg}<split>assistant: ${aiMsg}<split>`;
  }
  var { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("model", model);
  if (!data || !data[0]) {
    await supabase.from("conversations").insert({
      id: id,
      model: model,
      conversation: conversation,
      lastMessage: Date.now(),
    });
  } else {
    var previous = data[0].conversation;
    if (previous) {
      if (model == "chatgpt" || model == "dan") {
        var messages = [];
        previous.split("<split>").forEach((msg) => {
          // role: content
          var role = msg.split(":")[0];
          var content = msg.split(":")[1];
          if (role == "user" || role == "system" || role == "assistant") {
            messages.push({
              role: role,
              content: content,
            });
          }
        });
        var max = 6;
        if (ispremium == true) max = 12;
        if (messages.length > max) {
          messages.shift();
          messages.shift();
        }
        previous = messages
          .map((x) => `${x.role}: ${x.content}`)
          .join("<split>");
      } else {
        previous = previous.split("\n<split>");
        previous = previous.filter((x) => x != "");
        var length = previous.length;
        var max = 3;
        if (ispremium == true) max = 6;
        if (length > max) {
          previous.shift();
        }
        previous = previous.join("\n<split>");
      }
    }

    conversation = `${previous ? previous : ""}${conversation}`;

    await supabase
      .from("conversations")
      .update({
        conversation: conversation,
        lastMessage: Date.now(),
      })
      .eq("id", id)
      .eq("model", model);
  }
}
export async function getMessages(
  conversation,
  model: string,
  fullMsg?: string,
  instructions?: string
) {
  if (model == "chatgpt" || model == "dan" || model == "gpt4") {
    let messages = [];
    if (instructions) {
      messages.push({
        role: "system",
        content: instructions,
      });
    }
    if (conversation) {
      conversation.split("<split>").forEach((msg) => {
        // role: content
        if (msg) {
          let role = msg.split(":")[0];
          let content = msg.split(":")[1];
          if (role == "user" || role == "system" || role == "assistant") {
            messages.push({
              role: role,
              content: content,
            });
          }
        }
      });
    }
    if (fullMsg) {
      messages.push({
        role: "user",
        content: fullMsg,
      });
    }
    return messages;
  } else {
    let prompt = `${instructions ? instructions : ""}${
      conversation ? conversation : ""
    }\nUser: ${fullMsg}\nAI:\n`;
    return prompt;
  }
}

export { chatGPT3, chatGPT35, OpenAssistant, Alan };
