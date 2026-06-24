import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getSocket } from "../services/socket";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  appointment_accepted: "✅",
  appointment_rejected: "❌",
  account_approved: "🎉",
  account_rejected: "🚫",
  new_appointment: "📅",
  friend_request: "👥",
  couple_request: "💑",
  tree_request: "🌳",
  parent_request: "👨‍👩‍👧",
  email_error: "⚠️",
  general: "🔔"
};

const ACTION_TYPES = ["friend_request", "couple_request", "tree_request", "parent_request"];

function getNavigationPath(type: string): string | null {
  switch (type) {
    case "appointment_accepted":
    case "appointment_rejected": return "/mes-rendez-vous";
    case "new_appointment":
    case "account_approved":
    case "account_rejected": return "/mes-comptes-pro";
    case "friend_request": return "/mes-amis";
    case "couple_request": return "/couple";
    case "tree_request":
    case "parent_request": return "/arbre";
    default: return null;
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} j`;
  const weeks = Math.floor(days / 7);
  return `${weeks} sem`;
}

async function setupPushNotifications() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return;
  const registration = await navigator.serviceWorker.ready;
  if (!registration.pushManager) return;
  try {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch("http://localhost:5002/api/push/vapid-key", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success || !data.publicKey) return;
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    }
    await fetch("http://localhost:5002/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(subscription.toJSON())
    });
  } catch { /* silently fail */ }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function showBrowserNotification(notif: Notification) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const n = new window.Notification(notif.title, {
    body: notif.message,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: notif.id,
    renotify: true
  });
  const path = getNavigationPath(notif.type);
  if (path) n.onclick = () => { window.focus(); n.close(); };
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    loadNotifications();
    const interval = setInterval(loadUnreadCount, 30000);
    setupPushNotifications();
    const socket = getSocket();
    socket.on("new-notification", (notif: Notification) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(c => c + 1);
      showBrowserNotification(notif);
      toast(
        (t) => (
          <div className="flex gap-3 items-start cursor-pointer" onClick={() => {
            toast.dismiss(t.id);
            const path = getNavigationPath(notif.type);
            if (path) navigate(path);
          }}>
            <span className="text-xl flex-shrink-0">{TYPE_ICONS[notif.type] || "🔔"}</span>
            <div>
              <p className="font-semibold text-sm text-gray-900">{notif.title}</p>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{notif.message}</p>
              {getNavigationPath(notif.type) && (
                <p className="text-xs text-blue-500 font-medium mt-1">Appuyer pour voir →</p>
              )}
            </div>
          </div>
        ),
        { duration: 6000, style: { maxWidth: 380, padding: "12px 16px" } }
      );
    });
    return () => { clearInterval(interval); socket.off("new-notification"); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("http://localhost:5002/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { /* silently fail */ }
  };

  const loadUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("http://localhost:5002/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUnreadCount(data.count || 0);
    } catch { /* silently fail */ }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:5002/api/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(n => n.map(notif => ({ ...notif, isRead: true })));
    } catch { /* silently fail */ }
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        const token = localStorage.getItem("token");
        await fetch(`http://localhost:5002/api/notifications/mark-read/${notif.id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(n => n.map(x => x.id === notif.id ? { ...x, isRead: true } : x));
        setUnreadCount(c => Math.max(0, c - 1));
      } catch { /* silently fail */ }
    }
    const path = getNavigationPath(notif.type);
    if (path) { setOpen(false); navigate(path); }
  };

  const newNotifs = notifications.filter(n => !n.isRead);
  const oldNotifs = notifications.filter(n => n.isRead);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) loadNotifications(); }}
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[min(96vw,400px)] max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">

          {/* Header Facebook-style */}
          <div className="flex items-center justify-between px-4 pt-5 pb-3 flex-shrink-0">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Tout lire
                </button>
              )}
              <button className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="overflow-y-auto flex-1 min-h-0 pb-3">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                  <span className="text-3xl">🔔</span>
                </div>
                <p className="text-base font-semibold text-gray-500">Aucune notification</p>
                <p className="text-sm text-gray-400 mt-1">Vous êtes à jour !</p>
              </div>
            ) : (
              <>
                {newNotifs.length > 0 && (
                  <div>
                    <p className="px-4 pt-1 pb-2 text-[15px] font-bold text-gray-900 dark:text-gray-100">Nouveau</p>
                    {newNotifs.map(n => (
                      <NotifItem key={n.id} notif={n} onNavigate={handleNotifClick} navigate={navigate} setOpen={setOpen} setNotifications={setNotifications} setUnreadCount={setUnreadCount} />
                    ))}
                  </div>
                )}
                {oldNotifs.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-2 text-[15px] font-bold text-gray-900 dark:text-gray-100">Plus tôt</p>
                    {oldNotifs.map(n => (
                      <NotifItem key={n.id} notif={n} onNavigate={handleNotifClick} navigate={navigate} setOpen={setOpen} setNotifications={setNotifications} setUnreadCount={setUnreadCount} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface NotifItemProps {
  notif: Notification;
  onNavigate: (n: Notification) => void;
  navigate: ReturnType<typeof useNavigate>;
  setOpen: (v: boolean) => void;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

function NotifItem({ notif, onNavigate, navigate, setOpen, setNotifications, setUnreadCount }: NotifItemProps) {
  const hasAction = ACTION_TYPES.includes(notif.type);
  const hasNav = !!getNavigationPath(notif.type);

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:5002/api/notifications/mark-read/${notif.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(n => n.map(x => x.id === notif.id ? { ...x, isRead: true } : x));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* silently fail */ }
    const path = getNavigationPath(notif.type);
    if (path) { setOpen(false); navigate(path); }
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:5002/api/notifications/mark-read/${notif.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(n => n.map(x => x.id === notif.id ? { ...x, isRead: true } : x));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { /* silently fail */ }
  };

  return (
    <div
      onClick={() => onNavigate(notif)}
      className={`flex gap-3 px-3 py-2 mx-1 rounded-xl transition-colors ${
        !notif.isRead ? "bg-blue-50 dark:bg-blue-900/20" : ""
      } ${hasNav ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" : ""}`}
    >
      {/* Avatar rond avec icône */}
      <div className="flex-shrink-0 relative">
        <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl">
          {TYPE_ICONS[notif.type] || "🔔"}
        </div>
        {!notif.isRead && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900" />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-[14px] leading-snug text-gray-900 dark:text-gray-100">
          <span className="font-semibold">{notif.title}</span>{" "}
          <span className="font-normal text-gray-700 dark:text-gray-300">{notif.message}</span>
        </p>
        <p className={`text-xs mt-0.5 font-semibold ${notif.isRead ? "text-gray-400" : "text-blue-500"}`}>
          {relativeTime(notif.created_at)}
        </p>

        {/* Boutons d'action style Facebook */}
        {hasAction && !notif.isRead && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAccept}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {notif.type === "friend_request" ? "Confirmer" : "Accepter"}
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-lg transition-colors"
            >
              {notif.type === "friend_request" ? "Supprimer" : "Refuser"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
