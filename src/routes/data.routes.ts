import express from "express";
import key from "../middlewares/key.js";
import supabase from "../db/supabase.js";
import { update } from "../utils/db.js";

const router = express.Router();

router.get("/user/:id", key, async (req, res) => {
  let { id } = req.params;

  let { data: user, error } = await supabase
    .from("users_new")
    .select("*")
    .eq("id", id);
  if (error)
    return res.json({ error: error.message, success: false }).status(400);
  if (!user[0])
    return res.json({ error: "user not found", success: false }).status(400);
  res.json(user[0]).status(200);
});
router.put("/user/:id", key, async (req, res) => {
  let { id } = req.params;
  let result = await update("update", {
    collection: "users",
    id,
    ...req.body,
  });

  if (result?.error)
    return res.json({ error: result.error, success: false }).status(400);
  res.json({ success: true }).status(200);
});

router.post("/user/:id", key, async (req, res) => {
  let { id } = req.params;
  let { data: user, error } = await supabase

    .from("users_new")
    .insert({
      id,
      ...req.body,
    })
    .select("*");
  if (error)
    return res.json({ error: error.message, success: false }).status(400);
  res.json(user[0]).status(200);
});
export default router;
