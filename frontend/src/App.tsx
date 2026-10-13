import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import SeekerDashboard from "./pages/SeekerDashboard";
import CandidateRanking from "./pages/CandidateRanking";
import Profile from "./pages/Profile";
import { useAuth } from "./context/AuthContext";
import { ReactElement } from "react";

function ProtectedRoute({ children, role }: { children: ReactElement; role?: "recruiter" | "seeker" }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "recruiter" ? "/recruiter" : "/seeker"} replace />;
  }
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/recruiter"
          element={
            <ProtectedRoute role="recruiter">
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seeker"
          element={
            <ProtectedRoute role="seeker">
              <SeekerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/candidates"
          element={
            <ProtectedRoute role="recruiter">
              <CandidateRanking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={user.role === "recruiter" ? "/recruiter" : "/seeker"} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
