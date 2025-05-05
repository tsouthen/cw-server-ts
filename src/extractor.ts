function upperCaseFirstLetters(text: string) {
  return text
    .split(" ")
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

function separateWords(text: string) {
  const newText = text.replace(/([A-Z])/g, " $1").trim();
  return newText.charAt(0).toUpperCase() + newText.slice(1);
}

export function getAsOfLabel(dateTime?: Date) {
  if (!dateTime) return "Now";

  let titleText = "";
  const diff = Date.now() - dateTime.valueOf();
  let minutes = Math.round(diff / 60000);
  if (minutes > 60) {
    minutes = Math.round(minutes / 15) * 15;
    const hours = Math.round((minutes / 60) * 100) / 100;
    if (hours === 1) {
      titleText = `An hour ago`;
    } else {
      titleText = `${hours} hours ago`;
    }
  } else if (minutes === 60) {
    titleText = "An hour ago";
  } else if (minutes === 30) {
    titleText = "Half an hour ago";
  } else {
    titleText = `${minutes} minutes ago`;
  }
  return titleText;
}

function isString(item: unknown): item is string {
  return item !== null && item !== undefined && "string" === typeof item;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function valueOrEmptyString(item: any) {
  return isString(item) ? item : "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadWeatherOffice(responseJson: any) {
  return {
    location: responseJson.location, //TODO: extract to a better know data structure
    forecast: loadCurrentAndForecasts(responseJson),
    hourly: loadHourlyForecasts(responseJson),
    yesterday: loadYesterday(responseJson),
    almanac: loadAlmanac(responseJson),
    sun: loadSunRiseSet(responseJson),
  };
}

export type WeatherEntry = {
  icon: string;
  title: string;
  summary: string;
  temperature: string;
  expanded: boolean;
  isNight: boolean;
  dateTime?: Date;
  warning?: string;
  warningUrl?: string;
  precip?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadCurrentAndForecasts(responseJson: any) {
  const entries: WeatherEntry[] = [];

  try {
    // create a forecast entry for the current conditions
    const temperature = responseJson.currentConditions?.temperature?._;
    if (temperature) {
      const dateTime = parseFirstTimeStamp(responseJson.currentConditions?.dateTime);
      const warningDesc = responseJson.warnings?.event?.description;

      const entry: WeatherEntry = {
        icon: responseJson.currentConditions.iconCode._,
        title: getAsOfLabel(dateTime),
        summary: valueOrEmptyString(responseJson.currentConditions.condition),
        temperature,
        expanded: true,
        isNight: false,
        dateTime,
        warning: warningDesc ? upperCaseFirstLetters(warningDesc) : undefined,
        warningUrl: warningDesc ? valueOrEmptyString(responseJson.warnings?.event?.url) : undefined,
      };

      // console.debug(entry);
      entries.push(entry);
    }

    // create entries for each forecast
    let dateTime = parseFirstTimeStamp(responseJson.forecastGroup?.dateTime);

    const forecasts = responseJson.forecastGroup?.forecast;
    if (forecasts?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      forecasts.forEach((forecastEntry: any) => {
        //remove temperature summary from overall summary
        let textSummary = forecastEntry.textSummary;
        if (isString(forecastEntry.temperatures.textSummary))
          textSummary = textSummary.replace(forecastEntry.temperatures.textSummary, "");
        entries.push({
          icon: forecastEntry.abbreviatedForecast?.iconCode?._ ?? forecastEntry.iconCode?._,
          title: forecastEntry.period.textForecastName,
          summary: textSummary,
          temperature: forecastEntry.temperatures?.temperature?._ ?? "",
          expanded: entries.length == 0,
          isNight: forecastEntry.temperatures?.temperature?.class === "low",
          dateTime: dateTime,
          precip: forecastEntry.abbreviatedForecast?.pop?._,
        });
        dateTime = undefined;
      });
    }
  } catch (error) {
    console.error(error);
  }
  return entries;
}

function parseTimeStamp(timeStamp: string) {
  // YYYYMMDDHHMM
  const formatted =
    timeStamp.slice(0, 4) +
    "-" +
    timeStamp.slice(4, 6) +
    "-" +
    timeStamp.slice(6, 8) +
    "T" +
    timeStamp.slice(8, 10) +
    ":" +
    timeStamp.slice(10, 12) +
    ":00.000Z";
  return new Date(formatted);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFirstTimeStamp(dateTimes: any) {
  if (dateTimes?.length) return parseTimeStamp(dateTimes[0].timeStamp);
}

export type WeatherHourlyEntry = {
  icon?: string | { type: string; name: string };
  title: string;
  summary?: string;
  temperature?: string;
  expanded?: boolean;
  isNight?: boolean;
  isOther: boolean;
  heading?: string;
  value?: string;
  fontWeight?: string;
  key?: string;
  precip?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getHourlyAndRiseSet(responseJson: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: any[] = [];
  if (responseJson.hourlyForecastGroup?.hourlyForecast?.length > 1) {
    entries.push(...responseJson.hourlyForecastGroup.hourlyForecast);

    if (responseJson.riseSet?.dateTime?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const utcEntries = responseJson.riseSet.dateTime.filter((entry: any) => entry.zone === "UTC");
      if (utcEntries.length) {
        entries.push(...utcEntries);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entries.sort((a: any, b: any) => {
          const aStamp = a.dateTimeUTC ?? a.timeStamp?.substr(0, 12);
          const bStamp = b.dateTimeUTC ?? b.timeStamp?.substr(0, 12);
          if (aStamp && aStamp.length && bStamp && bStamp.length) {
            return Number(aStamp) - Number(bStamp);
          }
          return 0;
        });
      }
    }
  }
  return entries;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadHourlyForecasts(responseJson: any) {
  const entries: WeatherHourlyEntry[] = [];

  // const test = getHourlyAndRiseSet(responseJson);

  if (responseJson.hourlyForecastGroup?.hourlyForecast?.length > 1) {
    // let utcTimeStamp = responseJson.hourlyForecastGroup.dateTime[0].timeStamp;
    // let localHour = parseInt(responseJson.hourlyForecastGroup.dateTime[1].hour);
    let utcOffset = Number(responseJson.hourlyForecastGroup.dateTime[1].UTCOffset);
    let minSuffix: string | undefined;
    if (!Number.isInteger(utcOffset)) {
      // console.debug('utcOffset non integer: ' + utcOffset);
      const mins = Math.round((utcOffset - Math.floor(utcOffset)) * 60);
      utcOffset = Math.floor(utcOffset);
      minSuffix = "";
      if (mins < 10) minSuffix = "0";
      minSuffix += "" + mins;
      // console.debug('minSuffix: ' + minSuffix);
    } else {
      minSuffix = "00";
    }

    let sunrise = 6;
    let sunset = 18;
    const riseSetData = getSunriseSunset(responseJson);
    riseSetData.forEach((entry) => {
      if (entry.name === "sunrise") sunrise = entry.hour;
      else sunset = entry.hour + 12;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    responseJson.hourlyForecastGroup.hourlyForecast.forEach((entry: any, index: number) => {
      let currHour = parseInt(entry.dateTimeUTC.substr(8, 2));
      currHour += utcOffset;
      if (currHour < 0) currHour += 24;
      if (currHour >= 24) currHour -= 24;
      let displayHour = currHour;
      let suffix = ":" + minSuffix + " am";
      if (displayHour >= 12) suffix = ":" + minSuffix + " pm";
      if (displayHour > 12) displayHour -= 12;
      if (displayHour == 0) displayHour = 12;

      let heading = undefined;
      if (index === 0) {
        heading = "Today";
      } else if (currHour === 0) {
        heading = "Tomorrow";
      }

      entries.push({
        icon: entry.iconCode?._,
        title: "" + displayHour + suffix,
        summary: entry.condition,
        temperature: entry.temperature?._,
        expanded: entries.length === 0 || entry.condition !== entries[entries.length - 1].summary,
        isNight: currHour > sunset || currHour < sunrise,
        isOther: true,
        heading,
        precip: entry.lop?._,
      });
    });
  }
  return entries;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadYesterday(responseJson: any) {
  const entries: WeatherHourlyEntry[] = [];
  let heading: string | undefined = "Yesterday";
  const yesterday = responseJson.yesterdayConditions;
  if (yesterday) {
    if (yesterday.temperature?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yesterday.temperature.forEach((entry: any) => {
        const isNight = entry.class.endsWith("low");
        entries.push({
          heading,
          title: separateWords(entry.class),
          temperature: entry._,
          isNight: isNight,
          isOther: true,
          icon: {
            type: "feather",
            name: isNight ? "arrow-down-circle" : "arrow-up-circle",
          },
        });
        heading = undefined;
      });
    }
    if (yesterday.precip && yesterday.precip._ && yesterday.precip._ != "0.0") {
      let precipVal = yesterday.precip._;
      if (!isNaN(Number(precipVal))) precipVal += ` ${yesterday.precip.units}`;
      entries.push({
        title: "Precipitation",
        value: precipVal,
        isOther: true,
        icon: { type: "feather", name: "umbrella" },
      });
      heading = undefined;
    }
  }
  return entries;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadAlmanac(responseJson: any) {
  const normals: WeatherHourlyEntry[] = [];
  const extremes: WeatherHourlyEntry[] = [];
  let normalsHeading: string | undefined = "Normals for today";
  let extremesHeading: string | undefined = "Extremes for today";

  const addEntry = (newEntry: WeatherHourlyEntry) => {
    if (newEntry.title.startsWith("Normal ")) {
      newEntry.heading = normalsHeading;
      newEntry.title = newEntry.title.substr(7);
      let isMean = false;
      if (newEntry.title == "Mean") {
        newEntry.title = "Average";
        newEntry.fontWeight = "normal";
        isMean = true;
      }
      // put mean before min if we already have a normals entry
      if (isMean && normals.length == 2) {
        normals.splice(1, 0, newEntry);
      } else {
        normals.push(newEntry);
      }
      normalsHeading = undefined;
    } else if (newEntry.title.startsWith("Extreme ")) {
      newEntry.heading = extremesHeading;
      newEntry.title = newEntry.title.substr(8);
      // skip duplicate entries where all that differs is the title (extremeRainfall and extremePrecipitation)
      if (
        !newEntry.value ||
        !extremes.find((entry) => entry.summary === newEntry.summary && entry.value === newEntry.value)
      ) {
        extremes.push(newEntry);
        extremesHeading = undefined;
      }
    } else {
      newEntry.heading = normalsHeading;
      normals.push(newEntry);
      normalsHeading = undefined;
    }
  };

  const almanac = responseJson.almanac;
  if (almanac?.temperature?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    almanac.temperature.forEach((entry: any) => {
      if (entry._) {
        let icon = "thermometer_mean";
        if (entry.class.endsWith("Max")) icon = icon = "thermometer_max";
        else if (entry.class.endsWith("Min")) icon = "thermometer_min";
        addEntry({
          key: entry.class,
          title: separateWords(entry.class),
          temperature: entry._,
          isNight: entry.class.endsWith("Min"),
          isOther: true,
          summary: entry.year,
          expanded: !!entry.year,
          icon: icon,
        });
      }
    });
  }
  if (almanac?.precipitation?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    almanac.precipitation.forEach((entry: any) => {
      if (entry._ && entry._ !== "0.0") {
        let iconName = "umbrella";
        if (entry.class.toLowerCase().includes("rain")) iconName = "cloud-rain";
        else if (entry.class.toLowerCase().includes("snow")) iconName = "cloud-snow";
        addEntry({
          key: entry.class,
          title: separateWords(entry.class),
          value: `${entry._} ${entry.units}`,
          isOther: true,
          summary: entry.year,
          expanded: !!entry.year,
          icon: { type: "feather", name: iconName },
        });
      }
    });
  }
  return [...normals, ...extremes];
}

function getSunRiseSetTitle(name: string) {
  switch (name) {
    case "sunrise":
      return "Rise";
    case "sunset":
      return "Set";
  }
  return separateWords(name);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSunriseSunset(responseJson: any) {
  const entries: {
    name: string;
    hour: number;
    minutes: number;
    suffix: string;
  }[] = [];
  const riseSet = responseJson.riseSet;
  if (riseSet && riseSet.dateTime && riseSet.dateTime.length) {
    // only the UTC entries seem to have the correct data but we need to find the UTC offset in the non-UTC data first
    const utcOffset =
      Number(riseSet.dateTime.find((entry: { zone: string; UTCOffset: string }) => entry.zone !== "UTC")?.UTCOffset) ??
      0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    riseSet.dateTime.forEach((entry: any) => {
      if (entry.zone === "UTC") {
        let hour = Number(entry.hour) + utcOffset;
        if (hour < 0) hour += 24;
        let suffix = "am";
        if (hour >= 12) {
          if (hour > 12) hour -= 12;
          suffix = "pm";
        }
        entries.push({
          name: entry.name,
          hour,
          minutes: Number(entry.minute),
          suffix,
        });
      }
    });
  }
  return entries;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadSunRiseSet(responseJson: any) {
  const riseSetData = getSunriseSunset(responseJson);
  let heading: string | undefined = "Sun rise & set";
  return riseSetData.map((entry) => {
    const result: WeatherHourlyEntry = {
      heading,
      title: getSunRiseSetTitle(entry.name),
      value: `${entry.hour}:${entry.minutes.toString().padStart(2, "0")} ${entry.suffix}`,
      isOther: true,
      isNight: false,
      icon: entry.name,
    };
    heading = undefined;
    return result;
  });
}
