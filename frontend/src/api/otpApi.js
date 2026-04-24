import axios from "axios";

const OTP_BASE_URL = import.meta.env.VITE_OTP_API_URL || "/api/otp";

const otpApi = axios.create({
  baseURL: OTP_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

export default otpApi;
