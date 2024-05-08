import express from "express";
import { parseStringPromise } from "xml2js";
import sites from './sitelocations';
import { loadWeatherOffice } from "./extractor";

async function xmlToJson(xml: string) {
  return parseStringPromise(xml, { explicitArray: false, mergeAttrs: true, explicitRoot: false });
}

const app = express();
const port = 3000;

// app.use(express.json());
app.get("/weather/:id", async (req, res) => {
  const id = req.params.id.toLocaleLowerCase();
  // @todo use a.localCompare(b, "en", { sensitivity: "base" })
  const site = sites.find((entry) => entry.site === id || entry.nameEn.toLocaleLowerCase() === id);
  if (!site) {
    res.status(418).send({ message: "Unknown site id or name: " + req.params.id});
    return;
  }
  const url = new URL(
    `https://dd.weather.gc.ca/citypage_weather/xml/${site.prov}/${site.site}_e.xml`,
  );
  const result = await fetch(url);
  if (!result.ok) {
    res.status(418).send({ message: "Error fetching XML data for url: " + url});
    return;
  }
  const xml = await result.text();
  const json = await xmlToJson(xml);
  const data = loadWeatherOffice(json);
  res.send(data);
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}, try: http://localhost:${port}/weather/courtenay`);
});
