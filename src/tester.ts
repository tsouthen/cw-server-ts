import { getWeatherData } from "./getWeatherData";

async function tester() {
  const request = process.argv.length > 2 ? process.argv[process.argv.length - 1] : "courtenay";
  const data = await getWeatherData(request);
  console.log(data);
  process.exit(0);
}
tester();
