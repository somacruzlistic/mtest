'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { TMDB_API_KEY } from '../../config';

export default function MovieDetail({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [movie, setMovie] = useState(null);
  const [trailerUrl, setTrailerUrl] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('trailer');
  const [imdbId, setImdbId] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [selectedList, setSelectedList] = useState('');
  const [error, setError] = useState('');
  const [cast, setCast] = useState([]);
  const [tmdbComments, setTmdbComments] = useState([]);

  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const source = searchParams.get('source') || (id.match(/^[a-zA-Z0-9_-]+$/) ? 'youtube' : 'tmdb');

  const vidSrcUrl = imdbId
    ? `https://vidsrc.me/embed/${imdbId}`
    : `https://vidsrc.me/embed/${encodeURIComponent(movie?.title?.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase() || '')}`;

  const fetchData = useCallback(async () => {
    if (!id || !source) return;

    setIsLoading(true);
    try {
      if (source === 'tmdb') {
        console.log('Fetching TMDB data for movie:', id);
        const [movieRes, videosRes, externalIdsRes, creditsRes, reviewsRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/movie/${id}/external_ids?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/movie/${id}/reviews?api_key=${TMDB_API_KEY}`)
        ]);

        if (!movieRes.ok || !videosRes.ok || !externalIdsRes.ok || !creditsRes.ok || !reviewsRes.ok) {
          const errorData = await Promise.all([
            movieRes.json().catch(() => ({})),
            videosRes.json().catch(() => ({})),
            externalIdsRes.json().catch(() => ({})),
            creditsRes.json().catch(() => ({})),
            reviewsRes.json().catch(() => ({}))
          ]);
          console.error('TMDB API Errors:', errorData);
          throw new Error('Failed to fetch movie data');
        }

        const movieData = await movieRes.json();
        const videosData = await videosRes.json();
        const externalIdsData = await externalIdsRes.json();
        const creditsData = await creditsRes.json();
        const reviewsData = await reviewsRes.json();

        console.log('TMDB Reviews Response:', reviewsData);

        const trailer = videosData.results.find(video => video.type === 'Trailer');
        setTrailerUrl(trailer ? `https://www.youtube.com/embed/${trailer.key}` : '');
        setMovie(movieData);
        setImdbId(externalIdsData.imdb_id || null);
        setCast(creditsData.cast.slice(0, 10));
        
        // Handle reviews data
        if (reviewsData.results && reviewsData.results.length > 0) {
          console.log('Setting TMDB reviews:', reviewsData.results);
          setTmdbComments(reviewsData.results);
        } else {
          console.log('No TMDB reviews found');
          setTmdbComments([]);
        }
      } else {
        const movieData = {
          id: id,
          title: searchParams.get('title') || 'Unknown Title',
          overview: searchParams.get('description') || '',
          release_date: searchParams.get('releaseDate') || '',
          vote_average: searchParams.get('rating') || 'N/A',
          vote_count: searchParams.get('votes') || '0',
          poster_path: searchParams.get('posterPath') || '',
          backdrop_path: searchParams.get('posterPath') || '',
        };
        setMovie(movieData);
        setTrailerUrl(`https://www.youtube.com/embed/${id}`);
      }
    } catch (error) {
      console.error('Error fetching movie data:', error);
      setMovie(null);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [id, source, searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (movie) {
      const storedComments = localStorage.getItem(`comments-${movie.id}`);
      if (storedComments) {
        setComments(JSON.parse(storedComments));
      }
    }
  }, [movie]);

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !session?.user?.name) return;

    const comment = {
      id: Date.now(),
      text: newComment,
      author: session.user.name,
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...comments, comment];
    setComments(updatedComments);
    localStorage.setItem(`comments-${movie.id}`, JSON.stringify(updatedComments));
    setNewComment('');
  };

  const handleViewToggle = () => {
    setViewMode(viewMode === 'trailer' ? 'stream' : 'trailer');
    setStreamError(null);
  };

  const handleIframeError = () => {
    setStreamError('This media is unavailable at the moment. Try again later or check if the movie is available on VidSrc.');
  };

  const handleAddToList = async () => {
    if (!session) {
      setError('Please sign in to add movies to your list');
      return;
    }

    if (!selectedList) {
      setError('Please select a list (e.g., Watching, Will Watch, Already Watched)');
      return;
    }

    try {
      const movieData = {
        movieId: id.toString(),
        title: movie.title,
        poster: movie.poster_path,
        category: selectedList,
        overview: movie.overview || '',
        releaseDate: movie.release_date || '',
        rating: movie.vote_average?.toString() || 'N/A',
        votes: movie.vote_count?.toString() || '0',
        genreIds: movie.genre_ids ? JSON.stringify(movie.genre_ids) : '[]',
        description: movie.overview || '',
        source: source
      };

      console.log('Sending movie data:', movieData);

      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(movieData),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Added to your list');
        setError('');
        router.push('/');
        router.refresh();
      } else {
        console.error('Add to list error:', data);
        setError(data.error + (data.details ? `: ${data.details}` : ''));
      }
    } catch (err) {
      console.error('Add to list error:', err);
      setError('An error occurred while adding the movie: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="animate-pulse">
          <div className="h-[70vh] bg-gray-900"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
            <div className="h-12 bg-gray-800 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Movie not found</h1>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Backdrop */}
      <div 
        className="h-[70vh] relative bg-cover bg-center"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
        
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="absolute top-4 left-4 z-20 px-4 py-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Movie Info */}
          <div className="lg:col-span-2">
            <h1 className="text-4xl font-bold mb-4">{movie.title}</h1>
            
            {/* View Toggle */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">
                  {viewMode === 'trailer' ? 'Trailer' : 'Stream Movie'}
                </h2>
                <button
                  onClick={handleViewToggle}
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  {viewMode === 'trailer' ? 'Stream Movie' : 'Watch Trailer'}
                </button>
              </div>
              <div className="aspect-video rounded-lg overflow-hidden shadow-2xl">
                {viewMode === 'trailer' ? (
                  <iframe
                    src={trailerUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title="Movie Trailer"
                  />
                ) : (
                  <>
                    {streamError ? (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <p className="text-red-500">{streamError}</p>
                      </div>
                    ) : (
                      <iframe
                        src={vidSrcUrl}
                        className="w-full h-full"
                        allowFullScreen
                        title="Stream Movie"
                        onError={handleIframeError}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Movie Details */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-semibold mb-4">Overview</h2>
              <p className="text-gray-300 mb-6">{movie.overview}</p>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="text-gray-400">Release Date:</span>
                  <span className="text-white ml-2">{movie.release_date}</span>
                </div>
                <div>
                  <span className="text-gray-400">Rating:</span>
                  <span className="text-white ml-2">{movie.vote_average} ⭐ ({movie.vote_count} votes)</span>
                </div>
              </div>
            </div>

            {/* Cast Section */}
            {source === 'tmdb' && cast.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Cast</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {cast.map((person) => (
                    <div key={person.id} className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
                      <img
                        src={person.profile_path 
                          ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
                          : '/placeholder-person.jpg'
                        }
                        alt={person.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3">
                        <h3 className="font-semibold text-sm">{person.name}</h3>
                        <p className="text-gray-400 text-xs">{person.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TMDB Reviews Section */}
            {source === 'tmdb' && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Reviews</h2>
                {tmdbComments.length > 0 ? (
                  <div className="space-y-4">
                    {tmdbComments.map((review) => (
                      <div key={review.id} className="bg-gray-900/50 backdrop-blur-sm p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{review.author}</span>
                          <span className="text-gray-400 text-sm">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-300">{review.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No reviews available for this movie.</p>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Comments */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg sticky top-8">
              <h2 className="text-2xl font-semibold mb-4">Comments</h2>
              {session ? (
                <form onSubmit={handleCommentSubmit} className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full p-3 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none mb-2"
                    rows="3"
                  />
                  <button
                    type="submit"
                    className="w-full px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Post Comment
                  </button>
                </form>
              ) : (
                <p className="text-gray-400 mb-6">Please sign in to leave a comment.</p>
              )}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-red-500">{comment.author}</span>
                      <span className="text-sm text-gray-400">
                        {new Date(comment.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300">{comment.text}</p>
                  </div>
                ))}
              </div>

              {/* Add to List Section */}
              <div className="mt-8 pt-8 border-t border-gray-700">
                <h2 className="text-2xl font-semibold mb-4">Add to List</h2>
                {session ? (
                  <div className="space-y-4">
                    <select
                      value={selectedList}
                      onChange={(e) => setSelectedList(e.target.value)}
                      className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
                    >
                      <option value="">Select List</option>
                      <option value="watching">Watching</option>
                      <option value="will-watch">Will Watch</option>
                      <option value="already-watched">Already Watched</option>
                    </select>
                    <button
                      onClick={handleAddToList}
                      className="w-full px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Add to List
                    </button>
                    {error && <p className="text-red-500 mt-2">{error}</p>}
                  </div>
                ) : (
                  <p className="text-gray-400">Please sign in to add movies to your list.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}