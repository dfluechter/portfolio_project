export const PORTFOLIO_OWNER_NAME: string =
  (import.meta.env.PORTFOLIO_OWNER_NAME as string | undefined) ||
  (import.meta.env.VITE_PORTFOLIO_OWNER_NAME as string | undefined) ||
  'Dominik Flüchter';

export const PORTFOLIO_OWNER_EMAIL: string =
  (import.meta.env.PORTFOLIO_OWNER_EMAIL as string | undefined) ||
  (import.meta.env.VITE_PORTFOLIO_OWNER_EMAIL as string | undefined) ||
  'dominik.fluechter@googlemail.com';
