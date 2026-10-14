import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';

export interface ColdStartOptions {
  /** Zeitspanne in Millisekunden bis zur Einblendung des Banners (Default: 2000ms). */
  delayMs?: number;
  /** Zeitspanne in Millisekunden bis zur Anzeige des Timeout-Zustands (Default: 30000ms). */
  timeoutMs?: number;
}

export interface ColdStartTrackerResult {
  /** Ob der Cold-Start-Hinweis angezeigt werden soll. */
  isColdStarting: boolean;
  /** Ob das Timeout erreicht wurde. */
  isTimedOut: boolean;
  /** Ob kürzlich erfolgreich verbunden wurde. */
  isSuccess: boolean;
  /** Anzahl der aktuell aktiven Hintergrund-Queries. */
  isFetchingCount: number;
  /** Führt einen erneuten Versuch aller Abfragen durch. */
  retry: () => void;
  /** Schließt den aktuellen Hinweis manuell. */
  dismiss: () => void;
}

export const useColdStartTracker = ({
  delayMs = 2000,
  timeoutMs = 30000,
}: ColdStartOptions = {}): ColdStartTrackerResult => {
  const isFetchingCount = useIsFetching();
  const queryClient = useQueryClient();

  const [isColdStarting, setIsColdStarting] = useState<boolean>(false);
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasColdStartingRef = useRef<boolean>(false);

  const isQuerying = isFetchingCount > 0;

  useEffect(() => {
    if (isColdStarting) {
      wasColdStartingRef.current = true;
    }
  }, [isColdStarting]);

  useEffect(() => {
    if (isQuerying) {
      if (isDismissed) return;

      const delayTimer = setTimeout(() => {
        setIsColdStarting(true);
      }, delayMs);

      const timeoutTimer = setTimeout(() => {
        setIsTimedOut(true);
      }, timeoutMs);

      return () => {
        clearTimeout(delayTimer);
        clearTimeout(timeoutTimer);
      };
    } else {
      // Wenn der Server aufgewacht ist und der Banner zuvor aktiv war
      if (wasColdStartingRef.current && !isTimedOut && !isDismissed) {
        setIsSuccess(true);
        wasColdStartingRef.current = false;
        const successTimer = setTimeout(() => {
          setIsSuccess(false);
          setIsColdStarting(false);
        }, 1500);
        return () => clearTimeout(successTimer);
      }
    }
  }, [isQuerying, delayMs, timeoutMs, isTimedOut, isDismissed]);

  const retry = useCallback(() => {
    setIsTimedOut(false);
    setIsDismissed(false);
    setIsColdStarting(true);
    wasColdStartingRef.current = true;

    // Timer zurücksetzen
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
    }
    timeoutTimerRef.current = setTimeout(() => {
      setIsTimedOut(true);
    }, timeoutMs);

    // Alle Queries neu anfordern
    queryClient.refetchQueries();
  }, [queryClient, timeoutMs]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    setIsColdStarting(false);
    setIsTimedOut(false);
    setIsSuccess(false);
  }, []);

  return {
    isColdStarting: (isColdStarting || isTimedOut || isSuccess) && !isDismissed,
    isTimedOut,
    isSuccess,
    isFetchingCount,
    retry,
    dismiss,
  };
};
