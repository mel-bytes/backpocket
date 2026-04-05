const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Route to detect movie/show from YouTube video info
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Based on this YouTube video information, what movie or TV show is being discussed or recommended? Reply with ONLY the title, nothing else. If you cannot identify one, reply with "NONE".
          
          ${videoInfo}`
        }]
      })
    });

    const data = await response.json();
    const detected = data.content[0].text.trim();
    res.json({ title: detected });

  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ error: 'Detection failed' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`BackPocket server running on port ${PORT}`);
});