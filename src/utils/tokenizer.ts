import { get_encoding } from "@dqbd/tiktoken";
export const encoder = get_encoding("cl100k_base");

/**
 * Get the length of a prompt.
 * @param content Prompt to check
 *
 * @returns Length of the prompt, in tokens
 */
export const getPromptLength = (content: string): number => {
  if (!content) return 0;
  content = content
    .replaceAll("<|endoftext|>", "<|im_end|>")
    .replaceAll("<|endofprompt|>", "<|im_end|>");
  return encoder.encode(content).length;
};

export const getChatMessageLength = (messages: []): number => {
  /* Total tokens used for the messages */
  let total: number = 0;

  for (const message of messages) {
    /* Map each property of the message to the number of tokens it contains. */
    const propertyTokenCounts = Object.entries(message).map(
      ([_, value]: any) => {
        /* Count the number of tokens in the property value. */
        return getPromptLength(value);
      }
    );

    /* Sum the number of tokens in all properties and add 4 for metadata. */
    total += propertyTokenCounts.reduce((a, b) => a + b, 4);
  }

  return total + 2;
};
