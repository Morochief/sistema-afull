'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { ReactNode } from 'react'

export function DeleteConfirmDialog({
  title,
  description,
  onConfirm,
  isLoading = false,
  children,
  variant = 'icon'
}: {
  title: string
  description: string
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
  children?: ReactNode
  variant?: 'icon' | 'button'
}) {
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    await onConfirm()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {variant === 'icon' ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="destructive" size="sm" disabled={isLoading}>
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 pt-4">
          <DialogClose>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
