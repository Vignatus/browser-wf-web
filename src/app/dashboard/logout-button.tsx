'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);

    await fetch('/api/auth/logout', {
      method: 'POST',
    });

    clearBrowserAuthStorage();
    router.replace('/');
    router.refresh();
  }

  return (
    <button className="logout-button" type="button" disabled={isLoggingOut} onClick={logout}>
      {isLoggingOut ? 'Logging out' : 'Logout'}
    </button>
  );
}

function clearBrowserAuthStorage() {
  const keys = [
    'token',
    'accessToken',
    'access_token',
    'bearerToken',
    'bearer_token',
    'browser_wf_token',
  ];

  for (const key of keys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
