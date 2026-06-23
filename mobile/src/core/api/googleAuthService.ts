import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { auth } from './firebaseConfig';
import { useState, useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import { authService } from './authService';
import { useAuthStore } from '@/core/store/useAuthStore';
import { setTokens, saveSession } from '@/core/utils/secureStorage';

WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idTokenRef = useRef<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Constants.expoConfig?.extra?.googleClientId,
  });

  useEffect(() => {
    if (response?.type === 'success' && response.params?.id_token) {
      idTokenRef.current = response.params.id_token;
      setTrigger((n) => n + 1); // eslint-disable-line react-hooks/set-state-in-effect
    } else if (response?.type === 'error') {
      setError(response.params?.error_description ?? 'Google authentication failed')
    }
  }, [response]);

  useEffect(() => {
    if (trigger === 0) return;
    const idToken = idTokenRef.current;
    if (!idToken) return;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        const firebaseToken = await auth.currentUser?.getIdToken();
        if (!firebaseToken) throw new Error('Failed to retrieve Firebase token');

        const res = await authService.googleLogin(firebaseToken);
        const token = res?.data?.token ?? (res as any)?.token;
        const user  = res?.data?.user  ?? (res as any)?.user;

        if (token && user) {
          await setTokens(token, token);
          await saveSession(user as unknown as Record<string, unknown>);
          useAuthStore.getState().setUser(user, token);
        } else {
          throw new Error('Invalid server response');
        }
      } catch (err: any) {
        setError(err.message || 'Google authentication failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [trigger]);

  return { promptAsync, loading: loading || !request, error };
};
