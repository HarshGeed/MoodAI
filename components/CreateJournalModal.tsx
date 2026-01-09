"use client";

import { useState } from "react";
import Modal from "react-modal";

interface CreateJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onJournalCreated: () => void;
}

const CREATE_JOURNAL = `
  mutation CreateJournal($userId: String!, $content: String!) {
    createJournal(userId: $userId, content: $content) {
      id
      content
      createdAt
    }
  }
`;

const ANALYZE_MOOD = `
  mutation AnalyzeMood($journalId: String!) {
    analyzeMood(journalId: $journalId) {
      id
      moodLabel
      moodScore
      moodCategory
    }
  }
`;

export default function CreateJournalModal({
  isOpen,
  onClose,
  userId,
  onJournalCreated,
}: CreateJournalModalProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create the journal
      const createResponse = await fetch("/api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: CREATE_JOURNAL,
          variables: { userId, content: content.trim() },
        }),
      });

      const createResult = await createResponse.json();

      if (createResult.errors) {
        throw new Error(createResult.errors[0]?.message || "Failed to create journal");
      }

      const journalId = createResult.data.createJournal.id;

      // Step 2: Automatically analyze mood (happens in background)
      try {
        await fetch("/api/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: ANALYZE_MOOD,
            variables: { journalId },
          }),
        });
        // Mood analysis successful - user doesn't need to know
      } catch (moodError) {
        // If mood analysis fails, don't show error - journal was created successfully
        console.error("Mood analysis failed silently:", moodError);
      }

      setContent("");
      onJournalCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Create Journal"
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden outline-none"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50"
      ariaHideApp={false}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">New Journal Entry</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 p-6 overflow-y-auto">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? Write about your day, thoughts, feelings..."
              className="w-full h-full resize-none border-none outline-none text-gray-900 placeholder-gray-400"
              autoFocus
            />
          </div>

          {error && (
            <div className="px-6 py-2 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
