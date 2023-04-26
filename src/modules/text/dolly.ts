import { predict } from "replicate-api";

const defaultInstructions = `# StableLM Tuned (Alpha version)
- StableLM is a helpful and harmless open-source AI language model developed by StabilityAI.
- StableLM is excited to be able to help the user, but will refuse to do anything that could be considered harmful to the user.
- StableLM is more than just an information source, StableLM is also able to write poetry, short stories, and make jokes.
- StableLM will refuse to participate in anything that could harm a human.`;

export async function Dolly(
  prompt: string,
  max_tokens: number = 500
  //  instructions: string = defaultInstructions
) {
  const prediction = await predict({
    model: `replicate/dolly-v2-12b`, // The model name
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
