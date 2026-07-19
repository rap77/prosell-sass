"use client";

import { useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
import { Share2, Link2, Check } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
 * URL BUILDING
 * ───────────────────────────────────────────────────────────────────────────── */

function getPublicDomain(): string {
  // ponytail: env var → window.location.origin fallback
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SHARE OPTIONS CONFIGURATION
 * ───────────────────────────────────────────────────────────────────────────── */

const SHARE_OPTION_IDS = {
  whatsapp: "whatsapp",
  facebook: "facebook",
  twitter: "twitter",
  copyLink: "copy-link",
} as const;

type ShareOptionId = (typeof SHARE_OPTION_IDS)[keyof typeof SHARE_OPTION_IDS];

interface ShareOption {
  id: ShareOptionId;
  label: string;
  icon: ReactNode;
  shortcut?: string;
  hoverClasses?: string;
  handler: (url: string, title: string) => void | Promise<void>;
}

const WhatsAppIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const FacebookIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const XIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

function createShareOptions(onCopySuccess: () => void): ShareOption[] {
  return [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      shortcut: "⌘W",
      hoverClasses:
        "hover:bg-success/15 hover:text-success focus:bg-success/15 focus:text-success",
      handler: (url, title) => {
        const message = `¡Mirá este producto! ${title}\n${url}`;
        window.open(
          `https://wa.me/?text=${encodeURIComponent(message)}`,
          "_blank",
          "noopener,noreferrer",
        );
      },
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: <FacebookIcon />,
      shortcut: "⌘F",
      hoverClasses:
        "hover:bg-blue-500/15 hover:text-blue-400 focus:bg-blue-500/15 focus:text-blue-400",
      handler: (url) => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank",
          "noopener,noreferrer",
        );
      },
    },
    {
      id: "twitter",
      label: "X (Twitter)",
      icon: <XIcon />,
      shortcut: "⌘T",
      hoverClasses:
        "hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white",
      handler: (url, title) => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
          "_blank",
          "noopener,noreferrer",
        );
      },
    },
    {
      id: "copy-link",
      label: "Copiar enlace",
      icon: <Link2 className="h-4 w-4" />,
      shortcut: "⌘C",
      hoverClasses:
        "hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white",
      handler: async (url) => {
        await navigator.clipboard.writeText(url);
        onCopySuccess();
      },
    },
  ];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SHARE MENU COMPONENT
 * ───────────────────────────────────────────────────────────────────────────── */

interface ShareMenuProps {
  productTitle: string;
  productSlug: string | null | undefined;
  isPublished: boolean;
  className?: string;
  onShare?: (optionId: ShareOptionId) => void;
  visibleOptions?: ShareOptionId[];
}

export function ShareMenu({
  productTitle,
  productSlug,
  isPublished,
  className,
  onShare,
  visibleOptions,
}: ShareMenuProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [pendingOption, setPendingOption] = useState<ShareOption | null>(null);
  const [copied, setCopied] = useState(false);

  // ponytail: hooks must be called unconditionally, early return after
  const handleCopySuccess = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = createShareOptions(handleCopySuccess);

  const filteredOptions = visibleOptions
    ? shareOptions.filter((opt) => visibleOptions.includes(opt.id))
    : shareOptions;

  // No slug = can't share
  if (!productSlug) return null;

  const shareUrl = `${getPublicDomain()}/p/${productSlug}`;

  const executeShare = (option: ShareOption) => {
    option.handler(shareUrl, productTitle);
    onShare?.(option.id);
  };

  const handleOptionClick = (option: ShareOption) => {
    if (!isPublished) {
      setPendingOption(option);
      setIsAlertOpen(true);
    } else {
      executeShare(option);
    }
  };

  const handleAlertConfirm = () => {
    if (pendingOption) {
      executeShare(pendingOption);
      setPendingOption(null);
    }
    setIsAlertOpen(false);
  };

  const handleAlertCancel = () => {
    setPendingOption(null);
    setIsAlertOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`
              group
              rounded
              border
              border-white/10
              bg-card
              p-1.5
              text-white/80
              transition-all
              duration-200
              hover:border-white/20
              hover:bg-white/5
              hover:text-white
              focus-visible:ring-2
              focus-visible:ring-white/20
              focus-visible:ring-offset-2
              focus-visible:ring-offset-background
              active:scale-[0.98]
              ${className ?? ""}
            `}
            aria-label="Compartir"
          >
            <Share2 className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="min-w-[200px] border-white/10 bg-card p-1.5 shadow-xl shadow-black/20"
        >
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-white/40">
            Compartir vía
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-1 bg-white/5" />

          {filteredOptions.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleOptionClick(option)}
              className={`
                group/item
                flex
                min-h-[44px]
                cursor-pointer
                items-center
                gap-3
                rounded-md
                px-3
                py-2.5
                text-white/80
                outline-none
                transition-all
                duration-150
                ${option.hoverClasses ?? "hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"}
              `}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 transition-colors duration-150 group-hover/item:bg-white/10">
                {option.id === "copy-link" && copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  option.icon
                )}
              </span>

              <span className="flex-1 text-sm font-medium">
                {option.id === "copy-link" && copied
                  ? "¡Copiado!"
                  : option.label}
              </span>

              {option.shortcut && (
                <kbd className="hidden rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/30 sm:inline-block">
                  {option.shortcut}
                </kbd>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="border-white/10 bg-card text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Producto no publicado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Este producto aún no está publicado en el marketplace. El enlace
              no será accesible públicamente. ¿Querés compartirlo de todas
              formas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              onClick={handleAlertCancel}
              className="border-white/10 bg-transparent text-white/80 hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAlertConfirm}
              className="bg-success text-white hover:bg-success/90"
            >
              Compartir igual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
