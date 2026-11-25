import { TabList, TabSlot, TabTrigger, TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View, type PressableProps  } from 'react-native';
import type { Ref } from 'react';

type TabButtonProps = TabTriggerSlotProps & {
  ref?: Ref<React.ElementRef<typeof Pressable>>;
};

export default function AppTabs() {
  return (
    <Tabs>
      <View style={styles.app}>
        <TabSlot style={styles.slot} />
        <TabList asChild>
          <View style={styles.tabBar}>
            <TabTrigger name="home" href="/" asChild>
              <TabButton>Today</TabButton>
            </TabTrigger>
            <TabTrigger name="explore" href="/explore" asChild>
              <TabButton>Your space</TabButton>
            </TabTrigger>
          </View>
        </TabList>
      </View>
    </Tabs>
  );
}

function TabButton({
  children,
  isFocused,
  ...props
}: TabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.tabButton,
        isFocused && styles.tabButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelSelected]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#F6F5F0' },
  slot: { flex: 1 },
  tabBar: { alignSelf: 'center', flexDirection: 'row', gap: 5, marginTop: 10, marginBottom: 15, padding: 5, borderRadius: 24, backgroundColor: '#EBECE6' },
  tabButton: { minWidth: 105, minHeight: 38, borderRadius: 21, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  tabButtonSelected: { backgroundColor: '#FFFFFF' },
  tabLabel: { color: '#788078', fontSize: 11 },
  tabLabelSelected: { color: '#375A48', fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
