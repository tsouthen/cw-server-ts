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

  const utcHour = new Date().getUTCHours();
  let url = await getWeatherUrl(site, utcHour);
  if (!url) url = await getWeatherUrl(site, (utcHour - 1 + 24) % 24);
  if (!url) {
    throw new Error("No URL found for site: " + site.site);
  }
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

async function getWeatherUrl(site: { site: string; prov: string }, utcHour: number): Promise<string | undefined> {
  const provincePage = `https://dd.weather.gc.ca/citypage_weather/${site.prov}/${utcHour.toString().padStart(2, "0")}/`;
  const result = await fetch(provincePage);
  if (result.ok) {
    const hrefMatch = (await result.text())
      .split("\n")
      .find((line) => line.includes(`${site.site}_en.xml`))
      ?.match(/href="([^"]+)"/);
    if (hrefMatch && hrefMatch.length >= 2) return `${provincePage}${hrefMatch[1]}`;
  }
}
