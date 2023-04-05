import { predict } from "replicate-api";

export async function controlnet(image, prompt, model = "normal") {
  const prediction = await predict({
    model: `jagilley/controlnet-${model}`, // The model name
    input: {
      image: image,
      prompt: prompt,
    }, // The model specific input
    token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
    poll: true, // Wait for the model to finish
  });

  if (prediction.error) return prediction.error;
  return prediction.output;
}
