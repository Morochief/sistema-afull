'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
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
  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
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
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>

        <div className="flex justify-end gap-3">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
