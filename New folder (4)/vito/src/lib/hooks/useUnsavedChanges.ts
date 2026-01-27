/**
 * OLYMPUS 2.0 - Unsaved Changes Hook
 * Warns users before leaving page with unsaved changes
 */

'use client';

import { useEffect, useCallback } from 'react';

/**
 * Hook to warn users about unsaved changes before leaving the page.
 * @param hasUnsavedChanges - Whether there are unsaved changes
 * @param message - Custom warning message (optional)
 */
export function useUnsavedChanges(
  hasUnsavedChanges: boolean,
  message: string = 'You have unsaved changes. Are you sure you want to leave?'
) {
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we set it for older ones
        e.returnValue = message;
        return message;
      }
    },
    [hasUnsavedChanges, message]
  );

  useEffect(() => {
    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [hasUnsavedChanges, handleBeforeUnload]);
}

export default useUnsavedChanges;
