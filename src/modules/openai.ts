import supabase from "./supabase.js";
import { getRndInteger } from "./utils.js";

export async function getKey() {
  let keys = await getKeys();
  if (!keys || keys.length <= 0) {
    return;
  }
  let k = keys.filter((x) => x.messages <= 4 && x.abled != false);
  let i = getRndInteger(0, k.length - 1);
  if (k.length <= 0) return;
  let key = k[i];
  if (key) {
    await addMessage(key.id);
    return { key: key.key, id: key.id };
  } else {
    return;
  }
}
async function getKeys() {
  let { data: accounts, error } = await supabase.from("accounts").select("*");
  if (error) {
    return null;
  }

  return accounts;
}

async function addMessage(id) {
  let { data: accounts, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id);
  var tokenObj = accounts[0];
  if (tokenObj) {
    const { data, error } = await supabase
      .from("accounts")
      .update({
        messages: tokenObj.messages + 1,
        totalMessages: tokenObj.totalMessages + 1,
      })
      .eq("id", id);
  }
}
export async function removeMessage(id) {
  let { data: accounts, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id);
  var tokenObj = accounts[0];
  if (tokenObj) {
    const { data, error } = await supabase
      .from("accounts")
      .update({ messages: tokenObj.messages - 1 })
      .eq("id", id);
  }
}
