import { Configuration, OpenAIApi } from "openai";
import { getKey, removeMessage } from "../openai.js";

export default async function generateImgD(
  prompt: string,
  number: number = 1,
  size: string = "512x512"
) {
  let acc = await getKey();
  if (!acc) {
    return {
      error: "We are at maximum capacity, please try again later.",
    };
  }
  let key = acc.key;
  const configuration = new Configuration({
    apiKey: key,
  });
  const openai = new OpenAIApi(configuration);
  const response = await openai.createImage({
    prompt: prompt,
    n: number,
    size: "512x512",
  });
  var imagesArr = response.data.data.map((d, i) => {
    return { attachment: d.url, name: `result-${i}.png` };
  });
  await removeMessage(acc.id);

  return imagesArr;
}
