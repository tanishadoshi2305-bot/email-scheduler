import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StarburstIcon from "./StarburstIcon";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-12 h-12 rounded-full bg-[#F3DCE6] border-[1.5px] border-[#3A2327] flex items-center justify-center animate-spin">
          <StarburstIcon className="w-6 h-6 text-[#3A2327]" title="Loading" />
        </div>
        <p className="font-display text-lg text-[#3A2327]">
          Verifying your Dispatch session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
