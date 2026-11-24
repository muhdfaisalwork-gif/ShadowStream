/**
 * Gemma4Assistant.js
 * Cross-Platform AI Assistant UI for ShadowStream (Web, Android, iOS, Desktop)
 * Powered by Groq Cloud AI Gateway (/api/v1/ai/frontend-gateway)
 *
 * Uses pure React Native primitives (no DOM elements or CSS imports) so it
 * renders cleanly across Expo Web, Android APK, iOS IPA, and Electron.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
    useWindowDimensions,
} from 'react-native';
import {
    getCurrentScreenMode,
    setScreenModeFromAssistant,
} from '../utils/assistantBridge';

export default function Gemma4Assistant({ onSetScreenMode, currentScreenMode }) {
    const { width, height } = useWindowDimensions();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content:
                "Hi! I'm ShadowStream Copilot (powered by Groq AI). Looking for movie or TV show recommendations from our 204k+ titles, or want to switch screen modes (Fit, Fill, Full, Crop, Stretch)?",
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollViewRef = useRef(null);

    useEffect(() => {
        if (isOpen && scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd?.({ animated: true });
            }, 60);
        }
    }, [messages, isOpen]);

    const resolveApiBase = () => {
        if (
            Platform.OS === 'web' &&
            typeof window !== 'undefined' &&
            window.location &&
            window.location.origin
        ) {
            const origin = window.location.origin;
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return 'http://localhost:5000';
            }
            return '';
        }
        return 'https://ssmoviestvs.site';
    };

    const handleScreenModeCommand = (mode, description) => {
        setScreenModeFromAssistant(mode);
        if (typeof onSetScreenMode === 'function') {
            onSetScreenMode(mode);
        }
        setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: description },
        ]);
        setIsLoading(false);
    };

    const handleSend = async () => {
        const query = input.trim();
        if (!query || isLoading) return;

        const newMessages = [...messages, { role: 'user', content: query }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        // Instant screen mode controls synchronized with ShadowStreamPlayer
        const lower = query.toLowerCase();
        if (/\bfill\b/.test(lower)) {
            return handleScreenModeCommand(
                'fill',
                'Switched player screen mode to Fill (content fills viewport, zero black bars).'
            );
        }
        if (/\bfull\b/.test(lower)) {
            return handleScreenModeCommand(
                'full',
                'Switched player screen mode to Full (immersive 1.08x full viewport overscan).'
            );
        }
        if (/\bcrop\b/.test(lower)) {
            return handleScreenModeCommand(
                'crop',
                'Switched player screen mode to Crop (2.39:1 scope cinema crop).'
            );
        }
        if (/\bstretch\b/.test(lower)) {
            return handleScreenModeCommand(
                'stretch',
                'Switched player screen mode to Stretch (full viewport anamorphic stretch).'
            );
        }
        if (/\bfit\b/.test(lower)) {
            return handleScreenModeCommand(
                'fit',
                'Switched player screen mode to Fit (original aspect ratio with letterboxing).'
            );
        }

        try {
            const apiBase = resolveApiBase();
            const res = await fetch(`${apiBase}/api/v1/ai/frontend-gateway`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: query,
                    conversation: newMessages.slice(-4),
                    context: {
                        currentScreenMode: currentScreenMode || getCurrentScreenMode(),
                        platform: Platform.OS,
                    },
                }),
            });

            if (!res.ok) {
                throw new Error(`Gateway returned HTTP ${res.status}`);
            }

            const data = await res.json();
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content:
                        data.reply ||
                        "I couldn't process that recommendation right now, but feel free to search titles above!",
                },
            ]);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content:
                        "I'm ready to help with recommendations or screen controls. Try searching for genres like 'Action sci-fi movies' or saying 'switch to fill screen'!",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const windowCard = (
        <View
            style={[
                styles.window,
                {
                    width: Math.min(350, Math.max(260, width - 32)),
                    height: Math.min(460, Math.max(300, height - 110)),
                },
            ]}
        >
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <View style={styles.statusDot} />
                    <Text style={styles.headerTitle}>
                        ShadowStream Copilot • Groq AI
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => setIsOpen(false)}
                    style={styles.closeBtn}
                    accessibilityLabel="Close Assistant"
                >
                    <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesScroll}
                contentContainerStyle={styles.messagesContainer}
            >
                {messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    return (
                        <View
                            key={idx}
                            style={[
                                styles.msgRow,
                                isUser ? styles.msgRowUser : styles.msgRowAssistant,
                            ]}
                        >
                            <View
                                style={[
                                    styles.msgBubble,
                                    isUser
                                        ? styles.msgBubbleUser
                                        : styles.msgBubbleAssistant,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.msgText,
                                        isUser
                                            ? styles.msgTextUser
                                            : styles.msgTextAssistant,
                                    ]}
                                >
                                    {m.content}
                                </Text>
                            </View>
                        </View>
                    );
                })}
                {isLoading && (
                    <View style={[styles.msgRow, styles.msgRowAssistant]}>
                        <View style={[styles.msgBubble, styles.msgBubbleAssistant]}>
                            <Text style={styles.thinkingText}>
                                Searching ShadowStream catalog with Groq AI...
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask for movies, series, or screen modes..."
                    placeholderTextColor="#6b7280"
                    value={input}
                    onChangeText={setInput}
                    editable={!isLoading}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                />
                <TouchableOpacity
                    style={[
                        styles.sendBtn,
                        (isLoading || !input.trim()) && styles.sendBtnDisabled,
                    ]}
                    onPress={handleSend}
                    disabled={isLoading || !input.trim()}
                    accessibilityLabel="Send Message"
                >
                    <Text style={styles.sendBtnText}>➤</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View
            pointerEvents="box-none"
            style={[
                styles.container,
                Platform.OS === 'web' && styles.webFixedContainer,
            ]}
        >
            {!isOpen && (
                <TouchableOpacity
                    style={styles.bubble}
                    onPress={() => setIsOpen(true)}
                    activeOpacity={0.85}
                    accessibilityLabel="Open ShadowStream Assistant"
                >
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>AI Copilot</Text>
                    </View>
                    <Text style={styles.bubbleIcon}>✦</Text>
                </TouchableOpacity>
            )}

            {isOpen &&
                (Platform.OS === 'ios' ? (
                    <KeyboardAvoidingView behavior="padding">
                        {windowCard}
                    </KeyboardAvoidingView>
                ) : (
                    windowCard
                ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        elevation: 20,
    },
    webFixedContainer: {
        position: 'fixed',
    },
    bubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#6366f1',
        borderRadius: 30,
        paddingVertical: 10,
        paddingHorizontal: 16,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
    },
    badge: {
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    bubbleIcon: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    window: {
        width: 340,
        height: 460,
        backgroundColor: '#11141c',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.75,
        shadowRadius: 24,
    },
    header: {
        backgroundColor: '#1a1e29',
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    headerTitle: {
        color: '#f3f4f6',
        fontSize: 13,
        fontWeight: '600',
    },
    closeBtn: {
        padding: 4,
    },
    closeBtnText: {
        color: '#9ca3af',
        fontSize: 16,
        fontWeight: '600',
    },
    messagesScroll: {
        flex: 1,
    },
    messagesContainer: {
        padding: 12,
        gap: 10,
    },
    msgRow: {
        maxWidth: '86%',
    },
    msgRowUser: {
        alignSelf: 'flex-end',
    },
    msgRowAssistant: {
        alignSelf: 'flex-start',
    },
    msgBubble: {
        paddingVertical: 9,
        paddingHorizontal: 13,
        borderRadius: 14,
    },
    msgBubbleUser: {
        backgroundColor: '#6366f1',
        borderBottomRightRadius: 3,
    },
    msgBubbleAssistant: {
        backgroundColor: '#232838',
        borderBottomLeftRadius: 3,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    msgText: {
        fontSize: 13,
        lineHeight: 19,
    },
    msgTextUser: {
        color: '#ffffff',
    },
    msgTextAssistant: {
        color: '#e5e7eb',
    },
    thinkingText: {
        fontSize: 13,
        fontStyle: 'italic',
        color: '#9ca3af',
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#181d27',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#0f131a',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        color: '#ffffff',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        fontSize: 13,
    },
    sendBtn: {
        backgroundColor: '#6366f1',
        borderRadius: 8,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#374151',
        opacity: 0.6,
    },
    sendBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
});
