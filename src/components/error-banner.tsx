"use client";

interface Props {
  message: string | null;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: Props) {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 flex items-center justify-between">
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onDismiss}
        className="text-red-500 hover:text-red-700 ml-4 text-lg leading-none"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
