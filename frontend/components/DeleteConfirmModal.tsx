'use client'

interface DeleteConfirmModalProps {
  isOpen: boolean
  projectName: string
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}

export default function DeleteConfirmModal({
  isOpen,
  projectName,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-2xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#dae2ef] dark:border-[#1e3a5f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                viewBox="0 0 14 14"
                fill="none"
              >
                <path
                  d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.2a1 1 0 001 .8h4.6a1 1 0 001-.8L11 4"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-medium text-[#102d4d] dark:text-[#dae2ef]">
                Delete Project
              </h2>
              <p className="text-sm text-[#4072af]/60 dark:text-[#7aa8d8]/60">
                This action cannot be undone
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-[#102d4d] dark:text-[#dae2ef]">
            Are you sure you want to delete{' '}
            <span className="font-medium text-[#4072af] dark:text-[#7aa8d8]">
              {projectName}
            </span>
            ? This will permanently delete the project and all associated:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-[#4072af]/70 dark:text-[#7aa8d8]/70">
            <li className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="1.5" fill="currentColor" />
              </svg>
              Source code and configurations
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="1.5" fill="currentColor" />
              </svg>
              Deployment history and logs
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="1.5" fill="currentColor" />
              </svg>
              Environment variables and settings
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#f9f7f8] dark:bg-[#0d1e2e] text-[#4072af] dark:text-[#7aa8d8] border border-[#dae2ef] dark:border-[#1e3a5f] hover:bg-[#dae2ef]/40 dark:hover:bg-[#102d4d]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                >
                  <path
                    d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.2a1 1 0 001 .8h4.6a1 1 0 001-.8L11 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Delete Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}