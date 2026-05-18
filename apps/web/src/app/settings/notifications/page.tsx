import { Switch } from "@/components/ui/switch";

const notificationOptions = [
  {
    id: "lead-assigned",
    title: "Leads asignados",
    description: "Recibe avisos cuando un lead nuevo quede bajo tu gestión.",
  },
  {
    id: "appointment-reminders",
    title: "Recordatorios de citas",
    description: "Muestra recordatorios previos a tus próximas citas.",
  },
];

export default function SettingsNotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Notificaciones</h2>
        <p className="text-sm text-muted-foreground">
          Placeholder inicial para la futura gestión granular de notificaciones.
        </p>
      </div>

      <div className="space-y-4">
        {notificationOptions.map((option) => (
          <div
            key={option.id}
            className="flex items-start justify-between gap-4 rounded-xl border p-4"
          >
            <div className="space-y-1">
              <p className="font-medium">{option.title}</p>
              <p className="text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
            <Switch aria-label={option.title} defaultChecked />
          </div>
        ))}
      </div>
    </div>
  );
}
