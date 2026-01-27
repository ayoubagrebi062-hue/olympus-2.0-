// Hook for caching
import { useEffect } from 'react';

export const useCache = <T>(key: string, data: T): void => {
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(data));
  }, [key, data]);
};
