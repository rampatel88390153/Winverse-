'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore, useGameStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setUserData } = useAuthStore();
  const { setGameState } = useGameStore();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // Listen to user data
        const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        });
        return () => unsubscribeUser();
      } else {
        setUserData(null);
      }
    });

    // Listen to game state
    const unsubscribeGame = onSnapshot(doc(db, 'system', 'game_state'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameState({
          currentRoundId: data.current_round_id,
          timer: data.timer,
          status: data.status,
          mode: data.mode,
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeGame();
    };
  }, [setUser, setUserData, setGameState]);

  return <>{children}</>;
}
