import { getWeatherData } from "./getWeatherData";

async function tester() {
  const data = await getWeatherData("courtenay");
  console.log(data);
}
tester();
