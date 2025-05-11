'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import MovieCard from './components/MovieCard';
import GenreFilter from './components/GenreFilter';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();
  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  const [userMovieLists, setUserMovieLists] = useState({
    Watching: [],
    'Will Watch': [],
    'Already Watched': [],
  });

  const [userListsState, setUserListsState] = useState({
    Watching: { isFetching: false, error: null },
    'Will Watch': { isFetching: false, error: null },
    'Already Watched': { isFetching: false, error: null },
  });

  const genreLookup = {
    28: 'action',
    12: 'adventure',
    16: 'animation',
    35: 'comedy',
    80: 'crime',
    99: 'documentary',
    18: 'drama',
    10751: 'family',
    14: 'fantasy',
    36: 'biography',
    27: 'horror',
    9648: 'mystery',
    10749: 'romance',
    878: 'sci-fi',
    53: 'thriller',
  };

  const genreNameToId = Object.fromEntries(
    Object.entries(genreLookup).map(([id, name]) => [name, parseInt(id)])
  );

  const [movieSectionState, setMovieSectionState] = useState({
    'popular-movies': { page: 1, genre: 'all', isFetching: false, movies: [], error: null },
    'upcoming-movies': { page: 1, genre: 'all', isFetching: false, movies: [], error: null },
    'top-rated-movies': { page: 1, genre: 'all', isFetching: false, movies: [], error: null },
    'bhutanese-movies': { pageToken: '', genre: 'all', isFetching: false, searchQuery: '', movies: [], error: null },
    'watching': { page: 1, genre: 'all', isFetching: false, movies: [], error: null },
    'will-watch': { page: 1, genre: 'all', isFetching: false, movies: [], error: null },
    'already-watched': { page: 1, genre: 'all', isFetching: false, movies: [], error: null },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [bhutaneseSearchQuery, setBhutaneseSearchQuery] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [selectedList, setSelectedList] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);

  const carousels = {
    watching: useRef(null),
    'will-watch': useRef(null),
    'already-watched': useRef(null),
    'popular-movies': useRef(null),
    'upcoming-movies': useRef(null),
    'top-rated-movies': useRef(null),
    'bhutanese-movies': useRef(null),
  };

  useEffect(() => {
    console.log('Session status:', status, 'Session:', session);
    if (status !== 'loading' && session) {
      // Fetch user movies for all sections
      const fetchAllUserMovies = async () => {
        await Promise.all([
          fetchUserMovies('watching', true),
          fetchUserMovies('will-watch', true),
          fetchUserMovies('already-watched', true)
        ]);
      };
      fetchAllUserMovies();
    }
    if (status !== 'loading') {
      fetchMoviesForSection('popular-movies');
      fetchMoviesForSection('upcoming-movies');
      fetchMoviesForSection('top-rated-movies');
      fetchBhutaneseMovies();
      Object.keys(carousels).forEach((sectionId) => {
        const carousel = carousels[sectionId].current;
        if (carousel) {
          carousel.addEventListener('scroll', handleScroll(sectionId));
        }
      });
    }
    return () => {
      Object.keys(carousels).forEach((sectionId) => {
        const carousel = carousels[sectionId].current;
        if (carousel) {
          carousel.removeEventListener('scroll', handleScroll(sectionId));
        }
      });
    };
  }, [status, session]);

  const fetchUserMovies = async (sectionId, reset = false) => {
    try {
      setUserListsState(prev => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], isFetching: true, error: null }
      }));

      const response = await fetch('/api/movies');
      if (!response.ok) throw new Error('Failed to fetch user movies');
      const data = await response.json();

      // Transform the data to match the expected format
      const categoryKey = {
        'watching': 'watching',
        'will-watch': 'will-watch',
        'already-watched': 'already-watched'
      }[sectionId];

      const movies = data[categoryKey] || [];
      const transformedMovies = movies.map(movie => ({
        id: movie.movieId,
        title: movie.title,
        poster_path: movie.poster,
        overview: movie.overview,
        release_date: movie.releaseDate,
        vote_average: movie.rating,
        vote_count: movie.votes,
        genre_ids: JSON.parse(movie.genreIds || '[]'),
        description: movie.description,
        source: movie.source || 'tmdb'
      }));

      setMovieSectionState(prev => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          movies: reset ? transformedMovies : [...prev[sectionId].movies, ...transformedMovies],
          error: null
        }
      }));
    } catch (error) {
      console.error(`Error fetching ${sectionId} movies:`, error);
      setUserListsState(prev => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], error: error.message }
      }));
    } finally {
      setUserListsState(prev => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], isFetching: false }
      }));
    }
  };

  const handleScroll = useCallback((sectionId) => async () => {
    const state = movieSectionState[sectionId];
    const carousel = carousels[sectionId].current;
    if (!carousel || !state || state.isFetching) return;

    const nearEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 50;
    if (nearEnd && sectionId !== 'watching' && sectionId !== 'will-watch' && sectionId !== 'already-watched') {
      setMovieSectionState((prev) => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], isFetching: true },
      }));

      if (sectionId === 'bhutanese-movies') {
        await fetchBhutaneseMovies(state.searchQuery, state.pageToken);
      } else {
        await fetchMoviesForSection(sectionId);
      }

      setMovieSectionState((prev) => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], isFetching: false },
      }));
    }
  }, [movieSectionState, carousels]);

  const fetchMoviesForSection = async (sectionId, reset = false) => {
    const state = movieSectionState[sectionId];
    let endpoint = '';

    switch (sectionId) {
      case 'popular-movies':
        endpoint = `discover/movie?sort_by=popularity.desc&page=${state.page}`;
        break;
      case 'upcoming-movies':
        const today = new Date().toISOString().split('T')[0];
        endpoint = `discover/movie?sort_by=popularity.desc&primary_release_date.gte=${today}&page=${state.page}`;
        break;
      case 'top-rated-movies':
        endpoint = `discover/movie?sort_by=vote_average.desc&vote_count.gte=1000&page=${state.page}`;
        break;
    }

    if (state.genre !== 'all') {
      const genreId = genreNameToId[state.genre];
      if (genreId) endpoint += `&with_genres=${genreId}`;
    }

    if (!TMDB_API_KEY) {
      console.error('TMDb API key is missing.');
      setMovieSectionState((prev) => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], error: 'TMDb API key is missing.' },
      }));
      return;
    }

    try {
      const response = await fetch(`https://api.themoviedb.org/3/${endpoint}&api_key=${TMDB_API_KEY}`);
      if (!response.ok) throw new Error(`TMDb request failed: ${response.status}`);
      const data = await response.json();
      setMovieSectionState((prev) => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          movies: reset ? data.results : [...prev[sectionId].movies, ...data.results],
          page: prev[sectionId].page + 1,
          error: null,
        },
      }));
    } catch (err) {
      console.error(`TMDb Error in ${sectionId}:`, err);
      setMovieSectionState((prev) => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], error: err.message },
      }));
    }
  };

  const fetchBhutaneseMovies = async (query = '', pageToken = '', reset = false) => {
    const sectionId = 'bhutanese-movies';
    
    try {
      setMovieSectionState(prev => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], isFetching: true, error: null }
      }));

      const searchTerm = query || 'dzongkha full movie';
      const searchURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchTerm)}&type=video&key=${YOUTUBE_API_KEY}&pageToken=${pageToken}&maxResults=10`;
      
      const response = await fetch(searchURL);
      if (!response.ok) throw new Error(`YouTube search error: ${response.status}`);
      const results = await response.json();

      if (!results.items || !results.items.length) {
        setMovieSectionState(prev => ({
          ...prev,
          [sectionId]: { 
            ...prev[sectionId], 
            isFetching: false,
            error: 'No Bhutanese movies found' 
          }
        }));
        return;
      }

      const videoIds = results.items.map(item => item.id.videoId).join(',');
      const videoDetailsURL = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      const detailsResponse = await fetch(videoDetailsURL);
      if (!detailsResponse.ok) throw new Error('Failed to fetch video details');
      const videoData = await detailsResponse.json();

      const movies = videoData.items
        .filter(video => parseYouTubeDuration(video.contentDetails.duration) > 2400)
        .map(video => ({
          id: video.id,
          title: video.snippet.title,
          poster_path: video.snippet.thumbnails.high?.url || '/placeholder.jpg',
          overview: video.snippet.description,
          release_date: video.snippet.publishedAt,
          vote_average: calculateRating(video.statistics),
          vote_count: video.statistics.viewCount || '0',
          genre_ids: [],
          source: 'youtube'
        }));

      setMovieSectionState(prev => ({
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          movies: reset ? movies : [...prev[sectionId].movies, ...movies],
          pageToken: results.nextPageToken || '',
          searchQuery: query,
          isFetching: false,
          error: null
        }
      }));
    } catch (err) {
      console.error('Bhutanese Fetch Error:', err);
      setMovieSectionState(prev => ({
        ...prev,
        [sectionId]: { 
          ...prev[sectionId], 
          isFetching: false,
          error: err.message 
        }
      }));
    }
  };

  const parseYouTubeDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const h = match[1] ? parseInt(match[1]) : 0;
    const m = match[2] ? parseInt(match[2]) : 0;
    const s = match[3] ? parseInt(match[3]) : 0;
    return h * 3600 + m * 60 + s;
  };

  const calculateRating = (stats) => {
    if (!stats?.likeCount || !stats?.viewCount) return 'N/A';
    const likeToViewRatio = (parseInt(stats.likeCount) / parseInt(stats.viewCount)) * 10;
    return likeToViewRatio.toFixed(1);
  };

  const searchMovies = async (event) => {
    event.preventDefault();
    if (!searchQuery) return;

    try {
      if (!TMDB_API_KEY) {
        throw new Error('TMDb API key is missing');
      }

      console.log('Searching for:', searchQuery);
      const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(searchQuery)}&api_key=${TMDB_API_KEY}`;
      console.log('Search URL:', searchUrl);

      const res = await fetch(searchUrl);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`TMDb search error: ${res.status} - ${errorData.status_message || res.statusText}`);
      }

      const data = await res.json();
      console.log('Search results:', data);
      
      if (!data.results) {
        throw new Error('Invalid response format from TMDb API');
      }

      setSearchResults(data.results || []);
      setError('');
    } catch (err) {
      console.error('TMDb Search Error:', err);
      setError('Failed to search movies: ' + err.message);
      setSearchResults([]);
    }
  };

  const searchBhutaneseMovies = async (event) => {
    event.preventDefault();
    const sectionId = 'bhutanese-movies';
    
    setMovieSectionState(prev => ({
      ...prev,
      [sectionId]: { 
        ...prev[sectionId], 
        pageToken: '', 
        searchQuery: bhutaneseSearchQuery, 
        movies: [], 
        error: null,
        isFetching: true
      }
    }));
    
    await fetchBhutaneseMovies(bhutaneseSearchQuery, '', true);
  };

  const handleGenreChange = (genre) => {
    setMovieSectionState((prev) => ({
      ...prev,
      'popular-movies': { ...prev['popular-movies'], page: 1, genre, movies: [], error: null },
      'upcoming-movies': { ...prev['upcoming-movies'], page: 1, genre, movies: [], error: null },
      'top-rated-movies': { ...prev['top-rated-movies'], page: 1, genre, movies: [], error: null },
      'bhutanese-movies': { ...prev['bhutanese-movies'], pageToken: '', genre, searchQuery: '', movies: [], error: null },
    }));
    fetchMoviesForSection('popular-movies', true);
    fetchMoviesForSection('upcoming-movies', true);
    fetchMoviesForSection('top-rated-movies', true);
    fetchBhutaneseMovies('', '', true);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError('Invalid username or password, please try again.');
    } else {
      setShowSignIn(false);
      setError('');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signUpUsername, password: signUpPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Sign-up failed.');
        return;
      }

      const signInResult = await signIn('credentials', {
        username: signUpUsername,
        password: signUpPassword,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Sign-up succeeded, but sign-in failed.');
      } else {
        setShowSignUp(false);
        setError('');
      }
    } catch (err) {
      console.error('Sign-up error:', err);
      setError('An error occurred during sign-up.');
    }
  };

  const handleDeleteMovie = (sectionId, movieId) => {
    setMovieSectionState(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        movies: prev[sectionId].movies.filter(movie => movie.id !== movieId)
      }
    }));
  };

  const handleAddToList = async () => {
    if (!session) {
      setError('Please sign in to add movies to your list');
      return;
    }

    if (!selectedList) {
      setError('Please select a list');
      return;
    }

    if (!selectedMovie) {
      setError('Please select a movie');
      return;
    }

    try {
      const movieData = {
        movieId: selectedMovie.id.toString(),
        title: selectedMovie.title,
        poster: selectedMovie.poster_path,
        category: selectedList,
        overview: selectedMovie.overview || '',
        releaseDate: selectedMovie.release_date || '',
        rating: selectedMovie.vote_average?.toString() || 'N/A',
        votes: selectedMovie.vote_count?.toString() || '0',
        genreIds: selectedMovie.genre_ids ? JSON.stringify(selectedMovie.genre_ids) : '[]',
        description: selectedMovie.overview || '',
        source: 'tmdb'
      };

      const response = await fetch('/api/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(movieData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add movie to list');
      }
      
      setError('');
      setSelectedMovie(null);
      setSelectedList('');
      // Refresh the user's movie lists
      fetchUserMovies('watching', true);
      fetchUserMovies('will-watch', true);
      fetchUserMovies('already-watched', true);
    } catch (err) {
      console.error('Error adding movie:', err);
      setError(err.message || 'Failed to add movie to list');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-900"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="h-8 bg-gray-800 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-800 rounded mb-8"></div>
            <div className="h-8 bg-gray-800 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <nav className="bg-black/90 backdrop-blur-sm fixed w-full z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-red-600">MyMovieList</h1>
            </div>

            <div className="flex items-center gap-4">
              <GenreFilter 
                onGenreChange={handleGenreChange} 
                selectedGenre={movieSectionState['popular-movies'].genre}
                className="bg-gray-900 text-white border border-gray-700 rounded-lg"
              />
              
              {session ? (
                <div className="flex items-center gap-4">
                  <p className="text-gray-300">Welcome, {session.user?.name || 'User'}</p>
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSignIn(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowSignUp(true)}
                    className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              )}

              <form onSubmit={searchMovies} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies..."
                  className="p-2 rounded bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:border-red-500 focus:outline-none w-48 sm:w-64"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16">
        {/* Auth Modals */}
        {showSignIn && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gray-900 p-8 rounded-lg max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">Sign In</h2>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => signIn('google')}
                  className="w-full px-6 py-3 bg-white text-gray-900 rounded hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-900 text-gray-400">Or sign in with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignIn}>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Email"
                    className="w-full p-3 mb-4 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full p-3 mb-6 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
                  />
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSignIn(false)}
                      className="px-6 py-3 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showSignUp && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gray-900 p-8 rounded-lg max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">Sign Up</h2>
              <form onSubmit={handleSignUp}>
                <input
                  type="text"
                  value={signUpUsername}
                  onChange={(e) => setSignUpUsername(e.target.value)}
                  placeholder="Email"
                  className="w-full p-3 mb-4 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
                />
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full p-3 mb-4 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
                />
                <input
                  type="password"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full p-3 mb-6 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
                />
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSignUp(false)}
                    className="px-6 py-3 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <p className="text-red-500 bg-red-500/10 p-4 rounded-lg">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <section className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold mb-6">Search Results</h2>
              <div className="movie-container flex overflow-x-auto gap-4 pb-4 scroll-smooth snap-x snap-mandatory">
                {searchResults.map((movie) => (
                  <MovieCard 
                    key={movie.id} 
                    movie={movie} 
                    source="tmdb"
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* User Lists */}
        {session && (
          <>
            <section className="py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold mb-6">Watching</h2>
                {movieSectionState.watching.isFetching && (
                  <div className="animate-pulse">
                    <div className="h-64 bg-gray-800 rounded mb-4"></div>
                  </div>
                )}
                {movieSectionState.watching.error && (
                  <p className="text-red-500 bg-red-500/10 p-4 rounded-lg">
                    Error: {movieSectionState.watching.error}
                  </p>
                )}
                <div
                  ref={carousels.watching}
                  className="movie-container flex overflow-x-auto gap-4 pb-4 scroll-smooth snap-x snap-mandatory"
                >
                  {movieSectionState.watching.movies.length > 0 ? (
                    movieSectionState.watching.movies.map((movie, index) => (
                      <MovieCard
                        key={`watching-${movie.id}-${index}`}
                        movie={movie}
                        source={movie.source}
                        category="watching"
                        onDelete={(movieId) => handleDeleteMovie('watching', movieId)}
                      />
                    ))
                  ) : (
                    <p className="text-gray-400">
                      No movies in your watching list
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold mb-6">Will Watch</h2>
                {movieSectionState['will-watch'].isFetching && (
                  <div className="animate-pulse">
                    <div className="h-64 bg-gray-800 rounded mb-4"></div>
                  </div>
                )}
                {movieSectionState['will-watch'].error && (
                  <p className="text-red-500 bg-red-500/10 p-4 rounded-lg">
                    Error: {movieSectionState['will-watch'].error}
                  </p>
                )}
                <div
                  ref={carousels['will-watch']}
                  className="movie-container flex overflow-x-auto gap-4 pb-4 scroll-smooth snap-x snap-mandatory"
                >
                  {movieSectionState['will-watch'].movies.length > 0 ? (
                    movieSectionState['will-watch'].movies.map((movie, index) => (
                      <MovieCard
                        key={`will-watch-${movie.id}-${index}`}
                        movie={movie}
                        source={movie.source}
                        category="will-watch"
                        onDelete={(movieId) => handleDeleteMovie('will-watch', movieId)}
                      />
                    ))
                  ) : (
                    <p className="text-gray-400">
                      No movies in your will watch list
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold mb-6">Already Watched</h2>
                {movieSectionState['already-watched'].isFetching && (
                  <div className="animate-pulse">
                    <div className="h-64 bg-gray-800 rounded mb-4"></div>
                  </div>
                )}
                {movieSectionState['already-watched'].error && (
                  <p className="text-red-500 bg-red-500/10 p-4 rounded-lg">
                    Error: {movieSectionState['already-watched'].error}
                  </p>
                )}
                <div
                  ref={carousels['already-watched']}
                  className="movie-container flex overflow-x-auto gap-4 pb-4 scroll-smooth snap-x snap-mandatory"
                >
                  {movieSectionState['already-watched'].movies.length > 0 ? (
                    movieSectionState['already-watched'].movies.map((movie, index) => (
                      <MovieCard
                        key={`already-watched-${movie.id}-${index}`}
                        movie={movie}
                        source={movie.source}
                        category="already-watched"
                        onDelete={(movieId) => handleDeleteMovie('already-watched', movieId)}
                      />
                    ))
                  ) : (
                    <p className="text-gray-400">
                      No movies in your already watched list
                    </p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Movie Sections */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-6">Popular Movies</h2>
            {movieSectionState['popular-movies'].isFetching && (
              <p className="text-gray-400">Loading...</p>
            )}
            {movieSectionState['popular-movies'].error && (
              <p className="text-red-500 bg-red-500/10 p-4 rounded-lg">
                Error: {movieSectionState['popular-movies'].error}
              </p>
            )}
            <div
              ref={carousels['popular-movies']}
              className="movie-container flex overflow-x-auto gap-4 pb-4 scroll-smooth snap-x snap-mandatory"
            >
              {movieSectionState['popular-movies'].movies.length > 0 ? (
                movieSectionState['popular-movies'].movies.map((movie, index) => (
                  <MovieCard key={`popular-${movie.id}-${index}`} movie={movie} source="tmdb" />
                ))
              ) : (
                <p className="text-gray-400">
                  No popular movies found
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-6">Upcoming Movies</h2>
            {movieSectionState['upcoming-movies'].isFetching && (
              <p className="text-gray-400">Loading...</p>
            )}
            {movieSectionState['upcoming-movies'].error && (
              <p className="text-red-500 bg-red-500/10 p-4 rounded-lg">
                Error: {movieSectionState['upcoming-movies'].error}
              </p>
            )}
            <div
              ref={carousels['upcoming-movies']}
              className="movie-container flex overflow-x-auto gap-4 pb-4 scroll-smooth snap-x snap-mandatory"
            >
              {movieSectionState['upcoming-movies'].movies.length > 0 ? (
                movieSectionState['upcoming-movies'].movies.map((movie, index) => (
                  <MovieCard key={`upcoming-${movie.id}-${index}`} movie={movie} source="tmdb" />
                ))
              ) : (
                <p className="text-gray-400">
                  No upcoming movies found
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-6">Top Rated Movies</h2>
            {movieSectionState['top-rated-movies'].isFetching && (
              <p className="text-gray-400">Loading...</p>
            )}
            {movieSectionState['top-rated-movies'].error && (
              <p className="text-red-500 bg-red-500/10 p-4 rounded-lg">
                Error: {movieSectionState['top-rated-movies'].error}
              </p>
            )}
            <div
              ref={carousels['top-rated-movies']}
              className="movie-container flex overflow-x-auto gap-4 pb-4 scroll-smooth snap-x snap-mandatory"
            >
              {movieSectionState['top-rated-movies'].movies.length > 0 ? (
                movieSectionState['top-rated-movies'].movies.map((movie, index) => (
                  <MovieCard key={`top-rated-${movie.id}-${index}`} movie={movie} source="tmdb" />
                ))
              ) : (
                <p className="text-gray-400">
                  No top rated movies found
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Bhutanese Movies Section */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-6">Local Bhutanese Movies</h2>
            <form onSubmit={searchBhutaneseMovies} className="flex gap-2 mb-6">
              <input
                type="text"
                value={bhutaneseSearchQuery}
                onChange={(e) => setBhutaneseSearchQuery(e.target.value)}
                placeholder="Search Bhutanese movies"
                className="p-2 rounded bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:border-red-500 focus:outline-none w-48 sm:w-64"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Search
              </button>
            </form>
            
            {movieSectionState['bhutanese-movies'].isFetching ? (
              <div className="animate-pulse">
                <div className="h-64 bg-gray-800 rounded mb-4"></div>
              </div>
            ) : movieSectionState['bhutanese-movies'].error ? (
              <p className="text-red-500 bg-red-500/10 p-4 rounded-lg">
                Error: {movieSectionState['bhutanese-movies'].error}
              </p>
            ) : (
              <div
                ref={carousels['bhutanese-movies']}
                className="movie-container flex overflow-x-auto gap-4 pb-4 scroll-smooth snap-x snap-mandatory"
              >
                {movieSectionState['bhutanese-movies'].movies.length > 0 ? (
                  movieSectionState['bhutanese-movies'].movies.map((movie, index) => (
                    <MovieCard 
                      key={`bhutanese-${movie.id}-${index}`} 
                      movie={movie} 
                      source="youtube"
                    />
                  ))
                ) : (
                  <p className="text-gray-400">
                    No Bhutanese movies available. Try a different search term.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}