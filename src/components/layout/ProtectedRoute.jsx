import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { platform } from "@/platform";

export default function ProtectedRoute({ children, requireAccount = false }) {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) return null;

  // Sur desktop (Electron), la connexion est obligatoire : si aucune session, redirection vers /login
  if (platform.isElectron && !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Pour les pages nécessitant un compte non anonyme
  if (requireAccount && (!session || session.user?.is_anonymous)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
