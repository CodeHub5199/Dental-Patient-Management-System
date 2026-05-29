"use client";

import React, { createContext, useContext, useEffect, useReducer } from "react";
import type { User } from "@/types";
import { clearTokens, getAccessToken, getUser, setTokens } from "@/lib/auth";
import { apiClient } from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: "INIT"; user: User | null; isAuthenticated: boolean }
  | { type: "LOGIN"; user: User }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; user: User };

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "INIT":
      return { ...state, user: action.user, isAuthenticated: action.isAuthenticated, isLoading: false };
    case "LOGIN":
      return { ...state, user: action.user, isAuthenticated: true, isLoading: false };
    case "LOGOUT":
      return { user: null, isAuthenticated: false, isLoading: false };
    case "UPDATE_USER":
      return { ...state, user: action.user };
  }
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = getAccessToken();
    const user = getUser();
    dispatch({ type: "INIT", user, isAuthenticated: !!(token && user) });
  }, []);

  const login = (accessToken: string, user: User) => {
    setTokens(accessToken, user);
    dispatch({ type: "LOGIN", user });
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Best effort — still clear client state even if the server call fails
    }
    clearTokens();
    dispatch({ type: "LOGOUT" });
  };

  const updateUser = (user: User) => {
    const token = getAccessToken() ?? "";
    setTokens(token, user);
    dispatch({ type: "UPDATE_USER", user });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
