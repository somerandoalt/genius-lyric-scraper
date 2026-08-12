// api/lyrics.js
import puppeteer from "puppeteer";
import dotenv from "dotenv";

// Load .env file for local development
dotenv.config();

// Environment variables
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || null;
const GENIUS_TOKEN = process.env.GENIUS_TOKEN || null;
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || "30000");
const ENABLE_API_FALLBACK = process.env.ENABLE_API_FALLBACK !== "false";

async function getLyricsWithPuppeteer(artist, song) {
  let browser;
  try {
    if (BROWSERLESS_TOKEN) {
      // Using browserless.io (remote chrome)
      browser = await puppeteer.connect({
        browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`,
      });
    } else {
      // Fallback: local chrome (only works if Chrome is installed)
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(API_TIMEOUT);

    // Build the Genius URL
    const geniusUrl = `https://genius.com/${artist
      .toLowerCase()
      .replace(/\s+/g, "-")}-${song.toLowerCase().replace(/\s+/g, "-")}-lyrics`;

    await page.goto(geniusUrl, { waitUntil: "networkidle2" });

    // Extract lyrics from all containers
    const lyrics = await page.evaluate(() => {
      const containers = document.querySelectorAll(
        '[data-testid="Lyrics__Container"]'
      );
      if (containers.length === 0) return null;

      const allLyrics = Array.from(containers)
        .map((container) => container.innerText)
        .join("\n\n");

      return allLyrics.trim();
    });

    await page.close();
    return lyrics;
  } catch (error) {
    console.error("Puppeteer error:", error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

async function getLyricsWithAPI(artist, song) {
  // Fallback to lyrics.ovh for free users
  try {
    const response = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`
    );
    const data = await response.json();
    return data.lyrics || null;
  } catch (error) {
    console.error("API fallback error:", error);
    return null;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { artist, song, method } = req.query;

  if (!artist || !song) {
    return res.status(400).json({
      error: "Missing artist or song parameter",
      example: "/api/lyrics?artist=The%20Weeknd&song=Blinding%20Lights",
    });
  }

  // Rate limiting (simple in-memory, use Redis for production)
  const key = `${artist}-${song}`;

  try {
    let lyrics = null;

    // Try Puppeteer first if Browserless token is set
    if (BROWSERLESS_TOKEN || method === "scrape") {
      console.log(`[${new Date().toISOString()}] Scraping Genius: ${artist} - ${song}`);
      lyrics = await getLyricsWithPuppeteer(artist, song);
    }

    // Fallback to lyrics.ovh if scraping fails or no token
    if (!lyrics && ENABLE_API_FALLBACK) {
      console.log(`[${new Date().toISOString()}] Falling back to lyrics.ovh: ${artist} - ${song}`);
      lyrics = await getLyricsWithAPI(artist, song);
    }

    if (!lyrics) {
      return res.status(404).json({
        error: "Lyrics not found",
        artist,
        song,
      });
    }

    return res.status(200).json({
      success: true,
      artist,
      song,
      lyrics,
      source: BROWSERLESS_TOKEN ? "genius-scraped" : "lyrics-api",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
