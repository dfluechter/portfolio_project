import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface PortfolioSearchState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
  isSearching: boolean;
}

export const usePortfolioSearch = (): PortfolioSearchState => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';

  const setSearchTerm = useCallback(
    (term: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const trimmed = term.trim();
          if (trimmed) {
            next.set('q', term);
          } else {
            next.delete('q');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const clearSearch = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('q');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  return {
    searchTerm,
    setSearchTerm,
    clearSearch,
    isSearching: Boolean(searchTerm.trim()),
  };
};
