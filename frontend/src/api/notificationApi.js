import axios from "axios";

const NOTIFICATION_BASE_URL = import.meta.env.VITE_NOTIFICATION_API_URL || "/api/notifications";

const notificationApi = axios.create({
  baseURL: NOTIFICATION_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

export default notificationApi;
