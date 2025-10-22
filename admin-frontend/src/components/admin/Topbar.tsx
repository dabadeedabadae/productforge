export function Topbar({ onMenu }: { onMenu?: () => void }) {
  return (
    <header className="h-16 w-full border-b bg-neutral-50">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" className="text-black">
            <path fill="currentColor" d="M4 6l8-4l8 4l-8 4zM4 12l8-4l8 4l-8 4zM4 18l8-4l8 4l-8 4z" />
          </svg>
          <span className="text-lg font-semibold">ProductForge</span>
        </div>
        <button
          className="md:hidden inline-flex items-center justify-center rounded-md p-2"
          aria-label="Open menu"
          onClick={onMenu}
        >
          <svg width="26" height="26" viewBox="0 0 24 24">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="black" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
