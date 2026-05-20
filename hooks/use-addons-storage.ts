"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "akira-go-addons"

export interface StoredAddon {
  id: string
  name: string
  url: string
  type: "scraper" | "tracker" | "subtitle"
  enabled: boolean
  addedAt: number
}

export function useAddonsStorage() {
  const [storedAddons, setStoredAddons] = useState<StoredAddon[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load addons from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setStoredAddons(Array.isArray(parsed) ? parsed : [])
      }
    } catch (error) {
      console.error("[v0] Failed to load addons from storage:", error)
    }
    setIsLoaded(true)
  }, [])

  // Save addons to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedAddons))
      } catch (error) {
        console.error("[v0] Failed to save addons to storage:", error)
      }
    }
  }, [storedAddons, isLoaded])

  const addAddon = useCallback((addon: Omit<StoredAddon, "id" | "addedAt">) => {
    const newAddon: StoredAddon = {
      ...addon,
      id: `addon-${Date.now()}`,
      addedAt: Date.now(),
    }
    setStoredAddons(prev => [...prev, newAddon])
    return newAddon
  }, [])

  const removeAddon = useCallback((addonId: string) => {
    setStoredAddons(prev => prev.filter(a => a.id !== addonId))
  }, [])

  const toggleAddon = useCallback((addonId: string, enabled: boolean) => {
    setStoredAddons(prev => 
      prev.map(a => a.id === addonId ? { ...a, enabled } : a)
    )
  }, [])

  const updateAddon = useCallback((addonId: string, updates: Partial<StoredAddon>) => {
    setStoredAddons(prev => 
      prev.map(a => a.id === addonId ? { ...a, ...updates } : a)
    )
  }, [])

  const clearAllAddons = useCallback(() => {
    setStoredAddons([])
  }, [])

  return {
    storedAddons,
    isLoaded,
    addAddon,
    removeAddon,
    toggleAddon,
    updateAddon,
    clearAllAddons,
  }
}

// Hook to sync streaming context with localStorage addons
export function useAddonSync() {
  const storage = useAddonsStorage()
  
  return storage
}
