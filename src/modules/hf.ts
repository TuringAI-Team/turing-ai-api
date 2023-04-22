import axios from "axios";
export async function textGeneration(model: string, body: object) {
  const response = await axios({
    url: `https://api-inference.huggingface.co/models/${model}`,
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    data: JSON.stringify(body),
  });
  return response.data[0];
}
