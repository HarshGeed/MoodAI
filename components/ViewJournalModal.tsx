"use client";

import Modal from "react-modal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Journal {
  id: string;
  heading?: string | null;
  content: string;
  createdAt: string;
  mood?: string | null;
}

interface ViewJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: Journal | null;
}

export default function ViewJournalModal({ isOpen, onClose, journal }: ViewJournalModalProps) {

  if (!journal) return null;

  const date = new Date(journal.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="View Journal"
      className="modal-content-view"
      overlayClassName="modal-overlay-view"
      ariaHideApp={false}
      closeTimeoutMS={200}
    >
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {journal.heading || "Journal Entry"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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
          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{formattedTime}</span>
            {journal.mood && (
              <>
                <span>•</span>
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                  {journal.mood}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-900">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {journal.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-xl"
          >
            Close
          </button>
        </div>
      </div>

      <style jsx global>{`
        .modal-overlay-view {
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

        .modal-overlay-view.ReactModal__Overlay--after-open {
          opacity: 1;
        }

        .modal-overlay-view.ReactModal__Overlay--before-close {
          opacity: 0;
        }

        .modal-content-view {
          position: relative;
          width: 100%;
          max-width: 48rem;
          max-height: 90vh;
          outline: none;
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
          transition: opacity 200ms ease-in-out, transform 200ms ease-in-out;
        }

        .modal-content-view.ReactModal__Content--after-open {
          opacity: 1;
          transform: scale(1) translateY(0);
        }

        .modal-content-view.ReactModal__Content--before-close {
          opacity: 0;
          transform: scale(0.95) translateY(-10px);
        }
      `}</style>
    </Modal>
  );
}
