import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function getInitials(name: string | undefined) {
  if (!name) return "??"
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function AppHeader({ name }: { name?: string }) {
  const today = new Date()
  const dateLabel = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(today)

  return (
    <header className="flex items-center gap-3 bg-primary px-5 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-primary-foreground">
      <Avatar className="size-12 border-2 border-primary-foreground/30">
        <AvatarFallback className="bg-primary-foreground/15 text-primary-foreground font-semibold">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm/none text-primary-foreground/70">Hola,</span>
        <span className="text-xl font-semibold leading-tight">{name}</span>
        <span className="mt-0.5 text-xs capitalize text-primary-foreground/70">
          {dateLabel}
        </span>
      </div>
    </header>
  )
}
