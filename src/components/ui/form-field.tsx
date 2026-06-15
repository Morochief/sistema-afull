import { ReactNode } from 'react'

export function FormField({
  label,
  error,
  required,
  children,
  description,
  htmlFor
}: {
  label: string
  error?: string
  required?: boolean
  children: ReactNode
  description?: string
  htmlFor?: string
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium flex items-center gap-1"
      >
        {label}
        {required && (
          <span className="text-destructive" aria-label="requerido">
            *
          </span>
        )}
      </label>

      {children}

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {error && (
        <p
          className="text-sm font-medium text-destructive flex items-center gap-1"
          role="alert"
        >
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      )}
    </div>
  )
}
