import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Agar allowedRoles specify ki hai, to role bhi check karo
  if (allowedRoles && allowedRoles.length > 0) {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user || !allowedRoles.includes(user.role)) {
      // Role allowed nahi - wapas apne default page pe bhej do
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
