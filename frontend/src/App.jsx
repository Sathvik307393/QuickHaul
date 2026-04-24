import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import { useAuth } from "./context/AuthContext";
import BookingPage from "./pages/BookingPage";
import HistoryPage from "./pages/HistoryPage";
import LoginRegisterPage from "./pages/LoginRegisterPage";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginRegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <>
              <NavBar />
              <Routes>
                <Route path="/" element={<BookingPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
