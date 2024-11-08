import express from "express";
import { getWeatherData } from "./getWeatherData";

const app = express();
const port = 3000;

// app.use(express.json());
app.get("/weather/:id", async (req, res) => {
  try {
    const data = await getWeatherData(req.params.id);
    res.send(data);
  } catch (error: unknown) {
    res.status(418).send({ message: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}, try: http://localhost:${port}/weather/courtenay`);
});
