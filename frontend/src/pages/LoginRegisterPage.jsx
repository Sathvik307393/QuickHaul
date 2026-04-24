import { useState, useEffect } from "react";
import authApi from "../api/authApi";
import otpApi from "../api/otpApi";
import { useAuth } from "../context/AuthContext";
import AnimatedHero from "../components/AnimatedHero";

function LoginRegisterPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isDelivered, setIsDelivered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Sync with truck reaching the dropping point
    const timer = setTimeout(() => setIsDelivered(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const validatePasswordLength = (pwd) => {
    // Check byte length (not character length) to match backend validation
    const byteLength = new Blob([pwd]).size;
    return byteLength <= 71;
  };

  const getStrengthClass = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[@$!%*?&]/.test(pwd)) score++;
    
    if (score <= 1) return "weak";
    if (score <= 3) return "medium";
    return "strong";
  };

  const getStrengthLabel = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[@$!%*?&]/.test(pwd)) score++;
    
    if (score <= 1) return "Too Weak";
    if (score === 2) return "Fair";
    if (score === 3) return "Good";
    return "Ultra Secure";
  };

  const handleSendOtp = async () => {
    if (isSendingOtp) return;
    
    try {
      setIsSendingOtp(true);
      setError("");
      setSuccessMessage("");
      
      // Use Auth Service's OTP endpoint instead of OTP Service
      const response = await authApi.post("/send-otp", { email: form.email });
      
      if (response.data.email_sent) {
        setSuccessMessage(`OTP sent to ${form.email}. Check your inbox!`);
      } else {
        setSuccessMessage(`⚠️ Email service unavailable. Use this OTP: ${response.data.otp}`);
      }
      
      setOtpSent(true);
      
      setTimeout(() => setSuccessMessage(""), 8000);
    } catch (requestError) {
      console.error("OTP Error:", requestError);
      setError(requestError.response?.data?.detail || "Failed to send OTP - check backend is running");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    
    // Validate password byte length
    if (!validatePasswordLength(form.password)) {
      setError("Password is too long (max 71 bytes). Please use a shorter password.");
      setIsSubmitting(false);
      return;
    }
    
    try {
      if (mode === "login") {
        const response = await authApi.post("/login", { email: form.email, password: form.password });
        login(response.data);
      } else {
        // Validate registration form
        if (!form.name || form.name.length < 2) {
          setError("Name must be at least 2 characters");
          setIsSubmitting(false);
          return;
        }
        if (!form.phone || form.phone.length < 10) {
          setError("Phone number must be at least 10 characters");
          setIsSubmitting(false);
          return;
        }
        if (!otpSent || otp.length !== 6) {
          setError("Please enter the 6-digit OTP sent to your email");
          setIsSubmitting(false);
          return;
        }
        
        const registrationData = { 
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
          otp: otp.trim()
        };
        
        console.log("Sending registration data:", registrationData);
        const response = await authApi.post("/register", registrationData);
        // Registration successful - redirect to login
        setForm({ name: "", email: "", phone: "", password: "" });
        setOtp("");
        setOtpSent(false);
        setMode("login");
        setSuccessMessage("Registration successful! Please log in with your credentials.");
      }
    } catch (requestError) {
      const errorMsg = requestError.response?.data?.detail || requestError.message || "Authentication failed";
      console.error("Registration error details:", requestError.response?.data);
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-hero">
        <AnimatedHero />
      </div>

      <div className="auth-panel auth-panel-right">
        <div className={`container-delivery ${isDelivered ? 'delivered' : ''}`}>
          <div className="container-door door-left">
            <div className="corrugation-line"></div>
            <div className="corrugation-line"></div>
            <div className="corrugation-line"></div>
            <div className="door-handle"></div>
          </div>
          <div className="container-door door-right">
            <div className="corrugation-line"></div>
            <div className="corrugation-line"></div>
            <div className="corrugation-line"></div>
            <div className="door-handle"></div>
          </div>

          <div className="auth-card">
            <div className="auth-header">
              <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
              <p className="muted">
                {mode === "login"
                  ? "Login to manage your bookings."
                  : "Register to start booking transport instantly."}
              </p>
            </div>

          <form onSubmit={handleSubmit} className="form">
            {mode === "register" && (
              <>
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    name="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={onChange}
                    required
                  />
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={onChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "8+ chars (A-z, 0-9, !@#)" : "Your password"}
                  value={form.password}
                  onChange={onChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              
              {mode === "register" && form.password && (
                <div className="password-strength-meter">
                  <div className={`strength-bar ${getStrengthClass(form.password)}`}></div>
                  <p className="strength-text">
                    Strength: <strong>{getStrengthLabel(form.password)}</strong>
                  </p>
                </div>
              )}
            </div>

            {mode === "register" && (
              <>
                {!otpSent && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSendOtp}
                    disabled={!form.email || isSendingOtp}
                  >
                    {isSendingOtp ? "Sending..." : "Send OTP to Email"}
                  </button>
                )}

                {otpSent && (
                  <div className="field">
                    <label htmlFor="otp">Enter OTP</label>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      required
                    />
                  </div>
                )}
              </>
            )}

            {error && <div className="alert error">{error}</div>}
            {successMessage && <div className="alert success">{successMessage}</div>}

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : (mode === "login" ? "Login" : "Create Account")}
            </button>
          </form>

          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setSuccessMessage("");
            }}
          >
            {mode === "login" ? (
              <>
                <span className="btn-link-label">New to QuickHaul?</span>
                <span className="btn-link-action">Register here</span>
                <span className="btn-link-icon">→</span>
              </>
            ) : (
              <>
                <span className="btn-link-label">Already have an account?</span>
                <span className="btn-link-action">Login</span>
                <span className="btn-link-icon">→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

export default LoginRegisterPage;