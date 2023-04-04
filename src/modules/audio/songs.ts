import { predict } from "replicate-api";
export async function Riffusion(prompt: string) {
  const prediction = await predict({
    model: "riffusion/riffusion", // The model name
    input: {
      prompt_a: prompt,
    }, // The model specific input
    token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
    poll: true, // Wait for the model to finish
  });

  if (prediction.error) return prediction.error;
  return prediction.output;
}
