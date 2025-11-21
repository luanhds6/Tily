export type NotifyOptions = {
  body?: string;
  icon?: string;
  tag?: string;
};

export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return "denied";
  // Do not re-request if already denied or granted to avoid browser warnings
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch (e) {
    return "denied";
  }
}

export function notify(title: string, options: NotifyOptions = {}) {
  try {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== "granted") return;
    const icon = options.icon || "/favicon.ico";
    // Cria notificação do sistema (Windows, Android, iOS Safari com limitações)
    const n = new Notification(title, { body: options.body, icon, tag: options.tag });
    // Fecha automaticamente após alguns segundos
    setTimeout(() => n.close(), 8000);
  } catch (e) {
    // Silencia erros de permissão
  }
}