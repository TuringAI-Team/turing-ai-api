import axios from "axios";
export async function openaiReq(
  key,
  model,
  maxTokens,
  messages,
  temperature,
  url
) {
  return await axios({
    url: url,
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
}
