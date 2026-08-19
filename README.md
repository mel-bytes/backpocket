🍿 BackPocket

See it. Pocket it. Watch it.

BackPocket closes the gap between discovering a movie or show on social media and actually finding it to watch. Paste a YouTube Shorts link, and AI detects the title, checks streaming availability in your country, and gets you one click away from watching.

🔗 Live app: backpocket-app.vercel.app


## 1. The Problem

Streaming platforms users ( Netflix, Hulu, Disney+, HBO , Apple TV e.tc.) discover shows and movies through social media - TikTok, Instagram Reels,Youtube shorts, Facebook via trending reviews, viral clips, and influencer recommendations.

**BUT** the discovery-to-watching pipeline is broken:

- Users forget the title by the time they open their streaming app
- They have to manually search for it, leading to drop-offs
- Many titles aren't available in their country  and they only find out AFTER switching apps
- There is no seamless way to "pocket" something for later directly from social media

**This results in:**

- Lost momentum from viral content
- Missed viewing opportunities
- Lower content engagement for streaming platforms

---

## 2. Solution

Social media is the #1 content discovery tool for streaming:  

- 65% of viewers make viewing decisions based on social media trends  
- 53% of younger generations ( Gex Z) prefer social media recommendations over algorithmic ones  
- TikTok has 1B+ users; #Netflix has 80M+ posts on Instagram  

The gap: **there is no tool that seamlessly connects social media discovery to your streaming queue**

**BackPocket fixes that**

How It Works :  
Discover — paste a YouTube Shorts URL  
Detect — Claude AI identifies the movie or show from the video's title, description, tags, and comments (even with typos or indirect references)  
Check — BackPocket looks up streaming availability by country  
Save — add it to your personal watchlist  
Watch — one click opens the right streaming platform, ready to search that title  

**Features**  
🤖 AI-powered title detection from YouTube video metadata and comments  
🌍 Automatic country detection with localized streaming availability  
📺 Streaming provider logos and direct deep links (Netflix, Prime Video, Disney+, Hulu, Max, Apple TV+, Paramount+)  
💾 Persistent personal watchlist  
🔍 Manual search fallback for any movie or show  
 
## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React |
| Backend | Vercel Serverless Functions |
| AI Detection | Anthropic Claude API |
| Movie/Show Data | TMDB (The Movie Database) API |
| Video Metadata | YouTube Data API |

**About This Project**

BackPocket was built as a hands-on way to apply AI development skills to a real, everyday problem: 
the gap between discovering content on social media and actually watching it. It's a full-stack project covering AI integration, third-party API orchestration, and production deployment.
