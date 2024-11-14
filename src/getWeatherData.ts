import { parseStringPromise } from "xml2js";
import { loadWeatherOffice } from "./extractor";
import sites from "./sitelocations";

export async function getWeatherData(requestedId: string) {
  const id = requestedId.toLocaleLowerCase();
  // @todo use a.localCompare(b, "en", { sensitivity: "base" })
  const site = sites.find((entry) => entry.site === id || entry.nameEn.toLocaleLowerCase() === id);
  if (!site) {
    throw new Error("Unknown site id or name: " + requestedId);
  }
  const url = new URL(`https://dd.weather.gc.ca/citypage_weather/xml/${site.prov}/${site.site}_e.xml`);
  const result = await fetch(url);
  if (!result.ok) {
    throw new Error("Error fetching XML data for url: " + url);
  }
  const xml = await result.text();
  const json = await xmlToJson(xml);
  const data = loadWeatherOffice(json);
  return data;
}

async function xmlToJson(xml: string) {
  return parseStringPromise(xml, { explicitArray: false, mergeAttrs: true, explicitRoot: false });
}
