'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function MovieCard({ movie, source = 'tmdb', category, onDelete }) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleClick = () => {
    if (source === 'youtube') {
      router.push(`/bhutanese/${movie.id}`);
    } else {
      router.push(`/movie/${movie.id}?source=tmdb`);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!category || !onDelete) return;

    try {
      const res = await fetch('/api/movies/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId: movie.id,
          category: category
        }),
      });

      if (res.ok) {
        onDelete(movie.id);
      } else {
        console.error('Failed to delete movie');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const posterUrl = source === 'youtube' 
    ? movie.poster_path 
    : movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : '/placeholder.jpg';

  return (
    <div
      onClick={handleClick}
      className="flex-none w-64 snap-start cursor-pointer transform transition-transform hover:scale-105 relative group"
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/placeholder.jpg';
          }}
        />
        {session && category && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Remove from list"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-semibold text-lg mb-1 line-clamp-2">{movie.title}</h3>
            <div className="flex items-center text-sm text-gray-300">
              <span className="mr-2">⭐ {movie.vote_average || 'N/A'}</span>
              <span>({movie.vote_count || '0'} {source === 'youtube' ? 'views' : 'votes'})</span>
            </div>
            <p className="text-gray-300 text-sm mt-2 line-clamp-2">{movie.overview || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 