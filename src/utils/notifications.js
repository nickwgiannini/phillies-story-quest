export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("SW registration failed:", err);
    return null;
  }
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

export function sendLocalNotification(title, body) {
  if (Notification.permission !== "granted") return;
  new Notification(title, {
    body,
    tag: "phillies-game",
    renotify: true,
  });
}
