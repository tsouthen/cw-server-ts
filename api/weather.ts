import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getWeatherData } from "../src/getWeatherData";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { name = "courtenay" } = Array.isArray(req.query) ? req.query[0] : req.query;
  try {
    const data = await getWeatherData(name);
    return res.json(data);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
