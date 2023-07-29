import supabase from "../db/supabase.js";
import { randomUUID } from "crypto";

export async function dataset(
  type: string,
  ai: string,
  record: any,
  id?: string
) {
  if (type == "image" && ai != "vision") {
    // means record is an array of images
    record.forEach(async (r: any) => {
      await datasetSave(type, ai, r, r.id);
    });
  } else {
    await datasetSave(type, ai, record, id);
  }
}

export async function datasetSave(
  type: string,
  ai: string,
  record: any,
  id?: string
) {
  let datasetName = `turing-${ai}-${type}`;
  if (!id) id = randomUUID();

  // first check if the data with id exists
  let { data, error } = await supabase
    .from(datasetName)
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.log(error);
    throw error;
  }
  if (data) {
    // update
    let { data: d, error } = await supabase
      .from(datasetName)
      .update({
        record: [...(data.record || []), record],
      })
      .eq("id", id);
    if (error) {
      console.log(error);
      throw error;
    }
  } else {
    await supabase.from(datasetName).insert([
      {
        id: id,
        record: record,
        dataset: datasetName,
        ai: ai,
        type: type,
      },
    ]);
  }

  return {
    id,
  };
}
