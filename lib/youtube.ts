// YouTube API service for fetching videos and songs based on mood
import { upsertVector } from "./pinecone";

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
  maxResults: number = 10
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("⚠ YOUTUBE_API_KEY is not set in environment variables");
    throw new Error("YOUTUBE_API_KEY is not configured");
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText;
      
      console.error(`✗ YouTube API error (${response.status}):`, errorMessage);
      
      // Provide specific error messages
      if (response.status === 403) {
        if (errorMessage.includes("quota")) {
          throw new Error("YouTube API quota exceeded. Please try again later.");
        } else if (errorMessage.includes("disabled")) {
          throw new Error("YouTube Data API v3 is not enabled. Please enable it in Google Cloud Console.");
        } else {
          throw new Error("YouTube API key is invalid or restricted. Please check your API key configuration.");
        }
      }
      
      throw new Error(`YouTube API error: ${errorMessage}`);
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
 * Fetches fresh data from YouTube API (not from Pinecone cache)
 */
export async function getYouTubeRecommendationsByMood(
  moodLabel: string,
  moodCategory: string
): Promise<{
  videos: YouTubeVideo[];
  songs: YouTubeVideo[];
}> {
  const { videos: videoQueries, songs: songQueries } = getMoodSearchQueries(moodLabel, moodCategory);

  // Fetch more results from API to ensure variety and freshness
  // Using multiple queries to get diverse results
  const videoPromises = videoQueries.slice(0, 3).map((query) => searchYouTubeVideos(query, 15));
  const songPromises = songQueries.slice(0, 3).map((query) => searchYouTubeVideos(query, 15));

  const videoResults = await Promise.all(videoPromises);
  const songResults = await Promise.all(songPromises);

  // Combine results and remove duplicates
  const videos = Array.from(
    new Map(
      videoResults.flat().map((v) => [v.videoId, v])
    ).values()
  );
  const songs = Array.from(
    new Map(
      songResults.flat().map((s) => [s.videoId, s])
    ).values()
  );

  console.log(`✓ Fetched ${videos.length} fresh videos and ${songs.length} fresh songs from YouTube API`);
  return { videos, songs };
}

/**
 * Store YouTube video/song metadata as embeddings in Pinecone
 * Uses descriptive text (title + description), not IDs
 */
export async function storeYouTubeVideoEmbedding(
  video: YouTubeVideo,
  type: "video" | "song"
): Promise<void> {
  // Create descriptive text for embedding (NOT ID-based)
  const textContent = `${video.title}. ${video.description}. Channel: ${video.channelTitle}`;
  
  const vectorId = `youtube-${type}-${video.videoId}`;
  
  try {
    await upsertVector(
      vectorId,
      textContent,
      {
        source: "youtube",
        type,
        videoId: video.videoId,
        title: video.title,
        channelTitle: video.channelTitle,
        thumbnail: video.thumbnail,
        publishedAt: video.publishedAt,
      }
    );
  } catch (error) {
    // Log but don't fail - graceful degradation
    console.warn(`⚠ Failed to store ${type} embedding for ${video.videoId}:`, error);
  }
}
