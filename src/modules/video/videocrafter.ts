import { predict } from "replicate-api";

export default async function generateVideo(
  prompt: string,
  ddim_steps: number = 50,
  lora_model: string = "None"
) {
  const prediction = await predict({
    model: "cjwbw/videocrafter", // The model name
    input: {
      prompt: prompt,
      ddim_steps: ddim_steps,
      lora_model: lora_model,
    }, // The model specific input
    token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
    poll: true, // Wait for the model to finish
  });

  if (prediction.error) return prediction.error;
  return prediction.output;
}
