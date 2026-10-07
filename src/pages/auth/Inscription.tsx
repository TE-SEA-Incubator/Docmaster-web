import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ImmersiveRegister from "../../components/auth/ImmersiveRegister";
import { postAuthRedirect } from "../../utils/postAuthRedirect";

export default function Inscription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const authRedirect = postAuthRedirect(location, searchParams);

  useEffect(() => {
    if (user) {
      navigate(authRedirect, { replace: true });
    }
  }, [user, navigate, authRedirect]);

  if (user) return null;

  return <ImmersiveRegister />;
}
