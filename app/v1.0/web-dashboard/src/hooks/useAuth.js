import { useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'

// Wraps Firebase Auth + the users/{uid} profile doc (which carries the
// role — "customer" or "admin" — that everything else keys off of).
export function useAuth() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setAuthError('')

      if (!firebaseUser) {
        setRole(null)
        setLoading(false)
        return
      }

      // First sign-in: create the profile doc. Role always starts as
      // "customer" — the security rules don't allow self-assigning admin;
      // that's a manual step in the Firebase Console after the fact.
      const ref = doc(db, 'users', firebaseUser.uid)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, { email: firebaseUser.email, role: 'customer', createdAt: serverTimestamp() })
        setRole('customer')
      } else {
        setRole(snap.data().role || 'customer')
      }
      setLoading(false)
    })
  }, [])

  const signIn = async (email, password) => {
    setAuthError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      setAuthError(friendlyAuthError(e))
    }
  }

  const signUp = async (email, password) => {
    setAuthError('')
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (e) {
      setAuthError(friendlyAuthError(e))
    }
  }

  const signOut = () => firebaseSignOut(auth)

  return { user, role, loading, signIn, signUp, signOut, authError }
}

function friendlyAuthError(e) {
  switch (e.code) {
    case 'auth/invalid-email':
      return 'That email address doesn\'t look right.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email or password is incorrect.'
    case 'auth/email-already-in-use':
      return 'An account already exists with that email — try signing in instead.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    default:
      return e.message || 'Something went wrong — try again.'
  }
}
