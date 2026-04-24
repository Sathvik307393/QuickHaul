import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const st = localStorage.getItem("token");
    return st === "undefined" ? null : st;
  });
  const [userId, setUserId] = useState(() => {
    const st = localStorage.getItem("userId");
    return st === "undefined" ? null : st;
  });

  const login = (authPayload) => {
    const token = authPayload.access_token || authPayload.token;
    const userId = authPayload.user_id || (authPayload.user && authPayload.user.id);
    
    if (token) {
      localStorage.setItem("token", token);
      setToken(token);
    }
    if (userId) {
      localStorage.setItem("userId", userId);
      setUserId(userId);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setToken(null);
    setUserId(null);
  };

  const value = useMemo(
    () => ({
      token,
      userId,
      isAuthenticated: Boolean(token),
      login,
      logout
    }),
    [token, userId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
