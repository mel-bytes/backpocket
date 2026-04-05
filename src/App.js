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
  // useState is how React remembers things - like variables that update the screen
  const [query, setQuery] = useState('');        // what the user types
  const [results, setResults] = useState([]);    // movies we get back from TMDB
  const [loading, setLoading] = useState(false); // show loading spinner?
  const [watchlist, setWatchlist] = useState([]); // saved titles
  const [providers, setProviders] = useState({}); // streaming availability

  // This function runs when the user searches
  const searchMovies = async () => {
    if (query.length < 3) return;
    setLoading(true);

    const response = await fetch(
      `https://api.themoviedb.org/3/search/multi?query=${query}&language=en-US&page=1`,
      { headers: { Authorization: `Bearer ${process.env.REACT_APP_TMDB_TOKEN}` } }
    );
    const data = await response.json();
    const filteredResults = (data.results || []).filter(
      item => item.media_type === 'movie' || item.media_type === 'tv'
    );
    setResults(filteredResults);

    // Fetch streaming providers for each result
    const providerMap = {};
    await Promise.all(
      filteredResults.slice(0, 8).map(async (item) => {
        const type = item.media_type === 'movie' ? 'movie' : 'tv';
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${item.id}/watch/providers`,
          { headers: { Authorization: `Bearer ${process.env.REACT_APP_TMDB_TOKEN}` } }
        );
        const provData = await res.json();
        // Get US providers - flatrate means subscription streaming
        const usProviders = provData.results?.US?.flatrate || [];
        providerMap[item.id] = usProviders;
      })
    );
    setProviders(providerMap);
    setLoading(false);
  };

  // This function saves a title to the watchlist
  const addToWatchlist = (title) => {
    // edge case: don't add duplicates
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

      {/* Search Section */}
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
                {/* Streaming Availability */}
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