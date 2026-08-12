// api/lyrics.js
import dotenv from "dotenv";

dotenv.config();

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || null;
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || "30000");
const ENABLE_API_FALLBACK = process.env.ENABLE_API_FALLBACK !== "false";

async function getLyricsWithBrowserless(artist, song) {
  if (!BROWSERLESS_TOKEN) {
    console.log("No Browserless token provided");
    return null;
  }

  try {
    const geniusUrl = `https://genius.com/${artist
      .toLowerCase()
      .replace(/\s+/g, "-")}-${song.toLowerCase().replace(/\s+/g, "-")}-lyrics`;

    console.log(`[Browserless] Scraping: ${geniusUrl}`);

    const response = await fetch("https://chrome.browserless.io/function", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BROWSERLESS_TOKEN}`,
      },
      body: JSON.stringify({
        code: `async () => {
          const page = await browser.newPage();
          page.setDefaultNavigationTimeout(30000);
          
          try {
            await page.goto('${geniusUrl}', { waitUntil: 'networkidle2' });
            
            const lyrics = await page.evaluate(() => {
              const containers = document.querySelectorAll('[data-testid="Lyrics__Container"]');
              if (containers.length === 0) return null;
              
              const allLyrics = Array.from(containers)
                .map(container => container.innerText)
                .join('\\n\\n');
              
              return allLyrics.trim();
            });
            
            await page.close();
            return lyrics;
          } catch (error) {
            console.error('Page error:', error);
            await page.close();
            return null;
          }
        }`,
      }),
    });

    if (!response.ok) {
      console.error(`Browserless error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data || null;
  } catch (error) {
    console.error("Browserless scraping error:", error);
    return null;
  }
}

async function getLyricsWithAPI(artist, song) {
  try {
    const response = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.lyrics || null;
  } catch (error) {
    console.error("Lyrics API error:", error);
    return null;
  }
}

export default async function handler(req, res) {
  // CORS headers
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

  const { artist, song, fallback } = req.query;

  if (!artist || !song) {
    return res.status(400).json({
      error: "Missing artist or song parameter",
      example: "/api/lyrics?artist=The%20Weeknd&song=Blinding%20Lights",
      usage: "Add ?fallback=false to disable lyrics.ovh fallback",
    });
  }

  try {
    let lyrics = null;
    let source = null;

    // Try Genius scraping via Browserless
    if (BROWSERLESS_TOKEN) {
      console.log(
        `[${new Date().toISOString()}] Scraping Genius: ${artist} - ${song}`
      );
      lyrics = await getLyricsWithBrowserless(artist, song);
      if (lyrics) {
        source = "genius-scraped";
      }
    }

    // Fallback to lyrics.ovh if Browserless failed or not configured
    if (!lyrics && ENABLE_API_FALLBACK && fallback !== "false") {
      console.log(
        `[${new Date().toISOString()}] Falling back to lyrics.ovh: ${artist} - ${song}`
      );
      lyrics = await getLyricsWithAPI(artist, song);
      if (lyrics) {
        source = "lyrics-ovh-fallback";
      }
    }

    if (!lyrics) {
      return res.status(404).json({
        error: "Lyrics not found",
        artist,
        song,
        message: "Song not found on Genius or lyrics.ovh",
        tip: "Try a different artist or song name",
      });
    }

    return res.status(200).json({
      success: true,
      artist,
      song,
      lyrics,
      source,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
