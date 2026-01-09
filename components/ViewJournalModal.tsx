"use client";

import Modal from "react-modal";

interface Journal {
  id: string;
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
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden outline-none"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50"
      ariaHideApp={false}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900">Journal Entry</h2>
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
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{formattedTime}</span>
            {journal.mood && (
              <>
                <span>•</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {journal.mood}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="prose max-w-none">
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{journal.content}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
