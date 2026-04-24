import { useEffect, useState } from "react";
import bookingApi from "../api/bookingApi";
import { useAuth } from "../context/AuthContext";

function HistoryPage() {
  const { userId } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await bookingApi.get("/bookings");
        setBookings(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.detail || "Unable to fetch booking history");
      }
    };

    fetchHistory();
  }, [userId]);

  return (
    <div className="container">
      <h1 style={{ letterSpacing: "-0.03em" }}>Booking History</h1>
      <p className="muted" style={{ marginTop: "-0.3rem" }}>
        Your latest bookings appear here. Status moves from CREATED → ASSIGNED → IN_TRANSIT → COMPLETED.
      </p>
      {error && <div className="alert error">{error}</div>}
      <div className="list">
        {bookings.map((booking) => (
          <div key={booking.id} className="card history-card">
            <div className="history-route">
              <div className="route-point">
                <div className="route-pin from-pin">📍</div>
                <div className="route-name">{booking.from_location}</div>
              </div>
              <div className="route-path">
                <div className="route-line"></div>
                <div className="route-truck">🚚</div>
              </div>
              <div className="route-point">
                <div className="route-pin to-pin">📍</div>
                <div className="route-name">{booking.to_location}</div>
              </div>
            </div>
            <div className="history-details">
              <p><span>Transport:</span> {booking.transport_type}</p>
              <p><span>Goods:</span> {booking.goods_type}</p>
              <p>
                <span>Status:</span> 
                <span className={`status-badge status-${(booking.status || '').toLowerCase()}`}>
                  {booking.status}
                </span>
              </p>
              <p><span>Price:</span> {booking.price}</p>
              <p><span>Driver:</span> {booking.driver_id || "pending assignment"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistoryPage;
