import axios from "axios";
export async function openaiReq(
  key,
  model,
  maxTokens,
  messages,
  temperature,
  url
) {
  let response = await axios({
    url: "https://api.pawan.krd/v1/chat/completions",
    method: "POST",
    responseType: "stream",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },

    data: {
      model: model,
      max_tokens: maxTokens,
      messages: messages,
      temperature: temperature,
      stream: true,
    },
  });
  return response;
}
