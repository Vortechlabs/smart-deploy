'use client'

interface LogoutConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: LogoutConfirmModalProps) {
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
                  d="M9 5V3.5a.5.5 0 00-.5-.5h-3a.5.5 0 00-.5.5V5M3 7v3.5a.5.5 0 00.5.5h7a.5.5 0 00.5-.5V7"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M1 7h12M7 7v4"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-medium text-[#102d4d] dark:text-[#dae2ef]">
                Confirm Logout
              </h2>
              <p className="text-sm text-[#4072af]/60 dark:text-[#7aa8d8]/60">
                You'll need to login again to access your projects
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-[#102d4d] dark:text-[#dae2ef]">
            Are you sure you want to logout? Any unsaved changes will be lost.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#f9f7f8] dark:bg-[#0d1e2e] text-[#4072af] dark:text-[#7aa8d8] border border-[#dae2ef] dark:border-[#1e3a5f] hover:bg-[#dae2ef]/40 dark:hover:bg-[#102d4d]/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <path
                d="M9 5V3.5a.5.5 0 00-.5-.5h-3a.5.5 0 00-.5.5V5M3 7v3.5a.5.5 0 00.5.5h7a.5.5 0 00.5-.5V7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M1 7h12M7 7v4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}