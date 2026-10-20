//src/App.jsx


import { useContext } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import { UserContext } from "./context/user-context";
import Login from "./pages/Login";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";

function ProtectedRoute({ children, role }) {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Home() {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (user?.role === "Teacher") {
    return <Navigate to="/teacher" replace />;
  }

  if (user?.role === "Student") {
    return <Navigate to="/student" replace />;
  }

  return <Login />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/teacher"
          element={
            <ProtectedRoute role="Teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute role="Student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
