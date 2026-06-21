const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: ['https://backpocket.up.railway.app', 'http://localhost:3000', 'http://localhost:3002']
}));
app.use(express.json());
app.options('/detect', cors({
  origin: ['https://backpocket.up.railway.app', 'http://localhost:3000', 'http://localhost:3002']
}));

app.post('/detect', async (req, res) => {
  const { videoInfo } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.REACT_APP_ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `You are an expert at identifying movies and TV shows from social media content. Analyze this YouTube video information carefully and identify the movie or TV show being featured, discussed, or recommended.

IMPORTANT: Pay special attention to the captions,hastags and comments section — viewers frequently name the show or movie in comments, even with typos or informal spelling. Treat any commenter naming a title as strong evidence.

Use ALL available signals:
- Direct title mentions (even if misspelled — "chicagi fire" = "Chicago Fire")
- Hashtags and keywords
- Actor or character names mentioned
- Plot or scene descriptions
- Genre keywords (medical drama, true crime, courtroom, etc.)
- Setting clues (hospital, courtroom, police station, etc.)
- Comments where people ask "what show is this?" — replies often contain the answer
- Comments where people name the show even casually
- Production company or network mentions
- Any partial title mentions

Be aggressive in your inference — if the evidence strongly suggests a title, return it even if not explicitly stated. Output rules: Respond with ONLY the exact title and nothing else. No markdown, no headers, no confidence levels, no evidence, no explanation, no quotes, no year. Just the plain title text. Example correct response: Enough
If you cannot identify it, respond with exactly: NONE

Video information:
${videoInfo}`
        }]
      })
    });

    const data = await response.json();
    console.log('Anthropic response:', JSON.stringify(data));
    const detected = data.content[0].text.trim();
    res.json({ title: detected });

  } catch (error) {
    console.error('Detection error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`BackPocket server running on port ${PORT}`);
});