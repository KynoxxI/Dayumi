import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { platform } from "@/platform";
import { isMovie } from "@/config/appVariant";

export default function ProtectedRoute({ children, requireAccount = false }) {
  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) return null;

  // Sur desktop (Electron), la connexion est obligatoire sur Anime, mais optionnelle sur Movie (mode visiteur autorisé comme sur le web)
  if (platform.isElectron && !session && !isMovie) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Pour les pages nécessitant un compte non anonyme
  if (requireAccount && (!session || session.user?.is_anonymous)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
