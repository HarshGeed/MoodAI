"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
}

interface MoodBasedRecommendations {
  moodLabel: string;
  moodCategory: string | null;
  moodScore: number | null;
  youtubeVideos: YouTubeVideo[];
  youtubeSongs: YouTubeVideo[];
  movies: TMDBMovie[];
}

const GET_MOOD_RECOMMENDATIONS = `
  query GetMoodBasedRecommendations($userId: String!) {
    getMoodBasedRecommendations(userId: $userId) {
      moodLabel
      moodCategory
      moodScore
      youtubeVideos {
        videoId
        title
        description
        thumbnail
        channelTitle
        publishedAt
      }
      youtubeSongs {
        videoId
        title
        description
        thumbnail
        channelTitle
        publishedAt
      }
      movies {
        id
        title
        overview
        posterPath
        releaseDate
        voteAverage
        genreIds
      }
    }
  }
`;

export default function RecommendationsPage() {
  const { data: session, status } = useSession();
  const [recommendations, setRecommendations] = useState<MoodBasedRecommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      // Always fetch fresh recommendations on page load
      fetchRecommendations();
    }
  }, [status, session]);

  const fetchRecommendations = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Add cache-busting timestamp to ensure fresh data
      const timestamp = Date.now();
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        cache: "no-store",
        body: JSON.stringify({
          query: GET_MOOD_RECOMMENDATIONS,
          variables: { 
            userId: session.user.id,
            _timestamp: timestamp // Cache-busting parameter
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || "Failed to fetch recommendations");
      }

      setRecommendations(result.data.getMoodBasedRecommendations);
      setLastFetchTime(timestamp);
      console.log(`✓ Fresh recommendations loaded at ${new Date(timestamp).toLocaleTimeString()}`);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching recommendations");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">MoodAI</h1>
          <p className="text-xl text-white/80 mb-8">Please sign in to view recommendations</p>
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar userName={session.user?.name || null} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header with Refresh Button */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recommendations for You</h1>
              {lastFetchTime > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              <svg 
                className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                <p className="mt-2 text-sm text-red-700">
                  Make sure you have created a journal entry and analyzed your mood first.
                </p>
              </div>
            </div>
          </div>
        )}

        {recommendations && !loading && (
          <>
            {/* Mood Status Card */}
            {/* <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 mb-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Your Current Mood</h2>
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl font-bold">{recommendations.moodLabel}</span>
                    {recommendations.moodCategory && (
                      <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                        {recommendations.moodCategory}
                      </span>
                    )}
                    {recommendations.moodScore !== null && (
                      <span className="text-lg opacity-90">
                        Score: {(recommendations.moodScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={fetchRecommendations}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div> */}

            {/* YouTube Videos Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                Recommended Videos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.youtubeVideos.map((video) => (
                  <a
                    key={video.videoId}
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{video.channelTitle}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{video.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>

            {/* YouTube Songs Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-15v10l8-5-8-5z" />
                </svg>
                Recommended Songs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.youtubeSongs.map((song) => (
                  <a
                    key={song.videoId}
                    href={`https://www.youtube.com/watch?v=${song.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {song.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{song.channelTitle}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{song.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>

            {/* Movies Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
                Recommended Movies
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendations.movies.map((movie) => (
                  <div
                    key={movie.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    {movie.posterPath ? (
                      <img
                        src={movie.posterPath}
                        alt={movie.title}
                        className="w-full h-80 object-cover"
                      />
                    ) : (
                      <div className="w-full h-80 bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">No Poster</span>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {movie.title}
                      </h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">
                          {new Date(movie.releaseDate).getFullYear()}
                        </span>
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 text-yellow-500 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">
                            {movie.voteAverage.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-3">{movie.overview}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        </main>
      </div>
    </div>
  );
}
