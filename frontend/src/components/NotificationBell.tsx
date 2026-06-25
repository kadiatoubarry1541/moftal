import { useState, useEffect, useRef, useCallback } from "react";
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
    case "friend_request": return "/famille/mes-amours?tab=requests";
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

interface PanelPos { top: number; right: number; width: number; }

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos>({ top: 60, right: 8, width: 380 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const computePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const maxW = Math.min(window.innerWidth - 16, 400);
    const rightOffset = Math.max(8, window.innerWidth - rect.right);
    const leftEdge = window.innerWidth - rightOffset - maxW;
    const finalRight = leftEdge < 8 ? 8 : rightOffset;
    const maxH = window.innerHeight - rect.bottom - 12;
    setPanelPos({ top: rect.bottom + 6, right: finalRight, width: maxW });
    if (panelRef.current) {
      panelRef.current.style.maxHeight = `${Math.max(200, maxH)}px`;
    }
  }, []);

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
            <span className="text-2xl flex-shrink-0">{TYPE_ICONS[notif.type] || "🔔"}</span>
            <div>
              <p className="font-bold text-sm text-gray-900">{notif.title}</p>
              <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{notif.message}</p>
              {getNavigationPath(notif.type) && (
                <p className="text-xs text-blue-600 font-semibold mt-1">Appuyer pour voir →</p>
              )}
            </div>
          </div>
        ),
        { duration: 6000, style: { maxWidth: 380, padding: "14px 16px", background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" } }
      );
    });
    return () => { clearInterval(interval); socket.off("new-notification"); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = () => {
    if (!open) {
      computePos();
      loadNotifications();
    }
    setOpen(v => !v);
  };

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
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        {/* Icône cloche SVG nette */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[20px] h-5 px-1 text-[11px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: panelPos.top,
            right: panelPos.right,
            width: panelPos.width,
            zIndex: 99999,
            maxHeight: "80vh",
            boxShadow: "0 8px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)",
            border: "1px solid rgba(0,0,0,0.09)",
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste scrollable */}
          <div className="overflow-y-auto flex-1 bg-white">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <p className="text-base font-bold text-gray-700">Aucune notification</p>
                <p className="text-sm text-gray-400 mt-1 text-center">Vous êtes à jour !</p>
              </div>
            ) : (
              <>
                {newNotifs.length > 0 && (
                  <div>
                    <p className="px-5 pt-4 pb-1 text-[13px] font-bold text-gray-500 uppercase tracking-wider">Nouveaux</p>
                    {newNotifs.map(n => (
                      <NotifItem
                        key={n.id}
                        notif={n}
                        onNavigate={handleNotifClick}
                        navigate={navigate}
                        setOpen={setOpen}
                        setNotifications={setNotifications}
                        setUnreadCount={setUnreadCount}
                      />
                    ))}
                  </div>
                )}
                {oldNotifs.length > 0 && (
                  <div>
                    <p className="px-5 pt-4 pb-1 text-[13px] font-bold text-gray-500 uppercase tracking-wider">Plus tôt</p>
                    {oldNotifs.map(n => (
                      <NotifItem
                        key={n.id}
                        notif={n}
                        onNavigate={handleNotifClick}
                        navigate={navigate}
                        setOpen={setOpen}
                        setNotifications={setNotifications}
                        setUnreadCount={setUnreadCount}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
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
      onClick={() => hasNav && onNavigate(notif)}
      className={`flex gap-3 px-4 py-3 transition-colors ${
        !notif.isRead ? "bg-blue-50" : "bg-white"
      } ${hasNav ? "cursor-pointer hover:bg-gray-50" : ""}`}
    >
      {/* Icône ronde */}
      <div className="flex-shrink-0 relative mt-0.5">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${!notif.isRead ? "bg-blue-100" : "bg-gray-100"}`}>
          {TYPE_ICONS[notif.type] || "🔔"}
        </div>
        {!notif.isRead && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Contenu texte */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] leading-snug font-bold text-gray-900">{notif.title}</p>
        <p className="text-[13px] leading-relaxed text-gray-600 mt-0.5 break-words">{notif.message}</p>
        <p className={`text-[12px] font-semibold mt-1 ${notif.isRead ? "text-gray-400" : "text-blue-500"}`}>
          {relativeTime(notif.created_at)}
        </p>

        {/* Boutons action */}
        {hasAction && !notif.isRead && (
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={handleAccept}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {notif.type === "friend_request" ? "Confirmer" : "Accepter"}
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-xl transition-colors"
            >
              {notif.type === "friend_request" ? "Supprimer" : "Refuser"}
            </button>
          </div>
        )}
      </div>

      {/* Point bleu à droite si non lu */}
      {!notif.isRead && !hasAction && (
        <div className="flex-shrink-0 flex items-center">
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
        </div>
      )}
    </div>
  );
}
