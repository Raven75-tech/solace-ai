import { Stack } from 'expo-router';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';

import AuthScreen from '@/components/auth-screen';
import { AuthProvider, useAuth } from '@/contexts/auth-context';

function RootNavigator() {
  const { loading, authRequested, authError, cancelAuth } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#375A48" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" />
      </Stack>
      <Modal
        animationType="slide"
        onRequestClose={cancelAuth}
        presentationStyle="fullScreen"
        visible={authRequested}>
        <AuthScreen onCancel={cancelAuth} sessionError={authError} />
      </Modal>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F5F0' },
});
