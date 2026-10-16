import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { COLORS } from '../theme/colors';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ShadowStream ErrorBoundary caught error]:', error, errorInfo);
    }

    handleReload = () => {
        if (typeof window !== 'undefined' && window.location) {
            window.location.href = '/';
        } else {
            this.setState({ hasError: false, error: null });
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.card}>
                        <Text style={styles.icon}>🎬</Text>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.message}>
                            An unexpected issue occurred while rendering this screen.
                        </Text>
                        {this.state.error?.message ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText} numberOfLines={3}>
                                    {String(this.state.error.message)}
                                </Text>
                            </View>
                        ) : null}
                        <TouchableOpacity style={styles.button} onPress={this.handleReload} activeOpacity={0.8}>
                            <Text style={styles.buttonText}>Return to Home</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg || '#0B0C10',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: COLORS.surface || '#16181F',
        borderWidth: 1,
        borderColor: COLORS.border || 'rgba(255, 255, 255, 0.12)',
        borderRadius: 12,
        padding: 28,
        alignItems: 'center',
        maxWidth: 440,
        width: '100%',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        color: COLORS.textPrimary || '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        color: COLORS.textMuted || '#9CA3AF',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    errorBox: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
        marginBottom: 20,
        width: '100%',
    },
    errorText: {
        color: '#F87171',
        fontSize: 12,
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: COLORS.brand || '#E50914',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
