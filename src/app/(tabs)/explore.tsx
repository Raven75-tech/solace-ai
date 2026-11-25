import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProfileButton from '@/components/profile-button';
import { useAuth } from '@/contexts/auth-context';
import { getWeeklyInsight, type CheckIn, type WeeklyInsight } from '@/lib/api';

const palette = {
  background: '#F6F5F0',
  surface: '#FFFFFF',
  ink: '#26372F',
  muted: '#788078',
  green: '#375A48',
  pale: '#E8EEE8',
  border: '#E8E8E1',
  lavender: '#EAE7F3',
};

const moodDetails: Record<CheckIn['mood'], { face: string; label: string }> = {
  'very-low': { face: '😔', label: 'Low' },
  low: { face: '😕', label: 'A little off' },
  okay: { face: '😐', label: 'Okay' },
  good: { face: '🙂', label: 'Good' },
  great: { face: '😊', label: 'Great' },
};

export default function ExploreScreen() {
  const { user, requestAuth, signOut } = useAuth();
  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [insightUserId, setInsightUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInsight = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getWeeklyInsight();
      setInsight(result);
      setInsightUserId(user.id);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your reflections couldn’t be loaded.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    void getWeeklyInsight()
      .then((result) => {
        if (!active) return;
        setInsight(result);
        setInsightUserId(user.id);
        setError('');
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Your reflections couldn’t be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const currentInsight = user && insightUserId === user.id ? insight : null;
  const checkIns = currentInsight?.recentCheckIns ?? [];
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const entry = checkIns.find((item) => new Date(item.createdAt).toDateString() === date.toDateString());
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
      date: date.getDate(),
      entry,
    };
  });
  const latestNote = checkIns.find((item) => item.note?.trim());

  if (!user) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.lockedPage}>
          <View style={styles.topBar}>
            <View style={styles.brandLockup}>
              <ProfileButton />
              <Text style={styles.brandName}>solace</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => requestAuth()} hitSlop={8}>
              <Text style={styles.topBarLabel}>SIGN IN</Text>
            </Pressable>
          </View>
          <View style={styles.lockedCard}>
            <View style={styles.summaryFlower}><Text style={styles.flowerText}>♡</Text></View>
            <Text style={styles.title}>Your space is{'\n'}just for you.</Text>
            <Text style={styles.subtitle}>Sign in to see your check-ins, reflections, and the small things you’ve noticed.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => requestAuth()}
              style={({ pressed }) => [styles.unlockButton, pressed && styles.pressed]}>
              <Text style={styles.unlockButtonText}>Sign in or create an account</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <ProfileButton />
            <Text style={styles.brandName}>solace</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void signOut()} hitSlop={8}>
            <Text style={styles.topBarLabel}>SIGN OUT</Text>
          </Pressable>
        </View>

        <Text style={styles.eyebrow}>A LITTLE LOOK BACK</Text>
        <Text style={styles.title}>Notice the{'\n'}small things.</Text>
        <Text style={styles.subtitle}>This is your space to reflect, not to measure up.</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryEyebrow}>THE LAST 7 DAYS</Text>
              <Text style={styles.summaryTitle}>You made space for you.</Text>
            </View>
            <View style={styles.summaryFlower}><Text style={styles.flowerText}>✳</Text></View>
          </View>
          {loading || (!currentInsight && !error) ? (
            <View style={styles.loadingRow}><ActivityIndicator color={palette.green} /><Text style={styles.loadingText}>Gathering your moments…</Text></View>
          ) : error ? (
            <View style={styles.errorBlock}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={() => {
                setLoading(true);
                void loadInsight();
              }} style={styles.retryButton}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{currentInsight?.checkInCount ?? 0}</Text>
                <Text style={styles.statLabel}>check-ins</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{currentInsight?.daysCheckedIn ?? 0}</Text>
                <Text style={styles.statLabel}>days noticed</Text>
              </View>
              <Text style={styles.statsNote}>Showing up is{'\n'}the whole thing.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your week, gently</Text>
            <Text style={styles.sectionSubtitle}>Every feeling belongs here.</Text>
          </View>
          <Pressable
            accessibilityLabel="Refresh weekly reflections"
            accessibilityRole="button"
            disabled={loading}
            onPress={() => {
              setLoading(true);
              void loadInsight();
            }}
            style={styles.refreshButton}>
            <Text style={styles.weekLabel}>{loading ? 'LOADING…' : '↻  REFRESH'}</Text>
          </Pressable>
        </View>
        <View style={styles.weekCard}>
          <View style={styles.weekDays}>
            {days.map((day) => (
              <View key={`${day.day}-${day.date}`} style={styles.weekDay}>
                {day.entry ? (
                  <Text style={styles.weekMood}>{moodDetails[day.entry.mood].face}</Text>
                ) : (
                  <View style={styles.emptyMood}><View style={styles.emptyDot} /></View>
                )}
                <Text style={styles.weekDayName}>{day.day}</Text>
                <Text style={styles.weekDate}>{day.date}</Text>
              </View>
            ))}
          </View>
          <View style={styles.weekLegend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>A dot means you checked in. An open space is simply an open space.</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Words you left here</Text>
            <Text style={styles.sectionSubtitle}>Your reflections, just as they are.</Text>
          </View>
        </View>
        {latestNote ? (
          <View style={styles.reflectionCard}>
            <Text style={styles.quoteMark}>“</Text>
            <Text style={styles.reflectionText}>{latestNote.note}</Text>
            <View style={styles.reflectionFooter}>
              <Text style={styles.reflectionMood}>{moodDetails[latestNote.mood].face}  {moodDetails[latestNote.mood].label}</Text>
              <Text style={styles.reflectionDate}>{new Date(latestNote.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>✎</Text></View>
            <Text style={styles.emptyTitle}>Your words can wait.</Text>
            <Text style={styles.emptyDescription}>If you leave a note with a check-in, it will find a little home here.</Text>
          </View>
        )}

        <View style={styles.kindReminder}>
          <Text style={styles.reminderIcon}>♡</Text>
          <View style={styles.reminderCopy}>
            <Text style={styles.reminderTitle}>A kind reminder</Text>
            <Text style={styles.reminderBody}>A hard day doesn’t undo a good one. This is a place to notice, not judge.</Text>
          </View>
        </View>
        <Text style={styles.disclaimer}>Your reflections belong to this prototype. Solace is a wellness companion, not medical care.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  page: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 35 },
  lockedPage: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 22, flex: 1 },
  lockedCard: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', marginBottom: 35, backgroundColor: palette.pale, borderRadius: 22, padding: 24 },
  unlockButton: { backgroundColor: palette.green, minHeight: 46, borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  unlockButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.78 },
  topBar: { height: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 27 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandIcon: { width: 31, height: 31, borderRadius: 16, backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center' },
  brandIconText: { color: '#FFFFFF', fontSize: 22, fontWeight: '600', fontFamily: 'Georgia' },
  brandName: { color: palette.ink, fontSize: 21, fontWeight: '600', letterSpacing: -0.5 },
  topBarLabel: { color: palette.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  eyebrow: { color: palette.green, fontSize: 9, letterSpacing: 1.4, fontWeight: '700' },
  title: { color: palette.ink, fontFamily: 'Georgia', fontSize: 38, lineHeight: 43, marginTop: 10 },
  subtitle: { color: palette.muted, fontSize: 11, marginTop: 10, marginBottom: 21 },
  summaryCard: { backgroundColor: palette.pale, borderRadius: 20, padding: 18 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryEyebrow: { color: palette.green, fontSize: 8, letterSpacing: 1.3, fontWeight: '700' },
  summaryTitle: { color: palette.ink, fontFamily: 'Georgia', fontSize: 19, marginTop: 8 },
  summaryFlower: { width: 38, height: 38, borderRadius: 20, backgroundColor: '#D7E1D8', alignItems: 'center', justifyContent: 'center' },
  flowerText: { color: palette.green, fontSize: 21 },
  loadingRow: { minHeight: 75, flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: palette.muted, fontSize: 11 },
  errorBlock: { marginTop: 14 },
  errorText: { color: '#A64C47', fontSize: 11, lineHeight: 16 },
  retryButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 5 },
  retryText: { color: palette.green, fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 19, minHeight: 47 },
  stat: { width: 74 },
  statValue: { color: palette.ink, fontFamily: 'Georgia', fontSize: 27 },
  statLabel: { color: palette.muted, fontSize: 9, marginTop: 2 },
  statDivider: { height: 36, width: 1, backgroundColor: '#CAD5CB', marginRight: 14 },
  statsNote: { color: palette.green, fontFamily: 'Georgia', fontSize: 12, lineHeight: 16, marginLeft: 'auto', textAlign: 'right' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 13 },
  sectionTitle: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  sectionSubtitle: { color: palette.muted, fontSize: 10, marginTop: 4 },
  weekLabel: { color: palette.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  weekCard: { backgroundColor: palette.surface, borderRadius: 17, paddingTop: 16, paddingHorizontal: 12, paddingBottom: 12, borderWidth: 1, borderColor: palette.border },
  refreshButton: { paddingVertical: 6, paddingLeft: 10 },
  weekDays: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 7, flex: 1 },
  weekMood: { fontSize: 21, height: 28 },
  emptyMood: { width: 27, height: 27, borderRadius: 14, borderWidth: 1, borderColor: '#DDE0D9', alignItems: 'center', justifyContent: 'center' },
  emptyDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C8CEC6' },
  weekDayName: { color: palette.muted, fontSize: 9 },
  weekDate: { color: palette.ink, fontSize: 9, fontWeight: '600' },
  weekLegend: { borderTopWidth: 1, borderColor: palette.border, marginTop: 15, paddingTop: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#819584' },
  legendText: { color: palette.muted, fontSize: 8, flex: 1 },
  reflectionCard: { backgroundColor: palette.surface, borderRadius: 17, borderWidth: 1, borderColor: palette.border, padding: 16 },
  quoteMark: { color: '#879789', fontFamily: 'Georgia', fontSize: 29, lineHeight: 29 },
  reflectionText: { color: palette.ink, fontFamily: 'Georgia', fontSize: 15, lineHeight: 22, marginTop: 3 },
  reflectionFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, alignItems: 'center' },
  reflectionMood: { color: palette.muted, fontSize: 9 },
  reflectionDate: { color: palette.muted, fontSize: 9 },
  emptyCard: { backgroundColor: palette.surface, borderRadius: 17, borderWidth: 1, borderColor: palette.border, padding: 17 },
  emptyIcon: { width: 32, height: 32, borderRadius: 17, backgroundColor: palette.lavender, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: palette.green, fontSize: 16 },
  emptyTitle: { color: palette.ink, fontFamily: 'Georgia', fontSize: 16, marginTop: 12 },
  emptyDescription: { color: palette.muted, fontSize: 10, lineHeight: 16, marginTop: 5 },
  kindReminder: { flexDirection: 'row', gap: 12, backgroundColor: '#F2EBDD', borderRadius: 17, marginTop: 23, padding: 16, alignItems: 'flex-start' },
  reminderIcon: { color: '#9A765A', fontSize: 22, lineHeight: 25 },
  reminderCopy: { flex: 1 },
  reminderTitle: { color: palette.ink, fontSize: 11, fontWeight: '700' },
  reminderBody: { color: '#72746D', fontSize: 10, lineHeight: 15, marginTop: 5 },
  disclaimer: { color: palette.muted, fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 18, paddingHorizontal: 10 },
});
