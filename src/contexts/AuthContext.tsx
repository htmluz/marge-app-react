import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import api from "@/services/api";

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const checkAuthExecuted = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      // evita o envio duplo de atualização de token
      if (checkAuthExecuted.current) return;
      checkAuthExecuted.current = true;

      const token = sessionStorage.getItem("access_token");

      if (token) {
        try {
          await api.get("/refresh_token");
          setIsAuthenticated(true);
        } catch (error: unknown) {
          console.log(error);
          sessionStorage.removeItem("access_token");
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (username: string, password: string) => {
    const response = await api.post("/signin", { username, password });
    const { access_token } = response.data;

    sessionStorage.setItem("access_token", access_token);
    setIsAuthenticated(true);
  };

  const signOut = () => {
    sessionStorage.removeItem("access_token");
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
