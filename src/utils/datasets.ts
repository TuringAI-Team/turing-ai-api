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
    return;
  } else {
    console.log("saving dataset", id);
    return await datasetSave(type, ai, record, id);
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
    let buffer = Buffer.from(record.base64, "base64");
    // upload to supabase storage
    let { error } = await supabase.storage
      .from("datasets_new")
      .upload(`${datasetName}/${id}.png`, buffer, {
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
    // check if last update was more than 72 hours ago
    if (data[0].last_update < Date.now() - 72 * 60 * 60 * 1000) {
      id = randomUUID();
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
          last_update: Date.now(),
        },
      ]);
      if (error) {
        console.log(error);
        throw error;
      }
    } else {
      let { data: d, error } = await supabase
        .from("datasets_new")
        .update({
          record: [...(data[0].record || []), record],
          last_update: Date.now(),
        })
        .eq("dataset", datasetName)
        .eq("id", id);
      if (error) {
        console.log(error);
        throw error;
      }
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
        last_update: Date.now(),
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
