import { predict } from "replicate-api";

export async function Vicuna(
  prompt: string,
  max_tokens: number = 500
  //  instructions: string = defaultInstructions
) {
  const prediction = await predict({
    model: `replicate/vicuna-13b`, // The model name
    input: {
      prompt: prompt,
      max_length: max_tokens,
    }, // The model specific input
    token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
    poll: true, // Wait for the model to finish
  });

  if (prediction.error) return prediction.error;
  return { response: prediction.output };
}
