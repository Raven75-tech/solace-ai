import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAuth } from '@/contexts/auth-context';

export default function ProfileButton() {
  const { user, requestAuth } = useAuth();
  const router = useRouter();

  function openProfile() {
    if (user) {
      router.push('/profile');
      return;
    }

    requestAuth(() => router.push('/profile'));
  }

  const initial = user?.name.trim().charAt(0).toUpperCase() || '';

  return (
    <Pressable
      accessibilityLabel={user ? `Open ${user.name}'s profile` : 'Sign in'}
      accessibilityRole="button"
      onPress={openProfile}
      style={({ pressed }) => [styles.button, !user && styles.signInButton, pressed && styles.pressed]}>
      <Text style={[styles.label, !user && styles.signInLabel]}>{user ? initial : 'Sign in'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 18,
    backgroundColor: '#375A48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButton: {
    width: 'auto',
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: '#E8EEE8',
  },
  label: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  signInLabel: { color: '#375A48', fontSize: 10 },
  pressed: { opacity: 0.75 },
});
