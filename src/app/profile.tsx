import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/contexts/auth-context';

export default function ProfileScreen() {
  const { user, requestAuth, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  const initial = user?.name.trim().charAt(0).toUpperCase() || '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backLabel}>‹  Back</Text>
        </Pressable>

        <View style={styles.profileCard}>
          {user ? (
            <>
              <View style={styles.avatar}><Text style={styles.avatarLabel}>{initial}</Text></View>
              <Text style={styles.eyebrow}>YOUR PROFILE</Text>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleSignOut()}
                style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
                <Text style={styles.signOutLabel}>Sign out</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>YOUR PROFILE</Text>
              <Text style={styles.name}>Sign in to continue</Text>
              <Text style={styles.email}>Your profile and reflections are just for you.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => requestAuth()}
                style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}>
                <Text style={styles.signInLabel}>Sign in or create an account</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F5F0' },
  page: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 22 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 12, paddingRight: 12 },
  backLabel: { color: '#375A48', fontSize: 14, fontWeight: '600' },
  profileCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 35,
    padding: 24,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#375A48',
    marginBottom: 20,
  },
  avatarLabel: { color: '#FFFFFF', fontSize: 30, fontWeight: '600' },
  eyebrow: { color: '#375A48', fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  name: { color: '#26372F', fontFamily: 'Georgia', fontSize: 27, textAlign: 'center', marginTop: 10 },
  email: { color: '#788078', fontSize: 12, textAlign: 'center', marginTop: 8 },
  signOutButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: '#E8EEE8',
    marginTop: 28,
  },
  signOutLabel: { color: '#375A48', fontSize: 12, fontWeight: '700' },
  signInButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#375A48',
    marginTop: 20,
  },
  signInLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.78 },
});
