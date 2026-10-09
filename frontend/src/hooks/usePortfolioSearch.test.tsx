import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { usePortfolioSearch } from './usePortfolioSearch';

describe('usePortfolioSearch Hook', () => {
  it('reads initial search query from url params', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?q=django']}>{children}</MemoryRouter>
    );

    const { result } = renderHook(() => usePortfolioSearch(), { wrapper });

    expect(result.current.searchTerm).toBe('django');
    expect(result.current.isSearching).toBe(true);
  });

  it('updates url query params when setSearchTerm is called', () => {
    let currentLocation: ReturnType<typeof useLocation> | undefined;

    const wrapper = ({ children }: { children: ReactNode }) => {
      const LocationConsumer = () => {
        const loc = useLocation();
        useEffect(() => {
          currentLocation = loc;
        }, [loc]);
        return null;
      };
      return (
        <MemoryRouter initialEntries={['/']}>
          <LocationConsumer />
          {children}
        </MemoryRouter>
      );
    };

    const { result } = renderHook(() => usePortfolioSearch(), { wrapper });

    act(() => {
      result.current.setSearchTerm('react');
    });

    expect(result.current.searchTerm).toBe('react');
    expect(result.current.isSearching).toBe(true);
    expect(currentLocation?.search).toBe('?q=react');
  });

  it('removes query param when cleared', () => {
    let currentLocation: ReturnType<typeof useLocation> | undefined;

    const wrapper = ({ children }: { children: ReactNode }) => {
      const LocationConsumer = () => {
        const loc = useLocation();
        useEffect(() => {
          currentLocation = loc;
        }, [loc]);
        return null;
      };
      return (
        <MemoryRouter initialEntries={['/?q=test']}>
          <LocationConsumer />
          {children}
        </MemoryRouter>
      );
    };

    const { result } = renderHook(() => usePortfolioSearch(), { wrapper });

    expect(result.current.searchTerm).toBe('test');

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchTerm).toBe('');
    expect(result.current.isSearching).toBe(false);
    expect(currentLocation?.search).toBe('');
  });
});
