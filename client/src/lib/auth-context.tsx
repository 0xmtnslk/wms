import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";

export type UserRole = "HQ" | "HOSPITAL_MANAGER" | "COLLECTOR";

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: UserRole[];
  hospitals: {
    id: string;
    code: string;
    name: string;
    colorHex: string;
    isDefault: boolean;
  }[];
  currentHospitalId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setCurrentHospital: (hospitalId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentHospitalId, setCurrentHospitalId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("wms-hospital-id");
    }
    return null;
  });

  const { data: user, isLoading, refetch } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const logout = () => {
    apiRequest("POST", "/api/auth/logout").then(() => {
      queryClient.setQueryData(["/api/auth/me"], null);
      localStorage.removeItem("wms-hospital-id");
      setCurrentHospitalId(null);
    });
  };

  const setCurrentHospital = (hospitalId: string) => {
    setCurrentHospitalId(hospitalId);
    localStorage.setItem("wms-hospital-id", hospitalId);
  };

  useEffect(() => {
    if (user && !currentHospitalId && user.hospitals.length > 0) {
      const defaultHospital = user.hospitals.find((h) => h.isDefault) || user.hospitals[0];
      setCurrentHospital(defaultHospital.id);
    }
  }, [user, currentHospitalId]);

  const enrichedUser = user
    ? {
        ...user,
        currentHospitalId,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: enrichedUser,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        setCurrentHospital,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useCurrentHospital() {
  const { user } = useAuth();
  if (!user || !user.currentHospitalId) return null;
  return user.hospitals.find((h) => h.id === user.currentHospitalId) || null;
}

export function useHasRole(role: UserRole): boolean {
  const { user } = useAuth();
  return user?.roles.includes(role) ?? false;
}

export function useIsHQ(): boolean {
  return useHasRole("HQ");
}

export function useIsManager(): boolean {
  return useHasRole("HOSPITAL_MANAGER");
}

export function useIsCollector(): boolean {
  return useHasRole("COLLECTOR");
}
