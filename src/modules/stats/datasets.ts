import supabase from "../supabase.js";
import { v4 as uuidv4 } from "uuid";

export default async function SaveDatasetMetrics() {
  let turingjourney0 = 0;
  let turingjourney1 = 0;
  // each dataset has more than 1k rows , so we need tto get all datasets with more than 1k rows
  let pages = 0;
  let continueLoop = true;
  while (continueLoop) {
    let { data: datasets, error } = await supabase
      .from("dataset")
      .select("*")
      .eq("dataset", "0-turingjourney")

      .range(pages * 1000, (pages + 1) * 1000 - 1);
    if (error) {
      console.log(error);
      continueLoop = false;
    }
    if (datasets.length == 0) {
      continueLoop = false;
    }
    turingjourney0 += datasets.length;
    pages++;
  }
  pages = 0;
  continueLoop = true;
  while (continueLoop) {
    let { data: datasets, error } = await supabase
      .from("dataset")
      .select("*")
      .eq("dataset", "1-turingjourney")

      .range(pages * 1000, (pages + 1) * 1000 - 1);
    if (error) {
      console.log(error);
      continueLoop = false;
    }
    if (datasets.length == 0) {
      continueLoop = false;
    }
    turingjourney1 += datasets.length;
    pages++;
  }

  console.log(turingjourney0, turingjourney1);
  if (turingjourney0) {
    await supabase.from("metrics").insert([
      {
        id: uuidv4(),
        time: new Date(),
        type: "datasets",
        data: {
          "0-turingjourney": turingjourney0,
          "1-turingjourney": turingjourney1,
        },
      },
    ]);
  }
}
