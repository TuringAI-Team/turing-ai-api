import supabase from "./supabase.js";
export function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export async function saveResults(
  prompt: string,
  provider: string,
  result: object,
  platform: string,
  metadata: object
) {
  // check if the prompt is already in the database with same provider
  // if it is, update the result
  // if it isn't, create a new entry
  let { data: results, error } = await supabase
    .from("results")
    .select("*")
    .eq("prompt", prompt)
    .eq("provider", provider);
  if (error) {
    console.error(error);
    return;
  }
  if (results && results[0]) {
    // update
    const { data, error } = await supabase
      .from("results")
      .update({
        result: { ...result, ...results[0].result },
        uses: results[0].uses + 1,
        metadata: { ...metadata, ...results[0].metadata },
      })
      .eq("prompt", prompt)
      .eq("provider", provider);
    if (error) {
      console.error(error);
      return;
    }
  } else {
    // create
    const { data, error } = await supabase.from("results").insert([
      {
        prompt: prompt,
        provider: provider,
        result: result,
        platform: platform,
        metadata: metadata,
      },
    ]);
    if (error) {
      console.error(error);
      return;
    }
  }
  return true;
}
