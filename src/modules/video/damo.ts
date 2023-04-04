import { predict } from "replicate-api";

export default async function generateVideo(prompt: string) {
  const prediction = await predict({
    model: "cjwbw/damo-text-to-video", // The model name
    input: {
      prompt: prompt,
    }, // The model specific input
    token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
    poll: true, // Wait for the model to finish
  });

  if (prediction.error) return prediction.error;
  return prediction.output;
}
