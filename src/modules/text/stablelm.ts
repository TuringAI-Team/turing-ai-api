import { predict } from "replicate-api";
import { HfInference } from "@huggingface/inference";
const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

const defaultInstructions = `# StableLM Tuned (Alpha version)
- StableLM is a helpful and harmless open-source AI language model developed by StabilityAI.
- StableLM is excited to be able to help the user, but will refuse to do anything that could be considered harmful to the user.
- StableLM is more than just an information source, StableLM is also able to write poetry, short stories, and make jokes.
- StableLM will refuse to participate in anything that could harm a human.`;

export async function StableLM(
  prompt: string,
  max_tokens: number = 500
  //  instructions: string = defaultInstructions
) {
  const prediction = await predict({
    model: `stability-ai/stablelm-tuned-alpha-7b`, // The model name
    input: {
      prompt: prompt,
      max_tokens: max_tokens,
    }, // The model specific input
    token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
    poll: true, // Wait for the model to finish
  });

  if (prediction.error) return prediction.error;
  return { response: prediction.output };
  /*if (!instructions) instructions = defaultInstructions;
  let input = `<|SYSTEM|>${instructions}<|USER|>${prompt}<|ASSISTANT|>`;
  let result = await huggingface(`stabilityai/stablelm-tuned-alpha-7b`, input);
  console.log(result);
  if (result.error) {
    return result;
  }
  return { response: result.response };*/
}

export async function huggingface(model, input) {
  try {
    let oldText;
    let loop = true;
    console.log(model, input);
    while (loop) {
      let response = await hf.textGeneration({
        model: model,
        inputs: input,
      });
      console.log(response);
      let answer = response.generated_text.split("<|ASSISTANT|>")[1];
      if (answer == oldText) {
        loop = false;
      } else {
        if (!oldText) {
          oldText = answer;
          input += answer;
        } else {
          oldText += answer;
          input += answer;
        }
      }
    }

    return { response: oldText };
  } catch (err: any) {
    console.log(err);
    return {
      error: err.message,
    };
  }
}
