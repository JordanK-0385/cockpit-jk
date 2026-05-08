export function Loader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <span className="absolute inset-0 rounded-full border-2 border-sage/20" />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-sage animate-spin" />
        </div>
        <span className="eyebrow">{label}</span>
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}
