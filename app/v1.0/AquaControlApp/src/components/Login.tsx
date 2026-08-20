import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type Props = {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  authError: string
}

export default function Login({ signIn, signUp, authError }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    if (mode === 'signin') await signIn(email, password)
    else await signUp(email, password)
    setSubmitting(false)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
      >
        <View style={styles.card}>
          <Text style={styles.title}>AquaControl</Text>
          <Text style={styles.subtitle}>{mode === 'signin' ? 'Sign in to your account' : 'Create an account'}</Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#64748b"
            secureTextEntry
            style={styles.input}
          />

          {!!authError && <Text style={styles.error}>{authError}</Text>}

          <TouchableOpacity disabled={submitting} onPress={handleSubmit} style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            <Text style={styles.toggle}>
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 360, gap: 12 },
  title: { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f1f5f9',
    fontSize: 14,
  },
  error: { color: '#f87171', fontSize: 12 },
  submitBtn: { backgroundColor: '#0891b2', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  toggle: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 8 },
})
