import { useState, useEffect } from "react";
import bookingApi, { locationApi } from "../api/bookingApi";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  name: "",
  phone: "",
  email: "",
  // From location
  from_state: "",
  from_district: "",
  from_center: "",
  // To location
  to_state: "",
  to_district: "",
  to_center: "",
  date: "",
  time: "",
  transport_type: "bike",
  goods_type: "",
  weight_category: "medium"
};

const transportOptions = [
  { value: "bike", label: "🏍️ Bike", icon: "🏍️", description: "For small packages up to 20kg" },
  { value: "van", label: "🚐 Van", icon: "🚐", description: "For medium loads up to 500kg" },
  { value: "truck", label: "🚚 Truck", icon: "🚚", description: "For heavy loads up to 2000kg" }
];

const weightOptions = [
  { value: "light", label: "🪶 Light", description: "Documents, small packages (< 5kg)" },
  { value: "medium", label: "⚖️ Medium", description: "Electronics, household items (5-50kg)" },
  { value: "heavy", label: "🏋️ Heavy", description: "Furniture, appliances (> 50kg)" }
];

/* shared inline styles */
const inputStyle = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "12px",
  border: "2px solid rgba(61, 159, 255, 0.3)",
  background: "rgba(255, 255, 255, 0.1)",
  color: "#ffffff",
  fontSize: "1rem",
  fontWeight: "500"
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.75rem center",
  paddingRight: "2.5rem",
  cursor: "pointer"
};

const labelStyle = {
  fontSize: "0.82rem",
  fontWeight: "500",
  color: "rgba(220, 232, 247, 0.75)"
};

const sectionTitle = {
  fontSize: "0.85rem",
  fontWeight: "600",
  color: "rgba(220, 232, 247, 0.8)",
  marginBottom: "1rem",
  letterSpacing: "0.02em"
};

function BookingPage() {
  const { userId } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FROM location data states
  const [fromDistricts, setFromDistricts] = useState([]);
  const [fromCenters, setFromCenters] = useState([]);
  const [selectedFromCenter, setSelectedFromCenter] = useState(null);

  // TO location data states
  const [toDistricts, setToDistricts] = useState([]);
  const [toCenters, setToCenters] = useState([]);
  const [selectedToCenter, setSelectedToCenter] = useState(null);

  // Missing location states
  const [states, setStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);

  // Load states on component mount (shared between from and to)
  useEffect(() => {
    loadStates();
  }, []);

  // FROM: Load districts when state changes
  useEffect(() => {
    if (form.from_state) {
      loadDistricts(form.from_state, setFromDistricts);
    } else {
      setFromDistricts([]);
      setFromCenters([]);
    }
  }, [form.from_state]);

  // FROM: Load centers when district changes
  useEffect(() => {
    if (form.from_district) {
      loadCenters(form.from_district, setFromCenters, form.from_state);
    } else {
      setFromCenters([]);
    }
  }, [form.from_district]);

  // FROM: center details
  useEffect(() => {
    if (form.from_center && fromCenters.length > 0) {
      setSelectedFromCenter(fromCenters.find(c => c.id === form.from_center) || null);
    } else {
      setSelectedFromCenter(null);
    }
  }, [form.from_center, fromCenters]);

  // TO: Load districts when state changes
  useEffect(() => {
    if (form.to_state) {
      loadDistricts(form.to_state, setToDistricts);
    } else {
      setToDistricts([]);
      setToCenters([]);
    }
  }, [form.to_state]);

  // TO: Load centers when district changes
  useEffect(() => {
    if (form.to_district) {
      loadCenters(form.to_district, setToCenters, form.to_state);
    } else {
      setToCenters([]);
    }
  }, [form.to_district]);

  // TO: center details
  useEffect(() => {
    if (form.to_center && toCenters.length > 0) {
      setSelectedToCenter(toCenters.find(c => c.id === form.to_center) || null);
    } else {
      setSelectedToCenter(null);
    }
  }, [form.to_center, toCenters]);

  /* ── API helpers ─────────────────────────── */
  const loadStates = async (retryCount = 0) => {
    setLoadingStates(true);
    setError(""); // Clear previous errors
    try {
      const response = await locationApi.get('/states');
      console.log('States loaded:', response.data);
      setStates(response.data);
    } catch (err) {
      console.error('Failed to load states:', err);
      if (retryCount < 2) {
        console.log(`Retrying loadStates (${retryCount + 1}/2)...`);
        setTimeout(() => loadStates(retryCount + 1), 1000);
      } else {
        setError('Failed to load states. Please refresh the page or check if backend services are running.');
      }
    } finally {
      setLoadingStates(false);
    }
  };

  const loadDistricts = async (stateId, setter) => {
    setLoadingDistricts(true);
    try {
      const response = await locationApi.get(`/districts?state=${stateId}`);
      setter(response.data);
    } catch (err) {
      console.error('Failed to load districts:', err);
      setError('Failed to load districts. Please try again.');
    } finally {
      setLoadingDistricts(false);
    }
  };

  const loadCenters = async (districtId, setter, stateId) => {
    setLoadingCenters(true);
    try {
      const response = await locationApi.get(`/centers?state=${stateId}&district=${districtId}`);
      setter(response.data);
    } catch (err) {
      console.error('Failed to load centers:', err);
      setError('Failed to load centers. Please try again.');
    } finally {
      setLoadingCenters(false);
    }
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      if (!form.name || !form.phone || !form.email || !form.from_state || !form.from_district || !form.from_center || !form.to_state || !form.to_district || !form.to_center || !form.date || !form.time) {
        setError("Please fill all required fields");
        setIsSubmitting(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        setError("Please enter a valid email address");
        setIsSubmitting(false);
        return;
      }

      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(form.phone)) {
        setError("Please enter a valid 10-digit mobile number");
        setIsSubmitting(false);
        return;
      }

      const selectedDate = new Date(`${form.date}T${form.time}`);
      if (selectedDate < new Date()) {
        setError("Booking date and time cannot be in the past");
        setIsSubmitting(false);
        return;
      }

      // Check if user is logged in
      if (!userId) {
        setError("Please log in to create a booking");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        ...form,
        user_id: userId,
        // keep backward compat with backend
        state: form.from_state,
        district: form.from_district,
        center: form.from_center,
        from_center_details: selectedFromCenter,
        to_center_details: selectedToCenter
      };

      const response = await bookingApi.post("/bookings", payload);
      setMessage(
        `Booking ${response.data.booking_id} created successfully! Total: ₹${response.data.total_amount}`
      );
      setForm(initialForm);
      setSelectedFromCenter(null);
      setSelectedToCenter(null);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Unable to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Reusable location picker ───────────── */
  const renderLocationPicker = (prefix, states, districts, centers, selectedCenter, loadingS, loadingD, loadingC) => (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        {/* State */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
          <label style={labelStyle}>State *</label>
          <select name={`${prefix}_state`} value={form[`${prefix}_state`]} onChange={onChange} required disabled={loadingS} style={selectStyle}>
            <option value="">Select State</option>
            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {/* District */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
          <label style={labelStyle}>District *</label>
          <select name={`${prefix}_district`} value={form[`${prefix}_district`]} onChange={onChange} required disabled={loadingD || !form[`${prefix}_state`]} style={selectStyle}>
            <option value="">Select District</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        {/* Center */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
          <label style={labelStyle}>Center *</label>
          <select name={`${prefix}_center`} value={form[`${prefix}_center`]} onChange={onChange} required disabled={loadingC || !form[`${prefix}_district`]} style={selectStyle}>
            <option value="">Select Center</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {selectedCenter && (
        <div style={{
          marginTop: "0.75rem",
          padding: "0.85rem",
          background: "rgba(61, 159, 255, 0.1)",
          borderRadius: "12px",
          border: "1px solid rgba(61, 159, 255, 0.3)"
        }}>
          <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#3d9fff", marginBottom: "0.35rem" }}>📍 {selectedCenter.name}</div>
          <div style={{ fontSize: "0.82rem", color: "rgba(220, 232, 247, 0.8)", marginBottom: "0.2rem" }}>📧 {selectedCenter.address}</div>
          <div style={{ fontSize: "0.82rem", color: "rgba(220, 232, 247, 0.8)" }}>📞 {selectedCenter.phone}</div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Global style to fix dropdown option text visibility */}
      <style>{`
        select option {
          background: #0f1a2e;
          color: #ffffff;
          padding: 0.5rem;
        }
        select option:checked {
          background: #1e3a5f;
          color: #ffffff;
        }
        select option:hover {
          background: #1a2f4a;
        }
        select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #060d1a 0%, #0a1224 50%, #050c1a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: `
            radial-gradient(ellipse 700px 400px at 70% 0%, rgba(61, 159, 255, 0.14) 0%, transparent 60%),
            radial-gradient(ellipse 400px 300px at 20% 50%, rgba(94, 240, 255, 0.05) 0%, transparent 55%),
            linear-gradient(180deg, #071022 0%, #050c1a 50%, #030810 100%)
          `,
          pointerEvents: "none"
        }} />

        <div className="auth-card" style={{
          maxWidth: "850px",
          width: "100%",
          position: "relative",
          zIndex: 10,
          background: "linear-gradient(160deg, rgba(10, 18, 36, 0.95) 0%, rgba(6, 13, 26, 0.98) 100%)",
          border: "2px solid rgba(61, 159, 255, 0.3)",
          borderRadius: "22px",
          padding: "2.5rem",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(61, 159, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          opacity: "1",
          transform: "perspective(1500px) translate3d(0, 0, 0)"
        }}>
          {/* Header */}
          <div className="auth-header" style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "3rem", marginBottom: "1rem",
              background: "linear-gradient(135deg, #3d9fff 0%, #5ef0ff 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
            }}>🚛</div>
            <h2 style={{
              marginBottom: "0.5rem", fontSize: "1.8rem", fontWeight: "700",
              background: "linear-gradient(135deg, #ffffff 0%, #dce8f7 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
            }}>QuickHaul Transport</h2>
            <p style={{ marginBottom: "2rem", color: "rgba(220, 232, 247, 0.7)", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Professional freight booking with real-time pricing<br/>and trusted driver assignment
            </p>
          </div>

          {/* ── Service Area Notice ─────── */}
          <div style={{
            marginBottom: "1.5rem",
            padding: "1rem 1.25rem",
            background: "rgba(61, 159, 255, 0.1)",
            border: "1px solid rgba(61, 159, 255, 0.3)",
            borderRadius: "12px",
            borderLeft: "4px solid #3d9fff"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.2rem" }}>ℹ️</span>
              <div>
                <div style={{ fontWeight: "600", color: "#3d9fff", marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                  Limited Service Area
                </div>
                <div style={{ color: "rgba(220, 232, 247, 0.8)", fontSize: "0.85rem", lineHeight: "1.4" }}>
                  We currently operate in select cities. Service available in:
                  <span style={{ color: "#5ef0ff", fontWeight: "500" }}> Karnataka, Maharashtra, Delhi, Andhra Pradesh, Tamil Nadu</span>.
                  More locations coming soon!
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="form">
            {/* ── Personal Information ─────── */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={sectionTitle}>👤 PERSONAL INFORMATION</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
                  <label style={labelStyle}>Full Name *</label>
                  <input name="name" placeholder="Enter your full name" value={form.name} onChange={onChange} required style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
                  <label style={labelStyle}>Phone Number *</label>
                  <input name="phone" type="tel" placeholder="10-digit mobile" value={form.phone} onChange={onChange} required maxLength={10} style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
                  <label style={labelStyle}>Email Address *</label>
                  <input name="email" type="email" placeholder="your@email.com" value={form.email} onChange={onChange} required style={inputStyle} />
                </div>
              </div>
            </div>

            {/* ── FROM (Pickup) Location ─────── */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={sectionTitle}>📦 PICKUP LOCATION (FROM)</div>
              {renderLocationPicker("from", states, fromDistricts, fromCenters, selectedFromCenter, loadingStates, loadingDistricts, loadingCenters)}
            </div>

            {/* ── Route Arrow ─────── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", margin: "-0.5rem 0",
              color: "rgba(61, 159, 255, 0.7)", fontSize: "1.5rem"
            }}>
              ⬇️ &nbsp; Route &nbsp; ⬇️
            </div>

            {/* ── TO (Delivery) Location ─────── */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={sectionTitle}>📍 DELIVERY LOCATION (TO)</div>
              {renderLocationPicker("to", states, toDistricts, toCenters, selectedToCenter, loadingStates, loadingDistricts, loadingCenters)}
            </div>

            {/* ── Booking Details ─────── */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={sectionTitle}>📅 BOOKING DETAILS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
                  <label style={labelStyle}>Date *</label>
                  <input name="date" type="date" value={form.date} onChange={onChange} required min={new Date().toISOString().split('T')[0]} style={inputStyle} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
                  <label style={labelStyle}>Time *</label>
                  <input name="time" type="time" value={form.time} onChange={onChange} required style={inputStyle} />
                </div>
              </div>
            </div>

            {/* ── Transport Type ─────── */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={sectionTitle}>🚚 TRANSPORT TYPE</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                {transportOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => setForm(prev => ({ ...prev, transport_type: option.value }))}
                    style={{
                      padding: "1rem", borderRadius: "12px", cursor: "pointer", textAlign: "center",
                      transition: "all 200ms ease",
                      border: form.transport_type === option.value ? "2px solid #3d9fff" : "2px solid rgba(255, 255, 255, 0.12)",
                      background: form.transport_type === option.value ? "rgba(61, 159, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      transform: form.transport_type === option.value ? "scale(1.02)" : "scale(1)"
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{option.icon}</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#ffffff", marginBottom: "0.25rem" }}>{option.label.split(' ')[1]}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(220, 232, 247, 0.6)", lineHeight: "1.3" }}>{option.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Cargo Type ─────── */}
            <div style={{ marginBottom: "2rem" }}>
              <label style={{ ...labelStyle, display: "block", marginBottom: "0.38rem" }}>📦 Cargo Type *</label>
              <input name="goods_type" placeholder="e.g., Electronics, Furniture, Documents" value={form.goods_type} onChange={onChange} required style={inputStyle} />
            </div>

            {/* ── Weight Category ─────── */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={sectionTitle}>⚖️ WEIGHT CATEGORY (Affects Pricing)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                {weightOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => setForm(prev => ({ ...prev, weight_category: option.value }))}
                    style={{
                      padding: "1rem", borderRadius: "12px", cursor: "pointer", textAlign: "center",
                      transition: "all 200ms ease",
                      border: form.weight_category === option.value ? "2px solid #ff9800" : "2px solid rgba(255, 255, 255, 0.12)",
                      background: form.weight_category === option.value ? "rgba(255, 152, 0, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      transform: form.weight_category === option.value ? "scale(1.02)" : "scale(1)"
                    }}
                  >
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{option.label.split(' ')[0]}</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#ffffff", marginBottom: "0.25rem" }}>{option.label.split(' ')[1]}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(220, 232, 247, 0.6)", lineHeight: "1.3" }}>{option.description}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "rgba(255, 152, 0, 0.1)", borderRadius: "8px", borderLeft: "3px solid #ff9800" }}>
                <div style={{ fontSize: "0.8rem", color: "rgba(220, 232, 247, 0.8)" }}>
                  💡 <strong>Pricing per km:</strong> Bike ₹2-8 | Van ₹10-25 | Truck ₹15-40 (varies by weight)
                </div>
              </div>
            </div>

            {/* ── Messages ─────── */}
            {error && <div style={{
              borderRadius: "12px", padding: "0.75rem 0.9rem",
              border: "1px solid rgba(255, 95, 107, 0.35)", background: "rgba(255, 95, 107, 0.1)",
              color: "#ff8a92", fontSize: "0.9rem", marginBottom: "1rem"
            }}>{error}</div>}
            {message && <div style={{
              borderRadius: "12px", padding: "0.75rem 0.9rem",
              border: "1px solid rgba(31, 255, 168, 0.25)", background: "rgba(31, 255, 168, 0.08)",
              color: "#1fffa8", fontSize: "0.9rem", marginBottom: "1rem"
            }}>{message}</div>}

            {/* ── Submit ─────── */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%", padding: "1rem 1.5rem", fontSize: "1.1rem", fontWeight: "700",
                background: isSubmitting
                  ? "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)"
                  : "linear-gradient(135deg, #3d9fff 0%, #5ef0ff 100%)",
                color: "#04101f", border: "none", borderRadius: "14px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontFamily: "'Syne', sans-serif", letterSpacing: "0.02em",
                transition: "all 200ms ease",
                boxShadow: isSubmitting ? "none" : "0 8px 24px rgba(61, 159, 255, 0.3), 0 0 0 1px rgba(61, 159, 255, 0.2)"
              }}
              onMouseEnter={(e) => { if (!isSubmitting) { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 12px 32px rgba(61, 159, 255, 0.4)"; }}}
              onMouseLeave={(e) => { if (!isSubmitting) { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 8px 24px rgba(61, 159, 255, 0.3)"; }}}
            >
              {isSubmitting ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <span style={{ animation: "spin 1s linear infinite" }}>🔄</span> Creating Booking...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>🚚 Create Booking</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default BookingPage;
