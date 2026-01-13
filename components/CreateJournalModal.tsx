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
  mutation CreateJournal($userId: String!, $heading: String, $content: String!) {
    createJournal(userId: $userId, heading: $heading, content: $content) {
      id
      heading
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
  const [heading, setHeading] = useState("");
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
          variables: { 
            userId, 
            heading: heading.trim() || null, 
            content: content.trim() 
          },
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

      setHeading("");
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
      className="modal-content"
      overlayClassName="modal-overlay"
      ariaHideApp={false}
      closeTimeoutMS={200}
    >
      <div className="flex flex-col h-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header - Fixed */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">New Journal Entry</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close modal"
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

        {/* Form wrapper for proper submission */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Heading Input */}
              <div>
                <label htmlFor="heading" className="block text-sm font-medium text-gray-700 mb-2">
                  Heading (optional)
                </label>
                <input
                  id="heading"
                  type="text"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="Give your journal entry a title..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white text-gray-900 placeholder-gray-400 transition-all"
                />
              </div>

              {/* Content Textarea */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind? Write about your day, thoughts, feelings..."
                  className="w-full h-[500px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-y bg-white text-gray-900 placeholder-gray-400 text-base leading-relaxed"
                  autoFocus
                />
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Entry"
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          opacity: 0;
          transition: opacity 200ms ease-in-out;
        }

        .modal-overlay.ReactModal__Overlay--after-open {
          opacity: 1;
        }

        .modal-overlay.ReactModal__Overlay--before-close {
          opacity: 0;
        }

        .modal-content {
          position: relative;
          width: 100%;
          max-width: 48rem;
          max-height: 90vh;
          outline: none;
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
          transition: opacity 200ms ease-in-out, transform 200ms ease-in-out;
          display: flex;
          flex-direction: column;
        }

        .modal-content.ReactModal__Content--after-open {
          opacity: 1;
          transform: scale(1) translateY(0);
        }

        .modal-content.ReactModal__Content--before-close {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
        }
      `}</style>
    </Modal>
  );
}
