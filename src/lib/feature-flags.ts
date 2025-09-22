import { useState, useEffect } from 'react';

export interface FeatureFlags {
  useTnksDataTable: boolean;
  enableAdvancedFiltering: boolean;
  enableBulkActions: boolean;
}

const defaultFlags: FeatureFlags = {
  useTnksDataTable: true,
  enableAdvancedFiltering: false,
  enableBulkActions: false,
};

export function getFeatureFlags(): FeatureFlags {
  if (typeof window === 'undefined') {
    return defaultFlags;
  }

  try {
    const stored = localStorage.getItem('featureFlags');
    if (stored) {
      return { ...defaultFlags, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to parse feature flags from localStorage:', error);
  }

  return defaultFlags;
}

export function setFeatureFlag(key: keyof FeatureFlags, value: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getFeatureFlags();
    const updated = { ...current, [key]: value };
    localStorage.setItem('featureFlags', JSON.stringify(updated));

    // Trigger a custom event to notify components of the change
    window.dispatchEvent(new CustomEvent('featureFlagsChanged', { detail: updated }));
  } catch (error) {
    console.warn('Failed to save feature flags to localStorage:', error);
  }
}

export function useFeatureFlags() {
  if (typeof window === 'undefined') {
    return { flags: defaultFlags, setFlag: () => {} };
  }

  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags());

  useEffect(() => {
    const handleFlagsChange = (event: CustomEvent<FeatureFlags>) => {
      setFlags(event.detail);
    };

    window.addEventListener('featureFlagsChanged', handleFlagsChange as EventListener);
    return () => {
      window.removeEventListener('featureFlagsChanged', handleFlagsChange as EventListener);
    };
  }, []);

  const setFlag = (key: keyof FeatureFlags, value: boolean) => {
    setFeatureFlag(key, value);
  };

  return { flags, setFlag };
}