import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useConfirmPasswordReset,
  useRequestPasswordReset,
} from '../../hooks/usePortfolio';
import { LoginPage } from '../LoginPage';
import { PasswordResetConfirmPage } from '../PasswordResetConfirmPage';

vi.mock('../../hooks/usePortfolio', () => ({
  useConfirmPasswordReset: vi.fn(),
  useRequestPasswordReset: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    isAuthenticated: false,
  }),
}));

const createAxiosError = (
  status?: number,
  data?: unknown,
  message = 'Request failed'
): AxiosError => {
  const error = new AxiosError(message);
  if (status !== undefined) {
    error.response = {
      status,
      statusText: status === 400 ? 'Bad Request' : 'Internal Server Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data,
    } as AxiosError['response'];
  }
  return error;
};

describe('PasswordReset Flow (LoginPage Modal & PasswordResetConfirmPage)', () => {
  const mockConfirmMutateAsync = vi.fn();
  const mockRequestMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useConfirmPasswordReset).mockReturnValue({
      mutateAsync: mockConfirmMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useConfirmPasswordReset>);

    vi.mocked(useRequestPasswordReset).mockReturnValue({
      mutateAsync: mockRequestMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRequestPasswordReset>);
  });

  describe('LoginPage Modal - Request Password Reset', () => {
    it('opens password reset modal on LoginPage and triggers single-user reset email', async () => {
      mockRequestMutateAsync.mockResolvedValueOnce({
        detail: 'Wiederherstellungs-E-Mail versendet.',
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      const openModalBtn = screen.getByRole('button', { name: /Passwort zurücksetzen\?/i });
      fireEvent.click(openModalBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/PORTFOLIO_OWNER_EMAIL/i)).toBeInTheDocument();

      const sendBtn = screen.getByRole('button', { name: /E-Mail an Inhaber senden/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(mockRequestMutateAsync).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Wiederherstellungs-E-Mail versendet.')).toBeInTheDocument();
      });
    });

    it('displays error message from err.response.data.detail when reset request fails', async () => {
      const apiErrorMessage = 'Zu viele Passwort-Reset-Anfragen. Bitte warten Sie 10 Minuten.';
      mockRequestMutateAsync.mockRejectedValueOnce(
        createAxiosError(429, { detail: apiErrorMessage })
      );

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /Passwort zurücksetzen\?/i }));
      fireEvent.click(screen.getByRole('button', { name: /E-Mail an Inhaber senden/i }));

      expect(await screen.findByText(apiErrorMessage)).toBeInTheDocument();
    });

    it('displays fallback error message when axios error has no detail', async () => {
      mockRequestMutateAsync.mockRejectedValueOnce(createAxiosError(500, {}));

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /Passwort zurücksetzen\?/i }));
      fireEvent.click(screen.getByRole('button', { name: /E-Mail an Inhaber senden/i }));

      expect(
        await screen.findByText('Fehler beim Anfordern des Passwort-Resets.')
      ).toBeInTheDocument();
    });

    it('displays error message from generic Error instance', async () => {
      mockRequestMutateAsync.mockRejectedValueOnce(new Error('Netzwerkverbindung unterbrochen'));

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /Passwort zurücksetzen\?/i }));
      fireEvent.click(screen.getByRole('button', { name: /E-Mail an Inhaber senden/i }));

      expect(await screen.findByText('Netzwerkverbindung unterbrochen')).toBeInTheDocument();
    });
  });

  describe('PasswordResetConfirmPage - Form Validation & Error Handling', () => {
    it('submits valid new password with uid and token on PasswordResetConfirmPage', async () => {
      mockConfirmMutateAsync.mockResolvedValueOnce(undefined);

      render(
        <MemoryRouter initialEntries={['/password-reset/confirm/MQ/valid-token-999']}>
          <Routes>
            <Route
              path="/password-reset/confirm/:uid/:token"
              element={<PasswordResetConfirmPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      const newPwdInput = screen.getByLabelText(/Neues Passwort \(min\. 8 Zeichen\)/i);
      const confirmPwdInput = screen.getByLabelText(/Neues Passwort bestätigen/i);
      const submitBtn = screen.getByRole('button', { name: /Neues Passwort speichern/i });

      fireEvent.change(newPwdInput, { target: { value: 'NewStrongPassword2026!' } });
      fireEvent.change(confirmPwdInput, { target: { value: 'NewStrongPassword2026!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockConfirmMutateAsync).toHaveBeenCalledWith({
          uid: 'MQ',
          token: 'valid-token-999',
          new_password: 'NewStrongPassword2026!',
          re_new_password: 'NewStrongPassword2026!',
        });
      });

      expect(await screen.findByText('Passwort erfolgreich geändert!')).toBeInTheDocument();
    });

    it('validates minimum password length of 8 characters', async () => {
      render(
        <MemoryRouter initialEntries={['/password-reset/confirm/MQ/test-token-123']}>
          <Routes>
            <Route
              path="/password-reset/confirm/:uid/:token"
              element={<PasswordResetConfirmPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      const newPwdInput = screen.getByLabelText(/Neues Passwort \(min\. 8 Zeichen\)/i);
      const confirmPwdInput = screen.getByLabelText(/Neues Passwort bestätigen/i);
      const submitBtn = screen.getByRole('button', { name: /Neues Passwort speichern/i });

      fireEvent.change(newPwdInput, { target: { value: 'short7' } });
      fireEvent.change(confirmPwdInput, { target: { value: 'short7' } });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText('Das Passwort muss mindestens 8 Zeichen lang sein.')
      ).toBeInTheDocument();
      expect(mockConfirmMutateAsync).not.toHaveBeenCalled();
    });

    it('validates password mismatch on PasswordResetConfirmPage', async () => {
      render(
        <MemoryRouter initialEntries={['/password-reset/confirm/MQ/test-token-123']}>
          <Routes>
            <Route
              path="/password-reset/confirm/:uid/:token"
              element={<PasswordResetConfirmPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      const newPwdInput = screen.getByLabelText(/Neues Passwort \(min\. 8 Zeichen\)/i);
      const confirmPwdInput = screen.getByLabelText(/Neues Passwort bestätigen/i);
      const submitBtn = screen.getByRole('button', { name: /Neues Passwort speichern/i });

      fireEvent.change(newPwdInput, { target: { value: 'SecurePass123!' } });
      fireEvent.change(confirmPwdInput, { target: { value: 'DifferentPass123!' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('Die Passwörter stimmen nicht überein.')).toBeInTheDocument();
      expect(mockConfirmMutateAsync).not.toHaveBeenCalled();
    });

    it('validates missing uid or token in url parameters', async () => {
      render(
        <MemoryRouter initialEntries={['/password-reset/confirm']}>
          <Routes>
            <Route path="/password-reset/confirm" element={<PasswordResetConfirmPage />} />
          </Routes>
        </MemoryRouter>
      );

      const newPwdInput = screen.getByLabelText(/Neues Passwort \(min\. 8 Zeichen\)/i);
      const confirmPwdInput = screen.getByLabelText(/Neues Passwort bestätigen/i);
      const submitBtn = screen.getByRole('button', { name: /Neues Passwort speichern/i });

      fireEvent.change(newPwdInput, { target: { value: 'ValidPassword123!' } });
      fireEvent.change(confirmPwdInput, { target: { value: 'ValidPassword123!' } });
      fireEvent.click(submitBtn);

      expect(
        await screen.findByText('Ungültiger oder unvollständiger Wiederherstellungs-Link.')
      ).toBeInTheDocument();
      expect(mockConfirmMutateAsync).not.toHaveBeenCalled();
    });

    it('displays error from err.response.data.token on expired or invalid token', async () => {
      const tokenError = 'Der Bestätigungs-Token ist abgelaufen oder ungültig.';
      mockConfirmMutateAsync.mockRejectedValueOnce(
        createAxiosError(400, { token: [tokenError] })
      );

      render(
        <MemoryRouter initialEntries={['/password-reset/confirm/MQ/expired-token-123']}>
          <Routes>
            <Route
              path="/password-reset/confirm/:uid/:token"
              element={<PasswordResetConfirmPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Neues Passwort \(min\. 8 Zeichen\)/i), {
        target: { value: 'ValidSecretPass123!' },
      });
      fireEvent.change(screen.getByLabelText(/Neues Passwort bestätigen/i), {
        target: { value: 'ValidSecretPass123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Neues Passwort speichern/i }));

      expect(await screen.findByText(tokenError)).toBeInTheDocument();
    });

    it('displays error from err.response.data.new_password on password policy violation', async () => {
      const passwordPolicyError = 'Dieses Passwort ist zu gewöhnlich und unsicher.';
      mockConfirmMutateAsync.mockRejectedValueOnce(
        createAxiosError(400, { new_password: [passwordPolicyError] })
      );

      render(
        <MemoryRouter initialEntries={['/password-reset/confirm/MQ/valid-token-123']}>
          <Routes>
            <Route
              path="/password-reset/confirm/:uid/:token"
              element={<PasswordResetConfirmPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Neues Passwort \(min\. 8 Zeichen\)/i), {
        target: { value: 'password12345' },
      });
      fireEvent.change(screen.getByLabelText(/Neues Passwort bestätigen/i), {
        target: { value: 'password12345' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Neues Passwort speichern/i }));

      expect(await screen.findByText(passwordPolicyError)).toBeInTheDocument();
    });

    it('displays error from err.response.data.detail when present', async () => {
      const detailError = 'Der Benutzer wurde nicht gefunden oder ist deaktiviert.';
      mockConfirmMutateAsync.mockRejectedValueOnce(
        createAxiosError(400, { detail: detailError })
      );

      render(
        <MemoryRouter initialEntries={['/password-reset/confirm/MQ/valid-token-123']}>
          <Routes>
            <Route
              path="/password-reset/confirm/:uid/:token"
              element={<PasswordResetConfirmPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Neues Passwort \(min\. 8 Zeichen\)/i), {
        target: { value: 'ValidSecretPass123!' },
      });
      fireEvent.change(screen.getByLabelText(/Neues Passwort bestätigen/i), {
        target: { value: 'ValidSecretPass123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Neues Passwort speichern/i }));

      expect(await screen.findByText(detailError)).toBeInTheDocument();
    });

    it('displays fallback error message on network failure without response', async () => {
      mockConfirmMutateAsync.mockRejectedValueOnce(
        createAxiosError(undefined, undefined, 'Network Error')
      );

      render(
        <MemoryRouter initialEntries={['/password-reset/confirm/MQ/valid-token-123']}>
          <Routes>
            <Route
              path="/password-reset/confirm/:uid/:token"
              element={<PasswordResetConfirmPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Neues Passwort \(min\. 8 Zeichen\)/i), {
        target: { value: 'ValidSecretPass123!' },
      });
      fireEvent.change(screen.getByLabelText(/Neues Passwort bestätigen/i), {
        target: { value: 'ValidSecretPass123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Neues Passwort speichern/i }));

      expect(
        await screen.findByText(
          'Fehler beim Zurücksetzen des Passworts. Der Link ist möglicherweise abgelaufen.'
        )
      ).toBeInTheDocument();
    });

    it('displays error message from generic Error instance on unexpected failure', async () => {
      mockConfirmMutateAsync.mockRejectedValueOnce(new Error('Unerwarteter Systemfehler'));

      render(
        <MemoryRouter initialEntries={['/password-reset/confirm/MQ/valid-token-123']}>
          <Routes>
            <Route
              path="/password-reset/confirm/:uid/:token"
              element={<PasswordResetConfirmPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Neues Passwort \(min\. 8 Zeichen\)/i), {
        target: { value: 'ValidSecretPass123!' },
      });
      fireEvent.change(screen.getByLabelText(/Neues Passwort bestätigen/i), {
        target: { value: 'ValidSecretPass123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Neues Passwort speichern/i }));

      expect(await screen.findByText('Unerwarteter Systemfehler')).toBeInTheDocument();
    });

    it('toggles password visibility when clicking eye button', () => {
      render(
        <MemoryRouter initialEntries={['/password-reset/confirm/MQ/token-123']}>
          <Routes>
            <Route
              path="/password-reset/confirm/:uid/:token"
              element={<PasswordResetConfirmPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      const newPwdInput = screen.getByLabelText(/Neues Passwort \(min\. 8 Zeichen\)/i) as HTMLInputElement;
      const toggleBtn = screen.getByRole('button', { name: /Passwort anzeigen/i });

      expect(newPwdInput.type).toBe('password');
      fireEvent.click(toggleBtn);
      expect(newPwdInput.type).toBe('text');
      expect(screen.getByRole('button', { name: /Passwort verbergen/i })).toBeInTheDocument();
    });
  });
});
