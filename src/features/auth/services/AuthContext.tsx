import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import axios from "axios";
import { getChatSocket } from "../../feed/chat/components/ChatSocket"; // Ajusta ruta si hace falta

// Frontend User type - alinea con tu backend (campo avatar existe como 'avatar')
export interface User {
  id: number;
  nombre: string;
  apodo: string;
  correo_electronico?: string;
  biografia?: string | null;
  url?: string | null;
  avatar?: string | null;
  portada?: string | null;
}

// Tipado del contexto
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refetchUser: () => Promise<void>;
  getToken: () => string | null;
  // setToken expuesto para que el login lo invoque y el provider recargue perfil
  setToken: (token: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authToken");
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  }, []);

  const loadUserProfile = useCallback(async (): Promise<void> => {
    const token = getToken();
    if (!token) {
      delete axios.defaults.headers.common["Authorization"];
      setUser(null);
      return;
    }

    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const res = await axios.get<{ user: User }>(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/user/perfil`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(res.data.user);
    } catch (err) {
      console.warn("AuthProvider: loadUserProfile failed", err);
      logout();
    }
  }, [getToken, logout]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadUserProfile();
      } finally {
        if (mounted) setTimeout(() => setIsLoading(false), 50);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadUserProfile]);

  const refetchUser = useCallback(async () => {
    await loadUserProfile();
  }, [loadUserProfile]);

  // setToken: guarda token, configura header y carga perfil (retorna Promise para await)
  const setToken = useCallback(
    async (token: string | null) => {
      if (typeof window === "undefined") return;
      if (token) {
        localStorage.setItem("authToken", token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        localStorage.removeItem("authToken");
        delete axios.defaults.headers.common["Authorization"];
      }
      // Fuerza carga del perfil inmediatamente
      try {
        await loadUserProfile();
      } catch {
        // swallow
      }
    },
    [loadUserProfile]
  );

  // socket global — se conecta solo si user existe y token disponible
  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;

    const s = getChatSocket(token);

    const joinUserRoom = () => {
      try {
        if (user && user.id) s.emit("joinUser", { userId: Number(user.id) });
      } catch {}
    };

    s.on("connect", joinUserRoom);
    if (s.connected) joinUserRoom();

    const convHandler = (payload: any) => {
      try {
        window.dispatchEvent(new CustomEvent("chat:conversationUpdated", { detail: payload }));
      } catch {}
    };

    s.on("conversationUpdated", convHandler);

    return () => {
      try {
        s.off("conversationUpdated", convHandler);
        s.off("connect", joinUserRoom);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, getToken]);

  const value: AuthContextType = {
    user,
    isLoading,
    logout,
    setUser,
    refetchUser,
    getToken,
    setToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};