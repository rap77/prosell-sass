import {
  CheckCircle2,
  Clock,
  XCircle,
  File,
  Globe,
  CheckCircle,
} from "lucide-react";

interface StatusBadgeProps {
  status: "published" | "pending" | "failed" | "draft" | "expired" | "online" | "sold";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    published: {
      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      icon: CheckCircle2,
      label: "Published",
    },
    pending: {
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      icon: Clock,
      label: "Pending",
    },
    failed: {
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      icon: XCircle,
      label: "Failed",
    },
    draft: {
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      icon: File,
      label: "Draft",
    },
    expired: {
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      icon: Clock,
      label: "Expired",
    },
    online: {
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      icon: Globe,
      label: "Online",
    },
    sold: {
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      icon: CheckCircle,
      label: "Sold",
    },
  } as const;

  const { color, icon: Icon, label } = config[status];

  return (
    <span data-testid="vehicle-status" className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="sr-only">{status}:</span>
      {label}
    </span>
  );
}
