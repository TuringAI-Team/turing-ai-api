import { PoeClient, BotNickNameEnum } from "poe-node-api";
import EventEmitter from "events";
import supabase from "../supabase.js";

export async function initPoeClient() {
  let acc = await getAcc();
  const client = new PoeClient({
    debug: false,
    cookie: `p-b=${acc.cookie}`,
  });
  await addMsg(acc);
  await client.init();
  return { client, acc };
}
export default function Poe(prompt: string, c, model: string = "claude") {
  let eventEmitter = new EventEmitter();
  let { client, acc } = c;

  try {
    let reply = "";
    let modelValue = BotNickNameEnum.a2;
    client
      .sendMessage(prompt, modelValue, false, (result: string) => {
        eventEmitter.emit("data", {
          result: result,
          done: false,
        });
        reply = result;
      })
      .then((response) => {
        if (response.extensions.is_final) {
          eventEmitter.emit("data", {
            result: reply,
            done: true,
          });
        }
        removeMsg(acc);
      });

    return eventEmitter;
  } catch (error) {
    removeMsg(acc);
    eventEmitter.emit("data", {
      error: error,
      done: true,
    });
    return eventEmitter;
  }
}

async function getAcc() {
  let { data, error } = await supabase.from("poe_accs").select("*");
  let accs = data.filter((acc) => acc.messages < 5);
  // sort by messages
  accs = accs.sort((a, b) => a.messages - b.messages);
  // random one from the top 3
  let acc = accs[Math.floor(Math.random() * (accs.length / 2))];
  return acc;
}
async function addMsg(acc) {
  let { data, error } = await supabase
    .from("poe_accs")
    .update({
      messages: acc.messages + 1,
      totalMessages: acc.totalMessages + 1,
    })
    .eq("id", acc.id);
  return data;
}
async function removeMsg(acc) {
  let { data, error } = await supabase

    .from("poe_accs")
    .update({ messages: acc.messages - 1 })
    .eq("id", acc.id);
  return data;
}
