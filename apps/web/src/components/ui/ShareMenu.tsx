"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface ShareMenuProps {
  productTitle: string;
  productSlug: string | null | undefined;
  isPublished: boolean;
  className?: string;
}

// ponytail: hardcoded domain, env var if multi-tenant later
const PUBLIC_DOMAIN = "https://prosellweb.com";

function buildWhatsAppUrl(title: string, slug: string): string {
  const publicUrl = `${PUBLIC_DOMAIN}/p/${slug}`;
  const message = `¡Mirá este producto! ${title}\n${publicUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function ShareMenu({
  productTitle,
  productSlug,
  isPublished,
  className,
}: ShareMenuProps) {
  const [showWarning, setShowWarning] = useState(false);

  const handleShare = () => {
    if (!productSlug) return;
    window.open(
      buildWhatsAppUrl(productTitle, productSlug),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleWhatsAppClick = () => {
    if (!productSlug) return;
    if (isPublished) {
      handleShare();
    } else {
      setShowWarning(true);
    }
  };

  // No slug = can't share
  if (!productSlug) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`rounded p-1.5 hover:bg-muted ${className ?? ""}`}
            aria-label="Compartir"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={handleWhatsAppClick}
            className="cursor-pointer gap-2"
          >
            <WhatsAppIcon className="h-4 w-4" style={{ color: "#25D366" }} />
            WhatsApp
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Producto no publicado</AlertDialogTitle>
            <AlertDialogDescription>
              Este producto aún no está publicado en el marketplace. El enlace
              no será accesible públicamente. ¿Querés compartirlo de todas
              formas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleShare}>
              Compartir igual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
