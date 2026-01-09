"use client";

interface JournalCardProps {
  id: string;
  content: string;
  createdAt: string;
  mood?: string | null;
  onClick: () => void;
}

export default function JournalCard({ id, content, createdAt, mood, onClick }: JournalCardProps) {
  // Extract headline (first line or first 50 chars)
  const headline = content.split("\n")[0] || content.substring(0, 50);
  const preview = content.length > 100 ? content.substring(0, 100) + "..." : content;

  // Format date
  const date = new Date(createdAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow h-48 flex flex-col"
    >
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{headline}</h3>
        <p className="text-sm text-gray-600 line-clamp-4 mb-2">{preview}</p>
      </div>
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">{formattedDate}</span>
        {mood && (
          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
            {mood}
          </span>
        )}
      </div>
    </div>
  );
}
