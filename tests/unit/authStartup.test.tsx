// @vitest-environment jsdom

import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type AuthListener = (event: string, session: { user: { id: string } } | null) => unknown;

let authListener: AuthListener | null = null;
let resolveProfile: ((value: { data: Record<string, unknown>; error: null }) => void) | null = null;

const single = vi.fn(() => new Promise<{ data: Record<string, unknown>; error: null }>((resolve) => {
  resolveProfile = resolve;
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((listener: AuthListener) => {
        authListener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../../src/app/services/permissionService', () => ({
  fetchEffectivePermissions: vi.fn(async () => new Set<string>()),
  resolvePermissions: vi.fn(() => new Set<string>()),
}));

vi.mock('../../src/app/shared/controlPanelClient', () => ({
  controlPanelFetch: vi.fn(),
}));

import { AuthProvider, useAuth } from '../../src/app/contexts/AuthContext';

function AuthProbe({ children }: { children?: ReactNode }) {
  const { loading, userProfile } = useAuth();
  return (
    <div data-testid="auth-state">
      {loading ? 'loading' : userProfile?.full_name ?? 'ready-without-profile'}
      {children}
    </div>
  );
}

describe('authenticated application startup', () => {
  beforeEach(() => {
    authListener = null;
    resolveProfile = null;
    single.mockClear();
  });

  it('returns from the auth listener before loading the signed-in profile', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(authListener).not.toBeNull();

    let listenerResult: unknown;
    act(() => {
      listenerResult = authListener?.('INITIAL_SESSION', { user: { id: 'user-1' } });
    });

    // A Promise here would mean database work is once again running inside
    // Supabase's auth callback and can reproduce the infinite loading bug.
    expect(listenerResult).toBeUndefined();
    expect(screen.getByTestId('auth-state').textContent).toContain('loading');

    await waitFor(() => expect(resolveProfile).not.toBeNull());
    await act(async () => {
      resolveProfile?.({
        data: {
          id: 'user-1',
          full_name: 'Test User',
          role: 'employee',
          is_active: true,
        },
        error: null,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toContain('Test User');
    });
  });
});
