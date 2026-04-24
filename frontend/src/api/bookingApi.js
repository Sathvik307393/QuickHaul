import axios from "axios";

const BOOKING_BASE_URL = import.meta.env.VITE_BOOKING_API_URL || "/api/bookings";
const LOCATION_BASE_URL = import.meta.env.VITE_LOCATION_API_URL || "/api/locations";

const bookingApi = axios.create({
  baseURL: BOOKING_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

const locationApi = axios.create({
  baseURL: LOCATION_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

bookingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Export both APIs
export default bookingApi;
export { locationApi };
