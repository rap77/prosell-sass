/**
 * Service worker — Web Push only.
 *
 * CRM roadmap Fase 5 delivery channel. Deliberately minimal: no caching,
 * no offline support, just the two events Web Push needs. The payload
 * shape matches WebPushNotificationService's `json.dumps(...)` in the
 * backend (title, body, resource_type, resource_id).
 */

self.addEventListener("push", (event) => {
  let payload = { title: "ProSell", body: "" };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    // Malformed payload - fall back to the generic title/body above.
  }

  const resourcePath = buildResourcePath(
    payload.resource_type,
    payload.resource_id,
  );

  event.waitUntil(
    self.registration.showNotification(payload.title || "ProSell", {
      body: payload.body || "",
      data: { url: resourcePath },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (!url) return;

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.endsWith(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

function buildResourcePath(resourceType, resourceId) {
  if (!resourceType || !resourceId) return null;
  if (resourceType === "lead") return `/vendedor/leads/${resourceId}`;
  if (resourceType === "appointment")
    return `/vendedor/appointments/${resourceId}`;
  return null;
}
