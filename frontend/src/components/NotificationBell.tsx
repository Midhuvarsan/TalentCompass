import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { AppNotification } from "../api/api";
import { BellIcon, BriefcaseIcon, CheckCircleIcon, SparklesIcon } from "./Icons";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  async function loadUnreadCount() {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.count);
    } catch {
      // ignore transient failures, next poll will retry
    }
  }

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) loadNotifications();
  }

  async function handleMarkAllRead() {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function handleNotificationClick(n: AppNotification) {
    if (!n.isRead) {
      await api.patch(`/notifications/${n.id}/read`);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  function iconFor(type: AppNotification["type"]) {
    if (type === "new_application") return <BriefcaseIcon />;
    if (type === "application_status") return <CheckCircleIcon />;
    return <SparklesIcon />;
  }

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button className="icon-btn" onClick={toggleOpen} aria-label="Notifications" aria-expanded={open}>
        <BellIcon />
        {unreadCount > 0 && <span className="notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <strong>Notifications</strong>
            {notifications.some((n) => !n.isRead) && (
              <button className="link-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-list">
            {loading && <p className="muted notif-empty">Loading...</p>}
            {!loading && notifications.length === 0 && (
              <p className="muted notif-empty">You&apos;re all caught up.</p>
            )}
            {!loading &&
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.isRead ? "" : "unread"}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span className="notif-item-icon">{iconFor(n.type)}</span>
                  <div>
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-message">{n.message}</div>
                    <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
