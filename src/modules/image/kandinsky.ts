import { predict } from "replicate-api";

export async function kandinsky(prompt, steps = 50, guidance_scale = 4) {
  const prediction = await predict({
    model: `ai-forever/kandinsky-2`, // The model name
    input: {
      prompt: prompt,
    }, // The model specific input
    token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
    poll: true, // Wait for the model to finish
  });

  if (prediction.error) return prediction.error;
  return prediction.output;
}
