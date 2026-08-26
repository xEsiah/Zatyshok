import { Router, Request, Response } from "express";

const router = Router();

const isPrivateIP = (ip: string) => {
  if (!ip) return true;
  const cleanIp = ip.replace(/^::ffff:/, "");
  return (
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1" ||
    cleanIp.startsWith("10.") ||
    cleanIp.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(cleanIp)
  );
};

router.get("/", async (req: Request, res: Response) => {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Weather API key is not configured." });
  }

  const clientIp = (req.headers["cf-connecting-ip"] as string) || req.ip || "";
  const query = isPrivateIP(clientIp) ? "Paris" : clientIp;
  const apiUrl = `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=2&aqi=no`;

  try {
    const weatherResponse = await fetch(apiUrl);
    const weatherData: any = await weatherResponse.json();

    if (weatherResponse.status !== 200) {
      return res.status(weatherResponse.status).json(weatherData);
    }

    res.json(weatherData);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

export default router;
