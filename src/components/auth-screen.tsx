import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';

const palette = {
  background: '#F6F5F0',
  surface: '#FFFFFF',
  ink: '#26372F',
  muted: '#788078',
  green: '#375A48',
  pale: '#E8EEE8',
  border: '#E8E8E1',
  red: '#A64C47',
};

export default function AuthScreen({
  sessionError = '',
  onCancel,
}: {
  sessionError?: string;
  onCancel?: () => void;
}) {
  const { signIn, signUp } = useAuth();
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (creatingAccount && !name.trim()) {
      setError('Add your name to create an account.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError('Your password should be between 8 and 128 characters.');
      return;
    }
    if (creatingAccount && password !== confirmPassword) {
      setError('Those passwords don’t match yet.');
      return;
    }

    setBusy(true);
    try {
      if (creatingAccount) await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign you in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setCreatingAccount((current) => !current);
    setError('');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}>
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.brandLockup}>
              <View style={styles.brandIcon}><Text style={styles.brandIconText}>s</Text></View>
              <Text style={styles.brandName}>solace</Text>
              {onCancel && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue browsing without signing in"
                  onPress={onCancel}
                  style={styles.cancelButton}
                  hitSlop={8}>
                  <Text style={styles.cancelText}>Maybe later</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.eyebrow}>A QUIETER MOMENT STARTS HERE</Text>
            <Text style={styles.title}>
              {creatingAccount ? 'Make a little\nspace for you.' : 'Welcome back\nto your space.'}
            </Text>
            <Text style={styles.subtitle}>
              {creatingAccount
                ? 'A gentle place to check in, reflect, and find your footing.'
                : 'Your moments are right where you left them.'}
            </Text>

            {!!sessionError && <Text accessibilityLiveRegion="polite" style={styles.notice}>{sessionError}</Text>}

            {creatingAccount && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>YOUR NAME</Text>
                <TextInput
                  accessibilityLabel="Your name"
                  autoComplete="name"
                  autoCapitalize="words"
                  maxLength={80}
                  onChangeText={setName}
                  placeholder="How should we call you?"
                  placeholderTextColor="#9A9F98"
                  returnKeyType="next"
                  style={styles.input}
                  value={name}
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                accessibilityLabel="Email address"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9A9F98"
                returnKeyType="next"
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={creatingAccount ? 'new-password' : 'current-password'}
                onChangeText={setPassword}
                onSubmitEditing={() => {
                  if (!creatingAccount) void submit();
                }}
                placeholder={creatingAccount ? 'At least 8 characters' : 'Your password'}
                placeholderTextColor="#9A9F98"
                returnKeyType={creatingAccount ? 'next' : 'go'}
                secureTextEntry
                style={styles.input}
                textContentType={creatingAccount ? 'newPassword' : 'password'}
                value={password}
              />
            </View>

            {creatingAccount && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <TextInput
                  accessibilityLabel="Confirm password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  onChangeText={setConfirmPassword}
                  onSubmitEditing={() => void submit()}
                  placeholder="Enter your password again"
                  placeholderTextColor="#9A9F98"
                  returnKeyType="go"
                  secureTextEntry
                  style={styles.input}
                  textContentType="newPassword"
                  value={confirmPassword}
                />
              </View>
            )}

            {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.submitButton, pressed && !busy && styles.pressed, busy && styles.disabled]}>
              {busy
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.submitText}>{creatingAccount ? 'Create my account' : 'Sign in'}</Text>}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchPrompt}>
                {creatingAccount ? 'Already have a space?' : 'New to Solace?'}
              </Text>
              <Pressable accessibilityRole="button" disabled={busy} onPress={switchMode} hitSlop={8}>
                <Text style={styles.switchLink}>{creatingAccount ? 'Sign in' : 'Create an account'}</Text>
              </Pressable>
            </View>
            <View style={styles.privacyNote}>
              <Text style={styles.privacyIcon}>♡</Text>
              <Text style={styles.privacyText}>Your reflections are personal and only visible in your account.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: palette.surface,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 27,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: palette.border,
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 32 },
  cancelButton: { marginLeft: 'auto', paddingVertical: 6 },
  cancelText: { color: palette.muted, fontSize: 10, fontWeight: '600' },
  brandIcon: { width: 31, height: 31, borderRadius: 16, backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center' },
  brandIconText: { color: '#FFFFFF', fontSize: 22, fontWeight: '600', fontFamily: 'Georgia' },
  brandName: { color: palette.ink, fontSize: 21, fontWeight: '600', letterSpacing: -0.5 },
  eyebrow: { color: palette.green, fontSize: 9, letterSpacing: 1.4, fontWeight: '700' },
  title: { color: palette.ink, fontFamily: 'Georgia', fontSize: 36, lineHeight: 41, marginTop: 10 },
  subtitle: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 10, marginBottom: 23 },
  fieldGroup: { marginBottom: 14 },
  label: { color: palette.green, fontSize: 9, fontWeight: '700', letterSpacing: 1.1, marginBottom: 7 },
  input: {
    minHeight: 49,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FCFCFA',
    paddingHorizontal: 14,
    color: palette.ink,
    fontSize: 13,
  },
  submitButton: { minHeight: 50, borderRadius: 15, backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.7 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 19 },
  switchPrompt: { color: palette.muted, fontSize: 11 },
  switchLink: { color: palette.green, fontSize: 11, fontWeight: '700' },
  error: { color: palette.red, fontSize: 11, lineHeight: 16, marginBottom: 8 },
  notice: { color: palette.red, fontSize: 11, lineHeight: 16, backgroundColor: '#F8ECEA', borderRadius: 10, padding: 10, marginBottom: 14 },
  privacyNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 22 },
  privacyIcon: { color: palette.green, fontSize: 14 },
  privacyText: { color: palette.muted, fontSize: 9, textAlign: 'center', flexShrink: 1 },
});
