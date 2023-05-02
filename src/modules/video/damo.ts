import { predict } from "replicate-api";

export default async function generateVideo(
  prompt: string,
  num_frames: number = 16,
  num_inference_steps: number = 50,
  fps: number = 8
) {
  const prediction = await predict({
    model: "cjwbw/damo-text-to-video", // The model name
    input: {
      prompt: prompt,
      num_frames: num_frames,
      num_inference_steps: num_inference_steps,
      fps: fps,
    }, // The model specific input
    token: process.env.REPLICATE_API_KEY, // You need a token from replicate.com
    poll: true, // Wait for the model to finish
  });

  if (prediction.error) return prediction.error;
  return prediction.output;
}
