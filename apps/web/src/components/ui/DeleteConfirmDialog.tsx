"use client";

import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title of the item being deleted (shown in dialog) */
  itemTitle: string;
  /** Called when user confirms deletion */
  onConfirm: () => void;
  /** Loading state while delete is in progress */
  isDeleting?: boolean;
}

/**
 * Delete confirmation dialog with warning icon and clear messaging.
 *
 * Design: Open Design prosell-delete-confirm-modal-3d91
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemTitle,
  onConfirm,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[420px]">
        {/* Warning icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <AlertDialogHeader className="text-center sm:text-center">
          <AlertDialogTitle className="text-lg">
            ¿Estás seguro?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            Estás a punto de eliminar{" "}
            <span className="font-medium text-foreground">
              &quot;{itemTitle}&quot;
            </span>
            . Esta acción no se puede deshacer y el producto será removido
            permanentemente del catálogo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 sm:justify-center">
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
