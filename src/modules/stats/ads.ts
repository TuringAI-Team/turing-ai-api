import supabase from "../supabase.js";
import { v4 as uuidv4 } from "uuid";

export async function saveMetrics() {
  let { data: activeCampaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("active", true);
  let data = {};
  activeCampaigns.forEach((campaign) => {
    data[campaign.title] = {
      id: campaign.id,
      stats: {
        totalViews: campaign.stats.views || 0,
        views: campaign.tempStats.views || 0,
        clicks: campaign.tempStats.clicks,
        totalClicks: campaign.stats.clicks,
        uniqueClicks: campaign.tempStats.uniqueClicks.length,
        totalUniqueClicks: campaign.stats.uniqueClicks.length,
        uniqueViews: campaign.tempStats.uniqueViews?.length || 0,
        totalUniqueViews: campaign.stats.uniqueViews?.length || 0,
        geoClicks: campaign.tempStats.geoClicks,
        totalGeoClicks: campaign.stats.geoClicks,
      },
    };
  });
  let newMetrics = {
    id: uuidv4(),
    type: "campaigns",
    time: new Date().toISOString(),
    data: data,
  };
  let { error } = await supabase.from("metrics").insert([newMetrics]);
  console.log(error);
  // clear temp stats
  await supabase.from("campaigns").update({ tempStats: {} }).eq("active", true);
}
