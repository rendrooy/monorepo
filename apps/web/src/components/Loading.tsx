type LoadingProps = {
  open?: boolean;
  text?: string;
  className?: string;
};

export default function Loading({
  open = false,
  className = "",
}: Readonly<LoadingProps>) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[1px] pointer-events-auto ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white/10 px-6 py-5 text-white">
        <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>
    </div>
  );
}
