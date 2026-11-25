import { useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ProfileButton from '@/components/profile-button';
import { useAuth } from '@/contexts/auth-context';
import { sendChatMessage, saveCheckIn, type Mood } from '@/lib/api';

const colors = {
  background: '#F6F5F0',
  surface: '#FFFFFF',
  ink: '#26372F',
  muted: '#788078',
  green: '#375A48',
  paleGreen: '#E8EEE8',
  line: '#E8E8E1',
  peach: '#F7E5D8',
  lavender: '#EAE7F3',
  red: '#A64C47',
};

const moods: { value: Mood; face: string; label: string }[] = [
  { value: 'very-low', face: '😔', label: 'Low' },
  { value: 'low', face: '😕', label: 'A little off' },
  { value: 'okay', face: '😐', label: 'Okay' },
  { value: 'good', face: '🙂', label: 'Good' },
  { value: 'great', face: '😊', label: 'Great' },
];

type ChatItem = { role: 'user' | 'assistant'; content: string };

function ActionButton({
  label,
  onPress,
  light = false,
}: {
  label: string;
  onPress: () => void;
  light?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        light && styles.actionButtonLight,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.actionText, light && styles.actionTextLight]}>{label}</Text>
      <Text style={[styles.actionArrow, light && styles.actionTextLight]}>↗</Text>
    </Pressable>
  );
}

function CheckInModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Mood | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!selected) {
      setError('Choose the feeling that comes closest. There is no wrong answer.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveCheckIn(selected, note.trim());
      setNote('');
      setSelected(null);
      onSaved();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save your check-in.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalScrim}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}>
          <SafeAreaView style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
            <Text style={styles.eyebrow}>A MOMENT FOR YOU</Text>
            <Text style={styles.sheetTitle}>How are you, really?</Text>
            <Text style={styles.sheetSubtitle}>Take a breath. Whatever is here is okay.</Text>
            <View style={styles.moodOptions}>
              {moods.map((mood) => {
                const isSelected = selected === mood.value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={mood.value}
                    onPress={() => {
                      setSelected(mood.value);
                      setError('');
                    }}
                    style={[styles.moodOption, isSelected && styles.moodOptionSelected]}>
                    <Text style={styles.moodFace}>{mood.face}</Text>
                    <Text style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}>
                      {mood.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.inputLabel}>Anything on your mind? <Text style={styles.optional}>OPTIONAL</Text></Text>
            <TextInput
              accessibilityLabel="Optional note for this check-in"
              maxLength={500}
              multiline
              onChangeText={setNote}
              placeholder="A word, a thought, or nothing at all..."
              placeholderTextColor="#9A9F98"
              style={styles.noteInput}
              textAlignVertical="top"
              value={note}
            />
            {!!error && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text>}
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={submit}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save this moment</Text>}
            </Pressable>
            <Text style={styles.privacyNote}>Your reflections are personal. Be gentle with yourself.</Text>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChatModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatItem[]>([
    { role: 'assistant', content: 'Hi, I’m here with you. What’s been taking up space in your mind today?' },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messageListRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const conversationId = useState(() => `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)[0];

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setDraft('');
    setSending(true);
    setError('');
    try {
      const { reply } = await sendChatMessage(
        conversationId,
        next.slice(-10).map(({ role, content }) => ({ role, content })),
      );
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The companion is unavailable right now.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatPage}>
        <SafeAreaView style={styles.chatPage}>
          <View style={styles.chatHeader}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.backButton}>
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>
            <View style={styles.chatAvatar}><Text style={styles.avatarMark}>s</Text></View>
            <View style={styles.chatHeading}>
              <Text style={styles.chatTitle}>A softer space</Text>
              <Text style={styles.chatSubtitle}>Your Solace companion</Text>
            </View>
            <Text style={styles.onlineDot}>●</Text>
          </View>
          <ScrollView
            ref={messageListRef}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => messageListRef.current?.scrollToEnd({ animated: true })}
            style={styles.messageScroll}>
            <Text style={styles.chatDate}>A MOMENT TOGETHER</Text>
            {messages.map((message, index) => (
              <View
                key={`${index}-${message.role}`}
                style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                <Text style={[styles.messageText, message.role === 'user' && styles.userMessageText]}>
                  {message.content}
                </Text>
              </View>
            ))}
            {sending && (
              <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
                <ActivityIndicator color={colors.green} size="small" />
                <Text style={styles.typingText}>Taking a moment…</Text>
              </View>
            )}
            {!!error && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text>}
          </ScrollView>
          <View style={styles.chatDisclaimer}>
            <Text style={styles.disclaimerText}>A caring companion, not a substitute for professional care.</Text>
          </View>
          <View style={styles.composerRow}>
            <TextInput
              accessibilityLabel="Message your Solace companion"
              editable={!sending}
              maxLength={2000}
              onChangeText={setDraft}
              onSubmitEditing={send}
              placeholder="Share what’s on your mind..."
              placeholderTextColor="#9A9F98"
              returnKeyType="send"
              style={styles.composerInput}
              value={draft}
            />
            <Pressable
              accessibilityLabel="Send message"
              accessibilityRole="button"
              disabled={!draft.trim() || sending}
              onPress={send}
              style={({ pressed }) => [
                styles.sendButton,
                (!draft.trim() || sending) && styles.sendButtonDisabled,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.sendButtonText}>↑</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function BreathingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const prompts = ['Breathe in slowly', 'Hold gently', 'Let it go'];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.breathingScrim}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
        <Text style={styles.breathingEyebrow}>A SMALL PAUSE</Text>
        <Text style={styles.breathingTitle}>There’s nowhere else{'\n'}you need to be.</Text>
        <View style={styles.breathingOrb}><View style={styles.breathingOrbInner} /></View>
        <Text style={styles.breathingPrompt}>{prompts[step]}</Text>
        <Text style={styles.breathingHint}>Follow your own pace. Stop whenever you like.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setStep((current) => (current + 1) % prompts.length)}
          style={styles.breathingButton}>
          <Text style={styles.breathingButtonText}>Continue</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const { requestAuth } = useAuth();
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [breathingVisible, setBreathingVisible] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandLockup}>
            <ProfileButton />
            <Text style={styles.brandName}>solace</Text>
          </View>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroEyebrow}>A GENTLER KIND OF EVERYDAY</Text>
          <Text style={styles.heroTitle}>Make room for{'\n'}how you feel.</Text>
          <Text style={styles.heroDescription}>A little care, a little curiosity, and space to be exactly where you are.</Text>
          <View style={styles.heroBottom}>
            <View style={styles.heroNote}>
              <View style={styles.heroSparkle}><Text style={styles.sparkleText}>✳</Text></View>
              <Text style={styles.heroNoteText}>Your day can start{'\n'}right here.</Text>
            </View>
            <ActionButton label="Check in" light onPress={() => requestAuth(() => setCheckInVisible(true))} />
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>A moment with yourself</Text>
            <Text style={styles.sectionSubtitle}>
              {checkedInToday ? 'You showed up for yourself today.' : 'No need to find the perfect words.'}
            </Text>
          </View>
          <Text style={styles.sectionOrnament}>✳</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => requestAuth(() => setCheckInVisible(true))}
          style={({ pressed }) => [styles.moodCard, pressed && styles.pressed]}>
          <View style={styles.moodCardTop}>
            <Text style={styles.moodPrompt}>{checkedInToday ? 'Want to check in again?' : 'How does today feel?'}</Text>
            <Text style={styles.moodCardArrow}>↗</Text>
          </View>
          <View style={styles.moodRow}>
            {moods.map((mood) => (
              <View key={mood.value} style={styles.moodPreview}>
                <Text style={styles.moodPreviewFace}>{mood.face}</Text>
                <Text style={styles.moodPreviewLabel}>{mood.label}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>A little support</Text>
            <Text style={styles.sectionSubtitle}>Choose what feels right for you.</Text>
          </View>
        </View>
        <View style={styles.supportGrid}>
          <Pressable
            accessibilityRole="button"
            onPress={() => requestAuth(() => setChatVisible(true))}
            style={({ pressed }) => [styles.supportCard, styles.chatCard, pressed && styles.pressed]}>
            <View style={[styles.supportIcon, styles.chatIcon]}><Text style={styles.supportIconText}>✳</Text></View>
            <Text style={styles.supportTitle}>Talk it out</Text>
            <Text style={styles.supportDescription}>A thoughtful companion for whatever’s on your mind.</Text>
            <Text style={styles.cardLink}>Start a conversation <Text style={styles.cardLinkArrow}>→</Text></Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => requestAuth(() => setBreathingVisible(true))}
            style={({ pressed }) => [styles.supportCard, styles.pauseCard, pressed && styles.pressed]}>
            <View style={[styles.supportIcon, styles.pauseIcon]}><Text style={styles.supportIconText}>◌</Text></View>
            <Text style={styles.supportTitle}>Take a pause</Text>
            <Text style={styles.supportDescription}>A quiet breathing moment, just for this moment.</Text>
            <Text style={styles.cardLink}>Find a little calm <Text style={styles.cardLinkArrow}>→</Text></Text>
          </Pressable>
        </View>

        <View style={styles.footerQuote}>
          <Text style={styles.quoteMark}>“</Text>
          <Text style={styles.quoteText}>You don’t have to have it all figured out to take the next small step.</Text>
          <Text style={styles.quoteByline}>A GENTLE REMINDER</Text>
        </View>
      </ScrollView>
      <CheckInModal
        visible={checkInVisible}
        onClose={() => setCheckInVisible(false)}
        onSaved={() => setCheckedInToday(true)}
      />
      <ChatModal visible={chatVisible} onClose={() => setChatVisible(false)} />
      <BreathingModal visible={breathingVisible} onClose={() => setBreathingVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  page: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 38 },
  topBar: { height: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandIcon: { width: 31, height: 31, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  brandIconText: { color: '#FFFFFF', fontSize: 22, fontWeight: '600', fontFamily: 'Georgia' },
  brandName: { color: colors.ink, fontSize: 21, fontWeight: '600', letterSpacing: -0.5 },
  dateLabel: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  hero: { minHeight: 274, borderRadius: 24, backgroundColor: colors.green, padding: 24, overflow: 'hidden', justifyContent: 'space-between' },
  heroGlow: { position: 'absolute', top: -72, right: -34, width: 220, height: 220, borderRadius: 120, backgroundColor: '#537461', opacity: 0.65 },
  heroEyebrow: { color: '#D5E0D6', letterSpacing: 1.55, fontSize: 9, fontWeight: '700' },
  heroTitle: { color: '#FFFFFF', fontFamily: 'Georgia', fontSize: 37, lineHeight: 43, letterSpacing: -0.7, marginTop: 16 },
  heroDescription: { color: '#E4ECE4', fontSize: 12, lineHeight: 19, maxWidth: 285, marginTop: 8 },
  heroBottom: { marginTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroNote: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  heroSparkle: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#6E8977', alignItems: 'center', justifyContent: 'center' },
  sparkleText: { color: '#F5E7BA', fontSize: 17 },
  heroNoteText: { color: '#E6ECE4', fontSize: 10, lineHeight: 15 },
  actionButton: { height: 41, backgroundColor: colors.green, paddingHorizontal: 15, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 11 },
  actionButtonLight: { backgroundColor: '#F6F5F0' },
  actionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  actionTextLight: { color: colors.green },
  actionArrow: { color: '#FFFFFF', fontSize: 15 },
  pressed: { opacity: 0.78 },
  sectionHeading: { marginTop: 27, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '600', letterSpacing: -0.25 },
  sectionSubtitle: { color: colors.muted, fontSize: 11, marginTop: 4 },
  sectionOrnament: { color: '#91A193', fontSize: 19 },
  moodCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 17, paddingTop: 15, paddingBottom: 14 },
  moodCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moodPrompt: { fontSize: 12, fontWeight: '600', color: colors.ink },
  moodCardArrow: { color: colors.muted, fontSize: 15 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 13 },
  moodPreview: { alignItems: 'center', gap: 4, flex: 1 },
  moodPreviewFace: { fontSize: 23 },
  moodPreviewLabel: { fontSize: 8, color: colors.muted },
  supportGrid: { flexDirection: 'row', gap: 12 },
  supportCard: { flex: 1, minHeight: 196, borderRadius: 19, padding: 15, justifyContent: 'flex-start' },
  chatCard: { backgroundColor: colors.lavender },
  pauseCard: { backgroundColor: colors.peach },
  supportIcon: { width: 33, height: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  chatIcon: { backgroundColor: '#D7D1E9' },
  pauseIcon: { backgroundColor: '#F1D2BF' },
  supportIconText: { color: colors.green, fontSize: 19 },
  supportTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  supportDescription: { color: '#666F68', fontSize: 10, lineHeight: 15, marginTop: 6 },
  cardLink: { color: colors.green, fontSize: 9, fontWeight: '700', marginTop: 'auto', paddingTop: 15 },
  cardLinkArrow: { fontSize: 13 },
  footerQuote: { marginTop: 24, backgroundColor: '#EFEFE8', borderRadius: 17, padding: 17, paddingLeft: 21 },
  quoteMark: { color: '#879789', fontFamily: 'Georgia', fontSize: 31, lineHeight: 28 },
  quoteText: { color: colors.ink, fontFamily: 'Georgia', fontSize: 15, lineHeight: 22, marginTop: 3 },
  quoteByline: { color: colors.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1.1, marginTop: 11 },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(25,36,29,0.42)' },
  sheetScroll: { flexGrow: 0, maxHeight: '92%' },
  sheetScrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: { minHeight: '79%', backgroundColor: colors.background, borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingTop: 10, paddingHorizontal: 22, paddingBottom: 18 },
  sheetHandle: { width: 38, height: 4, borderRadius: 3, alignSelf: 'center', backgroundColor: '#D4D5CE', marginBottom: 19 },
  closeButton: { position: 'absolute', top: 21, right: 22, zIndex: 2, width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EBEBE4' },
  closeText: { fontSize: 25, lineHeight: 27, color: colors.ink },
  eyebrow: { color: colors.green, letterSpacing: 1.5, fontSize: 9, fontWeight: '700', marginTop: 8 },
  sheetTitle: { fontFamily: 'Georgia', color: colors.ink, fontSize: 27, marginTop: 11 },
  sheetSubtitle: { fontSize: 12, color: colors.muted, marginTop: 7 },
  moodOptions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 26, marginBottom: 23 },
  moodOption: { width: '19%', minHeight: 73, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', gap: 7 },
  moodOptionSelected: { backgroundColor: colors.paleGreen, borderColor: '#668270' },
  moodFace: { fontSize: 22 },
  moodLabel: { color: colors.muted, fontSize: 8, textAlign: 'center' },
  moodLabelSelected: { color: colors.green, fontWeight: '700' },
  inputLabel: { color: colors.ink, fontWeight: '600', fontSize: 11 },
  optional: { color: colors.muted, fontSize: 8, letterSpacing: 0.8 },
  noteInput: { minHeight: 91, maxHeight: 130, marginTop: 10, borderRadius: 14, borderColor: colors.line, borderWidth: 1, backgroundColor: '#FFFFFF', padding: 13, color: colors.ink, fontSize: 12 },
  primaryButton: { minHeight: 49, borderRadius: 25, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: 17 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  privacyNote: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 12 },
  errorText: { color: colors.red, fontSize: 11, lineHeight: 16, marginTop: 9 },
  chatPage: { flex: 1, backgroundColor: colors.background },
  messageScroll: { flex: 1, minHeight: 0 },
  chatHeader: { minHeight: 67, borderBottomWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, gap: 10 },
  backButton: { width: 32, height: 38, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: colors.ink, fontSize: 34, lineHeight: 37 },
  chatAvatar: { width: 37, height: 37, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  avatarMark: { color: '#FFFFFF', fontFamily: 'Georgia', fontSize: 24 },
  chatHeading: { flex: 1 },
  chatTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  chatSubtitle: { color: colors.muted, fontSize: 10, marginTop: 3 },
  onlineDot: { color: '#6D9A73', fontSize: 11, marginRight: 4 },
  messageList: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, gap: 11 },
  chatDate: { color: colors.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1.1, textAlign: 'center', marginBottom: 12 },
  messageBubble: { maxWidth: '83%', borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 5, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 5, backgroundColor: colors.green },
  messageText: { color: colors.ink, fontSize: 13, lineHeight: 20 },
  userMessageText: { color: '#FFFFFF' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { color: colors.muted, fontSize: 11 },
  chatDisclaimer: { alignItems: 'center', paddingVertical: 9 },
  disclaimerText: { color: colors.muted, fontSize: 9 },
  composerRow: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingHorizontal: 15, paddingTop: 10, paddingBottom: 8, borderTopWidth: 1, borderColor: colors.line },
  composerInput: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, paddingVertical: 11, fontSize: 12, color: colors.ink },
  sendButton: { height: 42, width: 42, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  sendButtonDisabled: { backgroundColor: '#A8B1A9' },
  sendButtonText: { color: '#FFFFFF', fontSize: 23, lineHeight: 27 },
  breathingScrim: { flex: 1, backgroundColor: '#344F43', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25 },
  breathingEyebrow: { color: '#D2DED3', fontSize: 9, letterSpacing: 1.7, fontWeight: '700' },
  breathingTitle: { color: '#FFFFFF', fontFamily: 'Georgia', fontSize: 27, textAlign: 'center', lineHeight: 36, marginTop: 18 },
  breathingOrb: { marginTop: 36, width: 168, height: 168, borderRadius: 90, backgroundColor: '#557463', alignItems: 'center', justifyContent: 'center' },
  breathingOrbInner: { width: 104, height: 104, borderRadius: 55, backgroundColor: '#A4B6A3', opacity: 0.8 },
  breathingPrompt: { color: '#FFFFFF', fontFamily: 'Georgia', fontSize: 21, marginTop: 30 },
  breathingHint: { color: '#D3DFD5', fontSize: 10, marginTop: 8, textAlign: 'center' },
  breathingButton: { minWidth: 150, height: 45, borderRadius: 24, backgroundColor: '#F6F5F0', alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  breathingButtonText: { color: colors.green, fontSize: 12, fontWeight: '700' },
});
