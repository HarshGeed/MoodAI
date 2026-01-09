# Recommendations System Setup Guide

## Overview
The recommendations system provides personalized YouTube videos, songs, and movies based on the user's current mood, which is calculated from their journal entries.

## Environment Variables Required

Add these to your `.env` file:

```env
# YouTube Data API v3
YOUTUBE_API_KEY=your_youtube_api_key_here

# TMDB (The Movie Database) API
TMDB_API_KEY=your_tmdb_api_key_here
```

## How to Get API Keys

### YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "YouTube Data API v3"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the API key and add it to your `.env` file

### TMDB API Key
1. Go to [TMDB](https://www.themoviedb.org/) and create an account
2. Go to Settings → API
3. Request an API key (free tier available)
4. Once approved, copy the API key and add it to your `.env` file

## Features Implemented

### 1. API Services
- **`lib/youtube.ts`**: YouTube API integration for videos and songs
- **`lib/tmdb.ts`**: TMDB API integration for movies

### 2. GraphQL Schema & Resolvers
- **New Query**: `getMoodBasedRecommendations(userId: String!)`
- **New Mutation**: `generateMoodBasedRecommendations(userId: String!)`
- Returns YouTube videos, songs, and movies based on current mood

### 3. Recommendations Page
- **Route**: `/recommendations`
- Displays:
  - Current mood status
  - YouTube videos (5 recommendations)
  - YouTube songs (5 recommendations)
  - TMDB movies (10 recommendations)

## Mood-to-Recommendation Mapping

| Mood | Videos | Songs | Movies |
|------|--------|-------|--------|
| Happy | Motivational, uplifting | Happy songs, upbeat music | Comedy, Animation |
| Sad | Comforting, emotional support | Calming music, peaceful songs | Drama, Romance |
| Angry | Stress relief, workout | Energetic music, pump up | Action, Thriller |
| Stressed | Meditation, relaxation | Relaxing music, meditation | Comedy, Documentary |
| Calm | Nature, peaceful scenes | Ambient, chill music | Documentary, Drama |
| Neutral | Trending, popular | Popular music, top hits | Popular movies |

## Usage Flow

1. User writes a journal entry
2. Mood is analyzed using Gemini AI (via `analyzeMood` mutation)
3. User visits `/recommendations` page
4. System fetches the most recent mood record
5. Recommendations are generated based on mood:
   - YouTube videos and songs via YouTube API
   - Movies via TMDB API
6. Recommendations are displayed in a beautiful UI

## GraphQL Query Example

```graphql
query GetMoodBasedRecommendations($userId: String!) {
  getMoodBasedRecommendations(userId: $userId) {
    moodLabel
    moodCategory
    moodScore
    youtubeVideos {
      videoId
      title
      thumbnail
      channelTitle
    }
    youtubeSongs {
      videoId
      title
      thumbnail
      channelTitle
    }
    movies {
      id
      title
      overview
      posterPath
      releaseDate
      voteAverage
    }
  }
}
```

## Notes

- The system uses the **most recent mood record** for recommendations
- If no mood records exist, an error message is shown prompting the user to create a journal entry first
- All API calls are server-side (via GraphQL resolvers)
- The recommendations page includes a refresh button to regenerate recommendations
