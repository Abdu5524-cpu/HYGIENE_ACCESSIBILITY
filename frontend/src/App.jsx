import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import { CATS } from "./constants";
import { apiFetch } from "./api.js";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const INITIAL_ALERTS = [
  { id: 1, lat: 40.7128, lng: -74.006,  title: "Water main break",   cat: "hazard",  desc: "Avoid W 34th St",      time: Date.now() - 1000 * 60 * 5,  confirms: 0, dismisses: 0 },
  { id: 2, lat: 40.758,  lng: -73.985,  title: "Heavy traffic",       cat: "traffic", desc: "Times Sq gridlock",    time: Date.now() - 1000 * 60 * 12, confirms: 0, dismisses: 0 },
  { id: 3, lat: 40.7484, lng: -73.996,  title: "Suspicious activity", cat: "crime",   desc: "Near Herald Sq",       time: Date.now() - 1000 * 60 * 22, confirms: 0, dismisses: 0 },
  { id: 4, lat: 40.7061, lng: -73.997,  title: "Street fair today",   cat: "info",    desc: "Brooklyn Bridge area", time: Date.now() - 1000 * 60 * 40, confirms: 0, dismisses: 0 },
];

const ALERT_RADIUS_M = 100;
const NEARBY_RADIUS_M = 2000;

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#185FA5;border:3px solid #fff;box-shadow:0 0 0 2px #185FA5;"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

const searchIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#7C3AED;border:3px solid #fff;box-shadow:0 0 0 2px #7C3AED;"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});

function makeIcon(cat) {
  const c = CATS[cat];
  return L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${c.color};display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:15px;line-height:1;">${c.icon}</span>
    </div>`,
    iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -44],
  });
}

function MapClickHandler({ addMode, onMapClick }) {
  useMapEvents({ click(e) { if (addMode) onMapClick(e.latlng); } });
  return null;
}

function MapController({ flyToRef }) {
  const map = useMap();
  useEffect(() => {
    flyToRef.current = (pos, zoom = 15) => map.flyTo(pos, zoom, { duration: 1.5 });
  }, [map]);
  return null;
}

function AddAlertPanel({ latlng, onSubmit, onClose }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("hazard");
  const [desc, setDesc] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), cat, desc: desc.trim() });
    setTitle(""); setDesc(""); setCat("hazard");
  };

  return (
    <div style={{ position: "absolute", right: 12, top: 12, width: 240, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, zIndex: 1000, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", fontWeight: 500, fontSize: 13, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
        New alert
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6b7280" }}>x</button>
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (e.g. Road closed)"
          style={{ fontSize: 13, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none" }} />
        <select value={cat} onChange={e => setCat(e.target.value)}
          style={{ fontSize: 13, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6 }}>
          {Object.entries(CATS).map(([key, c]) => (
            <option key={key} value={key}>{c.icon} {c.label}</option>
          ))}
        </select>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
          style={{ fontSize: 13, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, height: 64, resize: "none" }} />
        <div style={{ fontSize: 11, color: "#6b7280" }}>Lat: {latlng.lat.toFixed(4)}, Lng: {latlng.lng.toFixed(4)}</div>
        <button onClick={handleSubmit} style={{ padding: 8, background: "#185FA5", color: "#fff", border: "none", borderRadius: 6, fontWeight: 500, cursor: "pointer" }}>
          Post alert
        </button>
      </div>
    </div>
  );
}

function NearbyPanel({ alerts, userPos, activeFilter, onFilterChange, onFlyTo, onClose }) {
  const [search, setSearch] = useState("");
  const withDistance = alerts
    .map(a => ({ ...a, dist: userPos ? getDistance(userPos[0], userPos[1], a.lat, a.lng) : null }))
    .filter(a => userPos ? a.dist <= NEARBY_RADIUS_M : true)
    .filter(a => activeFilter === "all" || a.cat === activeFilter)
    .filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || (a.desc || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.dist ?? 99999) - (b.dist ?? 99999));

  return (
    <div style={{ position: "absolute", left: 12, top: 12, width: 260, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, zIndex: 1000, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", overflow: "hidden", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 14px", fontWeight: 500, fontSize: 13, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Nearby alerts
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6b7280" }}>x</button>
      </div>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alerts..."
          style={{ width: "100%", fontSize: 13, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ padding: "6px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["all", ...Object.keys(CATS)].map(cat => (
          <button key={cat} onClick={() => onFilterChange(cat)} style={{
            padding: "2px 8px", fontSize: 11, borderRadius: 20, cursor: "pointer",
            border: "1px solid #d1d5db",
            background: activeFilter === cat ? "#185FA5" : "#f9fafb",
            color: activeFilter === cat ? "#fff" : "#374151",
          }}>
            {cat === "all" ? "All" : `${CATS[cat].icon} ${CATS[cat].label}`}
          </button>
        ))}
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {withDistance.length === 0
          ? <div style={{ padding: "16px 14px", fontSize: 13, color: "#6b7280", textAlign: "center" }}>No alerts found</div>
          : withDistance.map(a => (
            <div key={a.id} onClick={() => onFlyTo([a.lat, a.lng])}
              style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{CATS[a.cat].icon} {a.title}</span>
                {a.dist !== null && <span style={{ fontSize: 11, color: "#6b7280" }}>{a.dist < 1000 ? `${Math.round(a.dist)}m` : `${(a.dist / 1000).toFixed(1)}km`}</span>}
              </div>
              {a.desc && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{a.desc}</div>}
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{timeAgo(a.time)}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoginScreen
// Shown when no user is stored in localStorage.
// Supports both login (existing user) and register (new user).
// On success, calls onLogin with the user object returned by the backend.
// ---------------------------------------------------------------------------
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ username: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let user;
      if (mode === "login") {
        user = await apiFetch("/api/users/login", {
          method: "POST",
          body: JSON.stringify({ username: form.username, password: form.password }),
        });
      } else {
        user = await apiFetch("/api/users", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f9fafb" }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "32px 28px", width: 320, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#111827" }}>Hazard Hound</h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#6b7280" }}>
          {mode === "login" ? "Sign in to your account" : "Create a new account"}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "register" && (
            <>
              <input value={form.firstName} onChange={set("firstName")} placeholder="First name" required
                style={inputStyle} />
              <input value={form.lastName} onChange={set("lastName")} placeholder="Last name" required
                style={inputStyle} />
            </>
          )}
          <input value={form.username} onChange={set("username")} placeholder="Username" required
            style={inputStyle} />
          <input value={form.password} onChange={set("password")} placeholder="Password" type="password" required
            style={inputStyle} />

          {error && <p style={{ margin: 0, fontSize: 12, color: "#A32D2D" }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ marginTop: 4, padding: "10px 0", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p style={{ margin: "16px 0 0", fontSize: 13, textAlign: "center", color: "#6b7280" }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
            style={{ background: "none", border: "none", color: "#185FA5", cursor: "pointer", fontWeight: 500, fontSize: 13, padding: 0 }}>
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  fontSize: 13, padding: "8px 10px",
  border: "1px solid #d1d5db", borderRadius: 8, outline: "none",
};

// ---------------------------------------------------------------------------
// ProfileScreen
// Fetches the real conditions list from the backend.
// Condition toggles call POST/DELETE /api/users/:id/conditions.
// notifCategories (which hazard types to notify about) stay local —
// they are UI preferences not yet stored in the backend schema.
// ---------------------------------------------------------------------------
function ProfileScreen({ user, onUserUpdate, notifCategories, onToggleCategory, onBack, onLogout }) {
  const [allConditions, setAllConditions] = useState([]);
  const [loadingConditions, setLoadingConditions] = useState(true);
  const [togglingSlug, setTogglingSlug] = useState(null); // slug of condition currently being saved

  // Fetch the full conditions list from the backend on mount
  useEffect(() => {
    apiFetch("/api/conditions")
      .then(setAllConditions)
      .catch(() => setAllConditions([]))
      .finally(() => setLoadingConditions(false));
  }, []);

  // Toggle a condition slug on the user — calls backend, updates local user state on success
  const handleToggleCondition = async (slug) => {
    if (togglingSlug) return; // prevent double-taps while saving
    setTogglingSlug(slug);
    try {
      const hasIt = user.conditions.includes(slug);
      let updatedUser;
      if (hasIt) {
        updatedUser = await apiFetch(`/api/users/${user._id}/conditions/${slug}`, { method: "DELETE" });
      } else {
        updatedUser = await apiFetch(`/api/users/${user._id}/conditions`, {
          method: "POST",
          body: JSON.stringify({ slug }),
        });
      }
      onUserUpdate(updatedUser);
    } catch (err) {
      console.error("Failed to toggle condition:", err.message);
    } finally {
      setTogglingSlug(null);
    }
  };

  return (
    <div className="profile-screen">

      {/* Header */}
      <div className="profile-header">
        <button onClick={onBack} className="back-btn">← Back to map</button>
        <h1>Profile</h1>
        <button onClick={onLogout} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 13, color: "#6b7280", cursor: "pointer", padding: "6px 10px", borderRadius: 8 }}>
          Sign out
        </button>
      </div>

      <div className="profile-body">

        {/* Avatar + name */}
        <div className="profile-avatar-section">
          <img className="profilePicture" alt="profile" />
          <h2>{user.firstName} {user.lastName}</h2>
          <p className="profile-sub">@{user.username}</p>
        </div>

        {/* Notify me about — hazard category toggles (local UI preference) */}
        <div className="pref-section">
          <h3>Notify me about</h3>
          <p className="pref-desc">Only alerts in selected categories will trigger a notification</p>
          <div className="pref-list">
            {Object.entries(CATS).map(([key, c]) => (
              <div key={key} className="pref-row" onClick={() => onToggleCategory(key)}>
                <span className="pref-label">{c.icon} {c.label}</span>
                <div className={`toggle ${notifCategories.includes(key) ? "on" : ""}`}>
                  <div className="toggle-knob" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accessibility conditions — fetched from backend, saved per user */}
        <div className="pref-section">
          <h3>My Conditions</h3>
          <p className="pref-desc">
            Select conditions that apply to you. The app will highlight hazards most relevant to your needs.
          </p>
          {loadingConditions ? (
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Loading conditions...</p>
          ) : (
            <div className="pref-list">
              {allConditions.map(c => {
                const active = user.conditions.includes(c.slug);
                const saving = togglingSlug === c.slug;
                return (
                  <div key={c.slug} className="pref-row" onClick={() => handleToggleCondition(c.slug)}
                    style={{ opacity: saving ? 0.5 : 1 }}>
                    <span className="pref-label">{c.label}</span>
                    <div className={`toggle ${active ? "on" : ""}`}>
                      <div className="toggle-knob" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App — root component
// Manages auth state via localStorage so the user stays logged in on refresh.
// ---------------------------------------------------------------------------
export default function App() {
  const [screen, setScreen] = useState("map"); // "map" | "profile"
  const [user, setUser] = useState(() => {
    // Rehydrate user from localStorage so login persists across page refreshes
    const stored = localStorage.getItem("hh_user");
    return stored ? JSON.parse(stored) : null;
  });

  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [addMode, setAddMode] = useState(false);
  const [pendingLatLng, setPending] = useState(null);
  const [nextId, setNextId] = useState(5);
  const [activeFilter, setActiveFilter] = useState("all");
  const [userPos, setUserPos] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showNearby, setShowNearby] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchMarker, setSearchMarker] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notifCategories, setNotifCategories] = useState(Object.keys(CATS));
  const notifiedIds = useRef(new Set());
  const flyToRef = useRef(null);
  const searchTimeout = useRef(null);

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) localStorage.setItem("hh_user", JSON.stringify(user));
    else localStorage.removeItem("hh_user");
  }, [user]);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsError("GPS not supported"); return; }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos([latitude, longitude]);
        setGpsError(null);
        alerts.forEach(alert => {
          const dist = getDistance(latitude, longitude, alert.lat, alert.lng);
          // Only notify if this category is enabled in preferences
          if (dist < ALERT_RADIUS_M && !notifiedIds.current.has(alert.id) && notifCategories.includes(alert.cat)) {
            notifiedIds.current.add(alert.id);
            setNotification(`${CATS[alert.cat].icon} Nearby: ${alert.title}`);
            setTimeout(() => setNotification(null), 5000);
          }
        });
      },
      () => setGpsError("Could not get location"),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [alerts, notifCategories]);

  const toggleNotifCategory = (cat) => {
    setNotifCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleSearchInput = (val) => {
    setSearchQuery(val);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  const handleSearchSelect = (result) => {
    const pos = [parseFloat(result.lat), parseFloat(result.lon)];
    setSearchMarker(pos);
    setSearchQuery(result.display_name.split(",").slice(0, 2).join(","));
    setSearchResults([]);
    if (flyToRef.current) flyToRef.current(pos, 14);
  };

  const handleLocateMe = () => {
    if (userPos && flyToRef.current) flyToRef.current(userPos);
    else setGpsError("Location not available yet");
  };

  const handleStillThere = (alertId) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, confirms: (a.confirms || 0) + 1 } : a));
  };

  const handleNotThere = (alertId) => {
    setAlerts(prev => prev
      .map(a => a.id === alertId ? { ...a, dismisses: (a.dismisses || 0) + 1 } : a)
      .filter(a => (a.dismisses || 0) < 3)
    );
  };

  const filtered = activeFilter === "all" ? alerts : alerts.filter(a => a.cat === activeFilter);

  const handleSubmit = ({ title, cat, desc }) => {
    setAlerts(prev => [...prev, { id: nextId, lat: pendingLatLng.lat, lng: pendingLatLng.lng, title, cat, desc, time: Date.now(), confirms: 0, dismisses: 0 }]);
    setNextId(n => n + 1);
    setPending(null);
    setAddMode(false);
  };

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen onLogin={(u) => setUser(u)} />;
  }

  if (screen === "profile") {
    return (
      <ProfileScreen
        user={user}
        onUserUpdate={(updatedUser) => setUser(updatedUser)}
        notifCategories={notifCategories}
        onToggleCategory={toggleNotifCategory}
        onBack={() => setScreen("map")}
        onLogout={() => { setUser(null); setScreen("map"); }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

      {/* Navbar */}
      <div style={{ padding: "10px 16px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", zIndex: 500, position: "relative" }}>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Hazard Hound</span>
        <span style={{ fontSize: 12, color: userPos ? "#059669" : "#6b7280" }}>
          {userPos ? "● GPS active" : gpsError ? gpsError : "Getting location..."}
        </span>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 320 }}>
          <input value={searchQuery} onChange={e => handleSearchInput(e.target.value)} placeholder="Search a location..."
            style={{ width: "100%", fontSize: 13, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 8, outline: "none", boxSizing: "border-box" }} />
          {searchLoading && <div style={{ position: "absolute", right: 10, top: 7, fontSize: 11, color: "#6b7280" }}>...</div>}
          {searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, zIndex: 2000, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: 4 }}>
              {searchResults.map((r, i) => (
                <div key={i} onClick={() => handleSearchSelect(r)}
                  style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", borderBottom: i < searchResults.length - 1 ? "1px solid #f3f4f6" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  {r.display_name.split(",").slice(0, 3).join(", ")}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowNearby(v => !v)} style={{ padding: "6px 12px", fontSize: 13, fontWeight: 500, background: showNearby ? "#185FA5" : "#f9fafb", color: showNearby ? "#fff" : "#374151", border: "1px solid #d1d5db", borderRadius: 8, cursor: "pointer" }}>Nearby</button>
          <button onClick={handleLocateMe} style={{ padding: "6px 12px", fontSize: 13, fontWeight: 500, background: "#f9fafb", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, cursor: "pointer" }}>Find me</button>
          <button onClick={() => { setAddMode(v => !v); setPending(null); }} style={{ padding: "6px 14px", fontSize: 13, fontWeight: 500, background: addMode ? "#FCEBEB" : "#185FA5", color: addMode ? "#A32D2D" : "#fff", border: addMode ? "1px solid #A32D2D" : "none", borderRadius: 8, cursor: "pointer" }}>
            {addMode ? "Cancel" : "+ Add alert"}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: "8px 16px", background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8, zIndex: 500, position: "relative" }}>
        {["all", ...Object.keys(CATS)].map(cat => (
          <button key={cat} onClick={() => setActiveFilter(cat)} style={{
            padding: "4px 12px", fontSize: 13, borderRadius: 20, cursor: "pointer",
            border: "1px solid #d1d5db",
            background: activeFilter === cat ? "#185FA5" : "#f9fafb",
            color: activeFilter === cat ? "#fff" : "#374151",
            fontWeight: activeFilter === cat ? 500 : 400,
          }}>
            {cat === "all" ? "All" : `${CATS[cat].icon} ${CATS[cat].label}`}
          </button>
        ))}
      </div>

      {addMode && !pendingLatLng && (
        <div style={{ background: "#E6F1FB", color: "#185FA5", fontSize: 13, padding: "8px 16px", textAlign: "center" }}>
          Click anywhere on the map to place your alert
        </div>
      )}

      {notification && (
        <div style={{ background: "#FAEEDA", color: "#92400e", fontSize: 13, fontWeight: 500, padding: "8px 16px", textAlign: "center" }}>
          {notification}
        </div>
      )}

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer center={[40.73, -73.99]} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
          <MapClickHandler addMode={addMode} onMapClick={setPending} />
          <MapController flyToRef={flyToRef} />
          {userPos && (
            <>
              <Marker position={userPos} icon={userIcon}><Popup>You are here</Popup></Marker>
              <Circle center={userPos} radius={ALERT_RADIUS_M} pathOptions={{ color: "#185FA5", fillColor: "#185FA5", fillOpacity: 0.08, weight: 1 }} />
            </>
          )}
          {searchMarker && <Marker position={searchMarker} icon={searchIcon}><Popup>{searchQuery}</Popup></Marker>}
          {filtered.map((alert) => (
            <Marker key={alert.id} position={[alert.lat, alert.lng]} icon={makeIcon(alert.cat)}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{CATS[alert.cat].icon} {alert.title}</div>
                  {alert.desc && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{alert.desc}</div>}
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>Confirmed: {alert.confirms || 0} &nbsp;|&nbsp; Dismissed: {alert.dismisses || 0}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleStillThere(alert.id)} style={{ flex: 1, padding: "5px 0", fontSize: 12, fontWeight: 500, background: "#D1FAE5", color: "#065F46", border: "none", borderRadius: 6, cursor: "pointer" }}>Still there</button>
                    <button onClick={() => handleNotThere(alert.id)} style={{ flex: 1, padding: "5px 0", fontSize: 12, fontWeight: 500, background: "#FEE2E2", color: "#991B1B", border: "none", borderRadius: 6, cursor: "pointer" }}>Not there</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {showNearby && (
          <NearbyPanel alerts={alerts} userPos={userPos} activeFilter={activeFilter} onFilterChange={setActiveFilter} onFlyTo={(pos) => flyToRef.current && flyToRef.current(pos, 16)} onClose={() => setShowNearby(false)} />
        )}
        {pendingLatLng && (
          <AddAlertPanel latlng={pendingLatLng} onSubmit={handleSubmit} onClose={() => { setPending(null); setAddMode(false); }} />
        )}
      </div>

      {/* Profile button */}
      <button className="profile-btn" onClick={() => setScreen("profile")} />
    </div>
  );
}
