// YouTube API service for fetching videos and songs based on mood

interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        high: { url: string };
        medium: { url: string };
        default: { url: string };
      };
      channelTitle: string;
      publishedAt: string;
    };
  }>;
}

/**
 * Maps mood categories to YouTube search queries
 */
function getMoodSearchQueries(moodLabel: string, moodCategory: string): {
  videos: string[];
  songs: string[];
} {
  const moodLower = moodLabel.toLowerCase();
  
  const queries: Record<string, { videos: string[]; songs: string[] }> = {
    happy: {
      videos: ["motivational videos", "uplifting content", "funny videos", "positive energy"],
      songs: ["happy songs", "uplifting music", "feel good songs", "upbeat music"],
    },
    sad: {
      videos: ["comforting videos", "emotional support", "calming nature videos", "healing content"],
      songs: ["calming music", "sad songs", "emotional music", "peaceful songs"],
    },
    angry: {
      videos: ["stress relief", "anger management", "workout motivation", "calming exercises"],
      songs: ["energetic music", "workout songs", "pump up music", "intense music"],
    },
    stressed: {
      videos: ["meditation", "relaxation techniques", "stress relief", "mindfulness"],
      songs: ["relaxing music", "meditation music", "calm music", "peaceful instrumental"],
    },
    calm: {
      videos: ["nature documentaries", "peaceful scenes", "mindfulness", "zen content"],
      songs: ["ambient music", "chill music", "lo-fi", "soft music"],
    },
    neutral: {
      videos: ["trending videos", "popular content", "entertainment", "educational videos"],
      songs: ["popular music", "trending songs", "top hits", "chart music"],
    },
  };

  return queries[moodLower] || queries.neutral;
}

/**
 * Search YouTube for videos
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 5
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not set in environment variables");
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.append("part", "snippet");
  url.searchParams.append("q", query);
  url.searchParams.append("type", "video");
  url.searchParams.append("maxResults", maxResults.toString());
  url.searchParams.append("key", apiKey);
  url.searchParams.append("order", "relevance");

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data: YouTubeSearchResponse = await response.json();

    return data.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    throw error;
  }
}

/**
 * Get YouTube recommendations based on mood
 */
export async function getYouTubeRecommendationsByMood(
  moodLabel: string,
  moodCategory: string
): Promise<{
  videos: YouTubeVideo[];
  songs: YouTubeVideo[];
}> {
  const { videos: videoQueries, songs: songQueries } = getMoodSearchQueries(moodLabel, moodCategory);

  // Get videos from the first query
  const videos = await searchYouTubeVideos(videoQueries[0], 5);

  // Get songs from the first query
  const songs = await searchYouTubeVideos(songQueries[0], 5);

  return { videos, songs };
}
