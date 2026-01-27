// Hook for optimistic updates
import { useState } from 'react';

export const useOptimisticUpdate = <T>(initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue);

  const optimisticUpdate = (newValue: T) => {
    const previousValue = value;
    setValue(newValue);
    return () => setValue(previousValue);
  };

  return { value, optimisticUpdate };
};
