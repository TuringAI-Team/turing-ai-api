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
  if (record.base64) {
    // upload to supabase storage
    let { error } = await supabase.storage
      .from("datasets_new")
      .upload(`${datasetName}/${id}.png`, record.base64, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.log(error);
      throw error;
    }
    let { data } = await supabase.storage
      .from("datasets_new")
      .getPublicUrl(`${datasetName}/${id}.png`);


    record.url = data.publicUrl;
    delete record.base64;
  }

  // first check if the data with id exists
  let { data, error } = await supabase
    .from("datasets_new")
    .select("*")
    .eq("dataset", datasetName)
    .eq("id", id);

  if (error) {
    console.log(error);
    throw error;
  }
  if (data && data.length > 0) {
    // update
    let { data: d, error } = await supabase
      .from("datasets_new")
      .update({
        record: [...(data[0].record || []), record],
      })
      .eq("dataset", datasetName)
      .eq("id", id);


    if (error) {
      console.log(error);
      throw error;
    }
  } else {
    let { error } = await supabase.from("datasets_new").insert([
      {
        id: id,
        record: record,
        dataset: datasetName,
        model: ai,
        rates: {
          "1": 0,
        },
        type: type,
      },
    ]);

  
    if (error) {
      console.log(error);
      throw error;
    }
  }

  return {
    id,
  };
}
