export function LoadingState({
  message = 'Cargando...',
  size = 'md'
}: {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div
        className={`animate-spin rounded-full border-4 border-muted border-t-primary ${sizeClasses[size]}`}
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
