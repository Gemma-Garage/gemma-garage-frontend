import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isUserSetupComplete, setIsUserSetupComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoadingAuth(true);
        setIsUserSetupComplete(false);
        setCurrentUser(user);
        console.log("[AUTH_STATE_CHANGE] User signed in:", user.uid, "Display Name:", user.displayName);

        try {
          console.log("[USER_DOC_LOGIC] Attempting to get/create user document for:", user.uid);
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (!userDocSnap.exists()) {
            console.log("[USER_DOC_LOGIC] User document does not exist for " + user.uid + ". Creating now.");
            await setDoc(userDocRef, {
              email: user.email,
              displayName: user.displayName || user.email,
              createdAt: serverTimestamp(),
            });
            console.log("[USER_DOC_LOGIC] User document created for new user:", user.uid);
          } else {
            console.log("[USER_DOC_LOGIC] User document already exists for:", user.uid, userDocSnap.data());
            if (user.displayName && userDocSnap.data().displayName !== user.displayName) {
              await updateDoc(userDocRef, { displayName: user.displayName });
              console.log("[USER_DOC_LOGIC] Updated displayName for user:", user.uid);
            }
          }
          setIsUserSetupComplete(true);
        } catch (e) {
          console.error("[FIRESTORE_CATCH_BLOCK] Error during user document setup:", e);
          setIsUserSetupComplete(false);
        } finally {
          setLoadingAuth(false);
        }
      } else {
        console.log("[AUTH_STATE_CHANGE] User signed out.");
        setCurrentUser(null);
        setIsUserSetupComplete(false);
        setLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    loadingAuth,
    isUserSetupComplete,
    auth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
