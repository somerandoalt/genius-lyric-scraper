# Genius Lyrics Scraper API - Vercel Deployment

A serverless Genius lyrics scraper hosted on Vercel. Anyone can use your API endpoint to fetch lyrics.

## Features

- ✅ Scrapes full lyrics from Genius.com via Puppeteer
- ✅ Fallback to lyrics.ovh API if scraping fails
- ✅ CORS enabled (works from Roblox and browsers)
- ✅ Serverless (no server to maintain)
- ✅ Free tier available

## Setup Instructions

### 1. Prerequisites

- Vercel account (free at vercel.com)
- GitHub account (to connect your repo)

### 2. Create Repository

Create a GitHub repository with these files:
```
your-repo/
├── api/
│   └── lyrics.js
├── package.json
├── vercel.json
└── README.md
```

### 3. Deploy to Vercel (Option A: Quick)

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Add environment variable (optional, only if using Browserless):
   - `BROWSERLESS_TOKEN` = your browserless.io token
4. Click "Deploy"

Done! Your API is live at `https://your-project.vercel.app`

### 3. Deploy to Vercel (Option B: CLI)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set production
vercel --prod
```

### 4. (Optional) Enable Puppeteer with Browserless

For better scraping performance:

1. Sign up at https://browserless.io (free tier: 50 calls/month)
2. Get your API token
3. Add to Vercel environment variables:
   - Name: `BROWSERLESS_TOKEN`
   - Value: `your_browserless_token`
4. Redeploy

Without Browserless token, the API falls back to the free lyrics.ovh endpoint.

## Usage

### From Roblox

```lua
local HttpService = game:GetService("HttpService")
local API_URL = "https://your-project.vercel.app/api/lyrics"

local function GetLyrics(artist, song)
    local url = API_URL .. "?artist=" .. HttpService:UrlEncode(artist) .. "&song=" .. HttpService:UrlEncode(song)
    local response = request({ Url = url, Method = "GET" })
    local data = HttpService:JSONDecode(response.Body)
    return data.success and data.lyrics or nil
end

local lyrics = GetLyrics("The Weeknd", "Blinding Lights")
print(lyrics)
```

### From cURL

```bash
curl "https://your-project.vercel.app/api/lyrics?artist=The%20Weeknd&song=Blinding%20Lights"
```

### From JavaScript

```javascript
const response = await fetch(
  `https://your-project.vercel.app/api/lyrics?artist=The Weeknd&song=Blinding Lights`
);
const data = await response.json();
console.log(data.lyrics);
```

## API Response

### Success

```json
{
  "success": true,
  "artist": "The Weeknd",
  "song": "Blinding Lights",
  "lyrics": "...",
  "source": "genius-scraped" // or "lyrics-api"
}
```

### Error

```json
{
  "error": "Lyrics not found",
  "artist": "Artist Name",
  "song": "Song Name"
}
```

## Query Parameters

- `artist` (required): Song artist
- `song` (required): Song name
- `method` (optional): `scrape` to force Puppeteer (if available)

## Performance Notes

- **Cold start**: First request takes ~5-10 seconds (normal for serverless)
- **Rate limit**: Free tier has usage limits; use `BROWSERLESS_TOKEN` for higher limits
- **Timeout**: Maximum 30 seconds per request

## Troubleshooting

**"Puppeteer timeout"**
- Lyrics.ovh fallback will kick in automatically

**"Lyrics not found"**
- Song doesn't exist on Genius
- Try different spelling/artist name

**API not responding**
- Check Vercel deployment status
- Verify environment variables set correctly

## Costs

- **Free tier**: $0 (with lyrics.ovh fallback)
- **With Browserless**: $0 free (50 calls), then $5-20/month for higher limits
- **Vercel**: Free tier includes 100GB bandwidth/month

## Limitations

- Genius might rate-limit aggressive scrapers
- lyrics.ovh fallback has some songs missing
- Vercel free tier: 10 second function timeout (upgraded to 30s with Pro)

## Share Your API

Give anyone your Vercel URL and they can use it:
```
https://your-project.vercel.app/api/lyrics?artist=ARTIST&song=SONG
```

Enjoy! 🎵

