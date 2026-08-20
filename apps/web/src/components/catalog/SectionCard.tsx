import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-ps-surface border border-ps-border-default rounded-[14px] p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
