"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext({
  session: null,
  profile: null,
  loading: true,
  recoveryMode: false,
  setRecoveryMode: () => {},
  refreshProfile: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      if (!s) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) refreshProfile();
  }, [session]);

  async function refreshProfile() {
    if (!session) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    setProfile(data || null);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  // Only an approved account may file a stand, stand with one, or speak out —
  // an unchecked crowd would make the support counts meaningless. "Approved"
  // is deliberately the word used everywhere: a person was reviewed or vouched
  // for, which is not the same as being verified against a document, and the
  // app should never claim more than it can show.
  const approved = profile?.verification_status === "verified";

  return (
    <AuthContext.Provider
      value={{ session, profile, approved, loading, recoveryMode, setRecoveryMode, refreshProfile, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
