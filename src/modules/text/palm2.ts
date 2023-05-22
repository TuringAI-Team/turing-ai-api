import axios from "axios";
import supabase from "../supabase.js";

export default async function Palm2(
  conversationId,
  message,
  temperature = 0.1
) {
  try {
    conversationId = `bison-${conversationId}`;
    let url = `https://autopush-generativelanguage.sandbox.googleapis.com/v1beta2/models/chat-bison-001:generateMessage?key=${process.env.PALM_KEY}`;
    let messages: any = [];
    messages = await getConversation(conversationId);
    messages.push({
      content: message,
    });
    console.log(messages);
    let res = await axios({
      method: "post",
      url: url,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        prompt: {
          messages,
        },
        temperature,
      },
    });
    console.log(res.data);
    let response = "";
    await saveConversation(conversationId, message, response);
  } catch (e: any) {
    console.log(JSON.stringify(e));
    return { error: e };
  }
}

async function getConversation(conversationId) {
  let { data, error } = await supabase
    .from("conversations_new")
    .select("*")
    .eq("id", conversationId);
  if (error) return { error };
  if (!data[0]) return [];
  return data[0].history;
}

async function saveConversation(conversationId, message, response) {
  let { data, error } = await supabase
    .from("conversations_new")
    .select("*")
    .eq("id", conversationId);
  if (error) return { error };
  if (!data[0]) {
    await supabase.from("conversations_new").insert({
      id: conversationId,
      history: [
        {
          author: 0,
          content: message,
        },
        {
          author: 1,
          content: response,
        },
      ],
      model: "chat-bison-001",
      tone: null,
    });
  } else {
    await supabase
      .from("conversations_new")
      .update({
        history: [
          ...data[0].history.messages,
          {
            author: 0,
            content: message,
          },
          {
            author: 1,
            content: response,
          },
        ],
      })
      .eq("id", conversationId);
  }
}
