"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();

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
          <p className="text-xl text-white/80 mb-8">Your Personal Mood Tracker</p>
          <div className="space-x-4">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-medium transition-colors border border-white/20"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">MoodAI Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session.user?.name}</span>
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mood Tracking Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Track Your Mood</h2>
            <p className="text-gray-600 mb-4">Record how you're feeling today</p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
              Add Mood Entry
            </button>
          </div>

          {/* Journal Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Journal Entry</h2>
            <p className="text-gray-600 mb-4">Write about your day and thoughts</p>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
              New Journal Entry
            </button>
          </div>

          {/* Recommendations Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h2>
            <p className="text-gray-600 mb-4">Get personalized suggestions</p>
            <Link
              href="/recommendations"
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors text-center"
            >
              View Recommendations
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
