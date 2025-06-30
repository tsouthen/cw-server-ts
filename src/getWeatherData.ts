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

  const url = await getWeatherUrl(site);
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

async function getWeatherUrl(site: { site: string; prov: string }, utcHour?: number): Promise<string | undefined> {
  const first = utcHour === undefined;
  if (utcHour === undefined) {
    utcHour = new Date().getUTCHours();
  }
  const utcHourStr = utcHour.toString().padStart(2, "0");
  const provincePage = `https://dd.weather.gc.ca/citypage_weather/${site.prov}/${utcHourStr}/`;
  const provincePageResult = await fetch(provincePage);
  if (provincePageResult.ok) {
    const href = getWeatherUrlFromHtml(site, await provincePageResult.text());
    if (href) return `${provincePage}${href}`;
  }
  if (first) return await getWeatherUrl(site, (utcHour - 1 + 24) % 24);
}

function getWeatherUrlFromHtml(site: { site: string; prov: string }, htmlStr: string) {
  const hrefMatch = htmlStr
    .split("\n")
    .find((line) => line.includes(`${site.site}_en.xml`))
    ?.match(/href="([^"]+)"/);
  if (hrefMatch && hrefMatch.length >= 2) return hrefMatch[1];
}
