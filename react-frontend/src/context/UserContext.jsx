
import { useEffect, useState } from "react";
import { UserContext } from "./user-context";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");


export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check whether user is already logged in
  useEffect(() => {
    async function checkLogin() {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            credentials: "include"
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
      } finally {
        setLoading(false);
      }
    }

    checkLogin();
  }, []);

  // Login function
  async function login(email, password) {
    const response = await fetch(
      `${API_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    setUser(data.user);

    return data.user;
  }

  // Logout function
  async function logout() {
    const response = await fetch(
      `${API_URL}/api/auth/logout`,
      {
        method: "POST",
        credentials: "include"
      }
    );

    if (!response.ok) {
      throw new Error("Logout failed");
    }

    setUser(null);
  }

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        login,
        logout
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
