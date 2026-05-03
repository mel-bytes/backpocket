import { useState, useEffect } from 'react';
import './App.css';

const STREAMING_LINKS = {
  'Netflix': (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
  'Amazon Prime Video': (title) => `https://www.amazon.com/s?k=${encodeURIComponent(title)}&i=instant-video`,
  'Prime Video': (title) => `https://www.amazon.com/s?k=${encodeURIComponent(title)}&i=instant-video`,
  'Disney Plus': (title) => `https://www.disneyplus.com/search/${encodeURIComponent(title)}`,
  'Disney+': (title) => `https://www.disneyplus.com/search/${encodeURIComponent(title)}`,
  'Hulu': (title) => `https://www.hulu.com/search?q=${encodeURIComponent(title)}&type=all`,
  'Apple TV Plus': (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
  'Apple TV+': (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
  'HBO Max': (title) => `https://play.max.com/search?q=${encodeURIComponent(title)}`,
  'Max': (title) => `https://play.max.com/search?q=${encodeURIComponent(title)}`,
  'Paramount Plus': (title) => `https://www.paramountplus.com/search/${encodeURIComponent(title)}/`,
  'Paramount+': (title) => `https://www.paramountplus.com/search/${encodeURIComponent(title)}/`,
};

const MAJOR_PLATFORMS = [
  'Netflix', 'Prime Video', 'Amazon Prime Video',
  'Disney+', 'Disney Plus',
  'Hulu',
  'Apple TV+', 'Apple TV Plus',
  'Max', 'HBO Max',
  'Paramount+', 'Paramount Plus'
];

function ProviderLogo({ provider, size = 24 }) {
  if (provider.logo_path) {
    return (
      <img
        src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
        alt={provider.provider_name}
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          objectFit: 'cover',
          display: 'block',
          flexShrink: 0,
        }}
      />
    );
  }
  return <span style={{ fontSize: size * 0.7 }}>📺</span>;
}

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('backpocket-watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [providers, setProviders] = useState({});
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectedTitle, setDetectedTitle] = useState('');
  const [userCountry, setUserCountry] = useState('US');
  const [countryName, setCountryName] = useState('United States');

  // Persist watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('backpocket-watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        setUserCountry(data.country_code);
        setCountryName(data.country_name);
      })
      .catch(() => console.log('Could not detect country'));
  }, []);

  const extractVideoId = (url) => {
    const match = url.match(/shorts\/([a-zA-Z0-9_-]+)|v=([a-zA-Z0-9_-]+)|youtu\.be\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] || match[2] || match[3] : null;
  };

  const detectFromYoutube = async () => {
    if (!youtubeUrl) return;
    setDetecting(true);
    setDetectedTitle('');

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      alert('Please paste a valid YouTube URL!');
      setDetecting(false);
      return;
    }

    const [ytResponse, commentsResponse] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${process.env.REACT_APP_YOUTUBE_KEY}`),
      fetch(`https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=snippet&maxResults=20&key=${process.env.REACT_APP_YOUTUBE_KEY}`)
    ]);

    const ytData = await ytResponse.json();
    if (!ytData.items || ytData.items.length === 0) {
      alert('Could not find this video!');
      setDetecting(false);
      return;
    }

    const video = ytData.items[0].snippet;
    const commentsData = await commentsResponse.json();
    const topComments = commentsData.items?.map(c => c.snippet.topLevelComment.snippet.textDisplay).join('\n') || 'none';

    const videoInfo = `
      Title: ${video.title}
      Description: ${video.description?.slice(0, 500)}
      Tags: ${video.tags?.join(', ') || 'none'}
      Top Comments: ${topComments}
    `;

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
    await searchMoviesWithQuery(detected);
    setDetecting(false);
  };

  const fetchProviders = async (filteredResults, country) => {
    const providerMap = {};
    await Promise.all(
      filteredResults.slice(0, 8).map(async (item) => {
        const type = item.media_type === 'movie' ? 'movie' : 'tv';
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${item.id}/watch/providers`,
          { headers: { Authorization: `Bearer ${process.env.REACT_APP_TMDB_TOKEN}` } }
        );
        const provData = await res.json();
        const flatrate = provData.results?.[country]?.flatrate || [];
        const free = provData.results?.[country]?.free || [];
        const ads = provData.results?.[country]?.ads || [];
        const allProviders = [...new Map([...flatrate, ...free, ...ads].map(p => [p.provider_id, p])).values()];;
        const countryProviders = allProviders.filter(p => MAJOR_PLATFORMS.includes(p.provider_name));
        providerMap[item.id] = countryProviders;
      })
    );
    return providerMap;
  };

  const searchMoviesWithQuery = async (searchQuery) => {
    setLoading(true);
    setDetectedTitle(''); // Clear detected title on any new search
    const response = await fetch(
      `https://api.themoviedb.org/3/search/multi?query=${searchQuery}&language=en-US&page=1`,
      { headers: { Authorization: `Bearer ${process.env.REACT_APP_TMDB_TOKEN}` } }
    );
    const data = await response.json();
    const filteredResults = (data.results || []).filter(
      item => item.media_type === 'movie' || item.media_type === 'tv'
    );
    setResults(filteredResults);
    const providerMap = await fetchProviders(filteredResults, userCountry);
    setProviders(providerMap);
    setLoading(false);
  };

  const searchMovies = async () => {
    if (query.length < 3) return;
    setDetectedTitle(''); // Clear AI detected banner when manually searching
    await searchMoviesWithQuery(query);
  };

  const addToWatchlist = (item) => {
    if (watchlist.find(w => w.id === item.id)) {
      alert('Already in your BackPocket!');
      return;
    }
    const titleWithProviders = {
      ...item,
      savedProviders: providers[item.id] || []
    };
    setWatchlist([...watchlist, titleWithProviders]);
  };

  const removeFromWatchlist = (id) => {
    setWatchlist(watchlist.filter(w => w.id !== id));
  };

  const getWatchLink = (providerName, title) => {
    const linkFn = STREAMING_LINKS[providerName];
    return linkFn ? linkFn(title) : `https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}`;
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🍿 BackPocket</h1>
        <p>See it. Pocket it. Watch it.</p>
        {countryName && <p className="country-tag">🌍 Showing results for: {countryName}</p>}
      </header>

      <div className="search-section">
        <input
          type="text"
          placeholder="Search for a movie or show..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchMovies()}
          className="search-input"
        />
        <button onClick={searchMovies} className="search-btn">Search</button>
      </div>

      <div className="divider"><span>or detect from YouTube</span></div>

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

      {detectedTitle && (
        <p className="detected-title">
          🤖 AI detected: <strong>"{detectedTitle}"</strong>
        </p>
      )}

      {loading && <p className="loading">Searching...</p>}

      {/* ── Results Grid ── */}
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
                {item.vote_average > 0 && (
                  <p className="card-rating">⭐ {item.vote_average.toFixed(1)}</p>
                )}
                <p>{item.overview?.slice(0, 100)}...</p>
                <div className="providers">
                  {providers[item.id]?.length > 0 ? (
                    providers[item.id].map(p => (
                      <span key={p.provider_id} className="provider-badge">
                        <ProviderLogo provider={p} size={20} />
                        <span>{p.provider_name}</span>
                      </span>
                    ))
                  ) : (
                    <span className="no-providers">Not streaming in {countryName}</span>
                  )}
                </div>
                <button onClick={() => addToWatchlist(item)} className="pocket-btn">
                  + Add to BackPocket
                </button>
              </div>
            </div>
          ))}
      </div>

      {results.length === 0 && !loading && query && (
        <p className="empty">No results found for "{query}" — try another title!</p>
      )}

      {/* ── Watchlist ── */}
      {watchlist.length > 0 && (
        <div className="watchlist">
          <h2>🎬 My BackPocket</h2>
          {watchlist.map(item => {
            const title = item.title || item.name;
            return (
              <div key={item.id} className="watchlist-item">
                {/* Poster thumbnail */}
                {item.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                    alt={title}
                    className="watchlist-poster"
                  />
                ) : (
                  <div className="watchlist-poster watchlist-poster--empty">🎬</div>
                )}

                {/* Title + rating */}
                <div className="watchlist-meta">
                  <span className="watchlist-title">{title}</span>
                  {item.vote_average > 0 && (
                    <span className="watchlist-rating">⭐ {item.vote_average.toFixed(1)}</span>
                  )}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeFromWatchlist(item.id)}
                  className="remove-btn"
                  title="Remove"
                >✕</button>

                {/* Streaming links with logos */}
                <div className="watchlist-providers">
                  {item.savedProviders?.length > 0 ? (
                    item.savedProviders.map(p => (
                      <a
                        key={p.provider_id}
                        href={getWatchLink(p.provider_name, title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="watch-link"
                      >
                        <ProviderLogo provider={p} size={20} />
                        <span>{p.provider_name}</span>
                        <span>→</span>
                      </a>
                    ))
                  ) : (
                    <a
                      href={`https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="watch-link"
                    >
                      🔍 Find where to watch →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default App;