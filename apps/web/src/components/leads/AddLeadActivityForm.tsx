"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCreateLeadActivity } from "@/lib/api/leads";
import { LeadActivityType } from "@/lib/api/schemas/leads";

interface AddLeadActivityFormProps {
  leadId: string;
}

/** "+ Nota" / "+ Llamada" — logs a manual timeline entry on a lead.
 * CRM roadmap Fase 4 ("Twenty concept: Activities"). */
export function AddLeadActivityForm({ leadId }: AddLeadActivityFormProps) {
  const [type, setType] = useState<LeadActivityType>(LeadActivityType.NOTE);
  const [content, setContent] = useState("");
  const createActivity = useCreateLeadActivity(leadId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      return;
    }
    await createActivity.mutateAsync({ type, content: content.trim() });
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-2">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={type === LeadActivityType.NOTE ? "default" : "outline"}
          onClick={() => setType(LeadActivityType.NOTE)}
        >
          Nota
        </Button>
        <Button
          type="button"
          size="sm"
          variant={type === LeadActivityType.CALL ? "default" : "outline"}
          onClick={() => setType(LeadActivityType.CALL)}
        >
          Llamada
        </Button>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          type === LeadActivityType.CALL
            ? "Agregar una nota sobre la llamada..."
            : "Agregar una nota..."
        }
        className={cn("min-h-[70px]")}
      />

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={createActivity.isPending}>
          {createActivity.isPending ? "Agregando..." : "Agregar"}
        </Button>
      </div>
    </form>
  );
}
