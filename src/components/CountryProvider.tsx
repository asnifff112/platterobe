"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  CountryCode,
  DEFAULT_COUNTRY,
  isValidCountryCode,
  COUNTRY_COOKIE_NAME,
} from "@/lib/country";

interface CountryContextType {
  country: CountryCode;
  setCountry: (code: CountryCode) => void;
  hasSelectedCountry: boolean;
  isSelectorOpen: boolean;
  openSelector: () => void;
  closeSelector: () => void;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "platterobe_country";

export function CountryProvider({
  children,
  initialCountry,
}: {
  children: React.ReactNode;
  initialCountry?: CountryCode;
}) {
  const [country, setCountryState] = useState<CountryCode>(initialCountry || DEFAULT_COUNTRY);
  const [hasSelectedCountry, setHasSelectedCountry] = useState<boolean>(true); // start optimistic to avoid flash
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    // 1. Read from localStorage or cookie
    let storedCountry: string | null = null;
    try {
      storedCountry = localStorage.getItem(LOCAL_STORAGE_KEY);
    } catch {
      // ignore security/incognito errors
    }

    if (!storedCountry) {
      // Check document.cookie
      const match = document.cookie.match(new RegExp(`(^|;\\s*)${COUNTRY_COOKIE_NAME}=([^;]+)`));
      if (match && match[2]) {
        storedCountry = decodeURIComponent(match[2]);
      }
    }

    if (isValidCountryCode(storedCountry)) {
      setCountryState(storedCountry);
      setHasSelectedCountry(true);
    } else {
      // First visit: no country saved yet
      setHasSelectedCountry(false);
      setIsSelectorOpen(true);
    }

    setIsHydrated(true);
  }, []);

  const setCountry = (code: CountryCode) => {
    if (!isValidCountryCode(code)) return;

    setCountryState(code);
    setHasSelectedCountry(true);
    setIsSelectorOpen(false);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, code);
    } catch {
      // ignore
    }

    try {
      // Persist 1 year cookie
      document.cookie = `${COUNTRY_COOKIE_NAME}=${code}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }
  };

  const openSelector = () => setIsSelectorOpen(true);
  const closeSelector = () => {
    // Only allow closing if a country is already chosen
    if (hasSelectedCountry) {
      setIsSelectorOpen(false);
    }
  };

  return (
    <CountryContext.Provider
      value={{
        country,
        setCountry,
        hasSelectedCountry,
        isSelectorOpen,
        openSelector,
        closeSelector,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry(): CountryContextType {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error("useCountry must be used within a CountryProvider");
  }
  return context;
}
