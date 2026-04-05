import { useState } from 'react';
import './App.css';

const STREAMING_LOGOS = {
  'Netflix': '🔴',
  'Amazon Prime Video': '🔵',
  'Disney Plus': '🔷',
  'Hulu': '🟢',
  'Apple TV Plus': '⬛',
  'HBO Max': '🟣',
  'Paramount Plus': '🔵',
};

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [providers, setProviders] = useState({});
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectedTitle, setDetectedTitle] = useState('');

  // Extract YouTube video ID from URL
const extractVideoId = (url) => {
  const match = url.match(/shorts\/([a-zA-Z0-9_-]+)|v=([a-zA-Z0-9_-]+)|youtu\.be\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] || match[2] || match[3] : null;
};

  // Fetch video data from YouTube API
  const detectFromYoutube = async () => {
    if (!youtubeUrl) return;
    setDetecting(true);
    setDetectedTitle('');

    const videoId = extractVideoId(youtubeUrl);
    console.log('Video ID:', videoId);
    if (!videoId) {
      alert('Please paste a valid YouTube URL!');
      setDetecting(false);
      return;
    }

    // Get video details from YouTube
    const ytResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${process.env.REACT_APP_YOUTUBE_KEY}`
    );
    const ytData = await ytResponse.json();

    if (!ytData.items || ytData.items.length === 0) {
      alert('Could not find this video!');
      setDetecting(false);
      return;
    }

    const video = ytData.items[0].snippet;
    const videoInfo = `
      Title: ${video.title}
      Description: ${video.description?.slice(0, 500)}
      Tags: ${video.tags?.join(', ') || 'none'}
    `;

    // Send to our backend server which calls Claude
const aiResponse = await fetch('http://localhost:3001/detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ videoInfo })
});

const aiData = await aiResponse.json();
const detected = aiData.title.trim();

    if (detected === 'NONE') {
      alert('Could not detect a movie or show from this video. Try another!');
      setDetecting(false);
      return;
    }

    setDetectedTitle(detected);
    setQuery(detected);
    // Auto search for the detected title
    await searchMoviesWithQuery(detected);
    setDetecting(false);
  };

  // Search with a specific query (used by AI detection)
  const searchMoviesWithQuery = async (searchQuery) => {
    setLoading(true);
    const response = await fetch(
      `https://api.themoviedb.org/3/search/multi?query=${searchQuery}&language=en-US&page=1`,
      { headers: { Authorization: `Bearer ${process.env.REACT_APP_TMDB_TOKEN}` } }
    );
    const data = await response.json();
    const filteredResults = (data.results || []).filter(
      item => item.media_type === 'movie' || item.media_type === 'tv'
    );
    setResults(filteredResults);

    const providerMap = {};
    await Promise.all(
      filteredResults.slice(0, 8).map(async (item) => {
        const type = item.media_type === 'movie' ? 'movie' : 'tv';
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${item.id}/watch/providers`,
          { headers: { Authorization: `Bearer ${process.env.REACT_APP_TMDB_TOKEN}` } }
        );
        const provData = await res.json();
        const usProviders = provData.results?.US?.flatrate || [];
        providerMap[item.id] = usProviders;
      })
    );
    setProviders(providerMap);
    setLoading(false);
  };

  const searchMovies = async () => {
    if (query.length < 3) return;
    await searchMoviesWithQuery(query);
  };

  const addToWatchlist = (title) => {
    if (watchlist.find(item => item.id === title.id)) {
      alert('Already in your BackPocket!');
      return;
    }
    setWatchlist([...watchlist, title]);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>🍿 BackPocket</h1>
        <p>See it. Pocket it. Watch it.</p>
      </header>

      {/* Manual Search Section */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search for a movie or show..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchMovies()}
          className="search-input"
        />
        <button onClick={searchMovies} className="search-btn">
          Search
        </button>
      </div>

      {/* Divider */}
      <div className="divider">
        <span>or detect from YouTube</span>
      </div>

      {/* YouTube Detection Section */}
      <div className="youtube-section">
        <input
          type="text"
          placeholder="Paste a YouTube Shorts URL..."
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          className="search-input"
        />
        <button onClick={detectFromYoutube} className="youtube-btn" disabled={detecting}>
          {detecting ? 'Detecting...' : '🎬 Detect'}
        </button>
      </div>

      {/* Detected title notification */}
      {detectedTitle && (
        <p className="detected-title">
          🤖 AI detected: <strong>"{detectedTitle}"</strong>
        </p>
      )}

      {/* Loading */}
      {loading && <p className="loading">Searching...</p>}

      {/* Results */}
      <div className="results-grid">
        {results
          .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
          .map(item => (
            <div key={item.id} className="card">
              {item.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                  alt={item.title || item.name}
                />
              ) : (
                <div className="no-poster">No Image</div>
              )}
              <div className="card-info">
                <h3>{item.title || item.name}</h3>
                <p>{item.overview?.slice(0, 100)}...</p>
                <div className="providers">
                  {providers[item.id]?.length > 0 ? (
                    providers[item.id].map(p => (
                      <span key={p.provider_id} className="provider-badge" title={p.provider_name}>
                        {STREAMING_LOGOS[p.provider_name] || '📺'} {p.provider_name}
                      </span>
                    ))
                  ) : (
                    <span className="no-providers">Not streaming in US</span>
                  )}
                </div>
                <button onClick={() => addToWatchlist(item)} className="pocket-btn">
                  + Add to BackPocket
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Empty state */}
      {results.length === 0 && !loading && query && (
        <p className="empty">No results found for "{query}" — try another title!</p>
      )}

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <div className="watchlist">
          <h2>🎬 My BackPocket</h2>
          {watchlist.map(item => (
            <div key={item.id} className="watchlist-item">
              <span>{item.title || item.name}</span>
              <a
                href={`https://www.netflix.com/search?q=${item.title || item.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="watch-link"
              >
                Watch on Netflix →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;