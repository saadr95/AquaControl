import { useEffect, useState } from 'react'
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth'
import firestore from '@react-native-firebase/firestore'

export type Role = 'customer' | 'admin'

// Wraps Firebase Auth + the users/{uid} profile doc (which carries the
// role — "customer" or "admin" — that everything else keys off of). Direct
// port of the web dashboard's useAuth.js — same shape, same rules.
export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    return auth().onAuthStateChanged(async (firebaseUser) => {
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
      const ref = firestore().collection('users').doc(firebaseUser.uid)
      const snap = await ref.get()
      if (!snap.exists) {
        await ref.set({ email: firebaseUser.email, role: 'customer', createdAt: firestore.FieldValue.serverTimestamp() })
        setRole('customer')
      } else {
        setRole((snap.data()?.role as Role) || 'customer')
      }
      setLoading(false)
    })
  }, [])

  const signIn = async (email: string, password: string) => {
    setAuthError('')
    try {
      await auth().signInWithEmailAndPassword(email, password)
    } catch (e) {
      setAuthError(friendlyAuthError(e as { code?: string; message?: string }))
    }
  }

  const signUp = async (email: string, password: string) => {
    setAuthError('')
    try {
      await auth().createUserWithEmailAndPassword(email, password)
    } catch (e) {
      setAuthError(friendlyAuthError(e as { code?: string; message?: string }))
    }
  }

  const signOut = () => auth().signOut()

  return { user, role, loading, signIn, signUp, signOut, authError }
}

function friendlyAuthError(e: { code?: string; message?: string }) {
  switch (e.code) {
    case 'auth/invalid-email':
      return "That email address doesn't look right."
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
