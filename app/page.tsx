"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import JournalCard from "@/components/JournalCard";
import CreateJournalModal from "@/components/CreateJournalModal";
import ViewJournalModal from "@/components/ViewJournalModal";

interface Journal {
  id: string;
  content: string;
  mood: string | null;
  createdAt: string;
}

const GET_JOURNALS = `
  query GetJournalsByUser($userId: String!) {
    getJournalsByUser(userId: $userId) {
      id
      content
      mood
      createdAt
    }
  }
`;

export default function Home() {
  const { data: session, status } = useSession();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchJournals();
    }
  }, [status, session]);

  const fetchJournals = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: GET_JOURNALS,
          variables: { userId: session.user.id },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        console.error("Error fetching journals:", result.errors);
      } else {
        setJournals(result.data.getJournalsByUser || []);
      }
    } catch (error) {
      console.error("Error fetching journals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJournalClick = (journal: Journal) => {
    setSelectedJournal(journal);
    setIsViewModalOpen(true);
  };

  const handleJournalCreated = () => {
    fetchJournals();
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar userName={session.user?.name || null} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">My Journals</h1>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>New Journal</span>
            </button>
          </div>
        </header>

        {/* Journals Grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
            </div>
          ) : journals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg
                className="w-24 h-24 text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No journals yet</h2>
              <p className="text-gray-600 mb-6">Start writing your first journal entry</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create Your First Journal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {journals.map((journal) => (
                <JournalCard
                  key={journal.id}
                  id={journal.id}
                  content={journal.content}
                  createdAt={journal.createdAt}
                  mood={journal.mood}
                  onClick={() => handleJournalClick(journal)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateJournalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userId={session.user?.id || ""}
        onJournalCreated={handleJournalCreated}
      />

      <ViewJournalModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedJournal(null);
        }}
        journal={selectedJournal}
      />
    </div>
  );
}
