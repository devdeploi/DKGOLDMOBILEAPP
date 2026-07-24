import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Modal, TouchableOpacity, Linking, Platform, BackHandler, ActivityIndicator } from 'react-native';
import { COLORS } from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { APIURL } from '../constants/api';
import packageJson from '../../package.json';
import Video from 'react-native-video';

const IntroScreen = ({ onFinish }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateConfig, setUpdateConfig] = useState(null);
    const [checkingUpdate, setCheckingUpdate] = useState(true);
    const [updateType, setUpdateType] = useState('mandatory'); // 'mandatory' or 'optional'

    // Animation values for modal
    const modalScale = useRef(new Animated.Value(0)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (showUpdateModal) {
            // Reset animations
            textOpacity.setValue(0);
            textTranslateY.setValue(20);

            // Entrance animation sequence
            Animated.sequence([
                Animated.parallel([
                    Animated.spring(modalScale, {
                        toValue: 1,
                        friction: 8,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.timing(modalOpacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    })
                ]),
                Animated.parallel([
                    Animated.timing(textOpacity, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.spring(textTranslateY, {
                        toValue: 0,
                        friction: 8,
                        useNativeDriver: true,
                    })
                ])
            ]).start();

            // Continuous pulse animation for logo
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    })
                ])
            ).start();
        }
    }, [showUpdateModal]);

    useEffect(() => {
        const isVersionLower = (v1, v2) => {
            const p1 = v1.split('.').map(Number);
            const p2 = v2.split('.').map(Number);
            for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
                const n1 = p1[i] || 0;
                const n2 = p2[i] || 0;
                if (n1 < n2) return true;
                if (n1 > n2) return false;
            }
            return false;
        };

        const checkUpdate = async () => {
            try {
                const { data } = await axios.get(`${APIURL}/app/config`);
                const currentVersion = packageJson.version;

                // Case 1: Version is lower than minVersion (e.g. user has 1.1.2, min is 1.1.3)
                if (data.minVersion && isVersionLower(currentVersion, data.minVersion)) {
                    setUpdateConfig(data);
                    setUpdateType('mandatory');
                    setShowUpdateModal(true);
                    setCheckingUpdate(false);
                    return;
                }

                // Case 2: Version is one version back from latest (e.g. user has 1.1.3, latest is 1.1.4)
                if (data.latestVersion && isVersionLower(currentVersion, data.latestVersion)) {
                    setUpdateConfig(data);
                    setUpdateType('optional');
                    setShowUpdateModal(true);
                    setCheckingUpdate(false);
                    return;
                }

            } catch (error) {
                console.log('Update check failed:', error);
            }
            setCheckingUpdate(false);
            startAnimation();
        };

        checkUpdate();
    }, []);

    const startAnimation = () => {
        // Fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    };

    const handleVideoEnd = () => {
        if (updateType === 'mandatory' && showUpdateModal) {
            return;
        }
        if (onFinish) {
            onFinish();
        }
    };

    const handleUpdate = () => {
        if (updateConfig?.updateUrl) {
            Linking.openURL(updateConfig.updateUrl);
        }
    };

    const handleContinue = () => {
        Animated.parallel([
            Animated.timing(modalScale, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            setShowUpdateModal(false);
            startAnimation();
        });
    };

    const handleCloseApp = () => {
        if (Platform.OS === 'android') {
            BackHandler.exitApp();
        }
    };

    return (
        <View style={styles.container}>
            <Video
                source={require('../assets/DKGOLD.mp4')}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                onEnd={handleVideoEnd}
                repeat={false}
            />



            <Modal visible={showUpdateModal} transparent animationType="none">
                <View style={styles.modalOverlay}>
                    <Animated.View style={[
                        styles.updateCardContainer,
                        {
                            opacity: modalOpacity,
                            transform: [{ scale: modalScale }]
                        }
                    ]}>
                        <LinearGradient
                            colors={['#ffffff', '#fcf8f0']}
                            style={styles.updateCard}
                        >
                            <Animated.View style={[
                                styles.logoBadge,
                                { transform: [{ scale: pulseAnim }] }
                            ]}>
                                <Image source={require('../assets/DK.png')} style={styles.updateLogo} />
                            </Animated.View>

                            <Animated.View style={{
                                opacity: textOpacity,
                                transform: [{ translateY: textTranslateY }],
                                alignItems: 'center',
                                width: '100%'
                            }}>
                                <Text style={styles.updateTitle}>
                                    {updateType === 'mandatory' ? 'Update Required' : 'New Update Available'}
                                </Text>

                                <View style={styles.divider} />

                                <Text style={styles.updateMessage}>
                                    {updateType === 'mandatory'
                                        ? (updateConfig?.message || 'A new version of DK GOLD is available. Please update to continue using the app.')
                                        : 'A newer version of DK GOLD is available with enhanced features and performance improvements.'}
                                </Text>

                                <TouchableOpacity activeOpacity={0.8} onPress={handleUpdate} style={{ width: '100%', alignItems: 'center' }}>
                                    <LinearGradient
                                        colors={['#915200', '#7a4400']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.updateBtn}
                                    >
                                        <Text style={styles.updateBtnText}>Update Now</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                {updateType === 'mandatory' ? (
                                    <TouchableOpacity style={styles.closeBtn} onPress={handleCloseApp}>
                                        <Text style={styles.closeBtnText}>Exit App</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.closeBtn} onPress={handleContinue}>
                                        <Text style={styles.closeBtnText}>Continue to App</Text>
                                    </TouchableOpacity>
                                )}
                            </Animated.View>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Modal>


        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 50,
    },
    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoBox: {
        width: 180,
        height: 180,
        backgroundColor: '#92400E',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        shadowColor: '#1e1e14',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    logo: {
        width: 200,
        height: 100,
        resizeMode: 'contain',
    },
    poweredByContainer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 20,
    },
    poweredByLabel: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    poweredByBrand: {
        fontSize: 16,
        color: '#d4af37', // Gold accent
        fontWeight: '900',
        letterSpacing: 2,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    safproLogo: {
        width: 100,
        height: 50,
        resizeMode: 'contain',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    updateCardContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    updateCard: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 30,
        alignItems: 'center',
        width: '90%',
        maxWidth: 400,
        elevation: 20,
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(145, 82, 0, 0.1)'
    },
    logoBadge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        borderWidth: 2,
        borderColor: '#f2e07bff'
    },
    updateLogo: {
        width: 70,
        height: 70,
        resizeMode: 'contain'
    },
    updateTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS?.primary,
        marginBottom: 10,
        textAlign: 'center'
    },
    divider: {
        width: 50,
        height: 3,
        backgroundColor: '#f2e07bff',
        borderRadius: 2,
        marginBottom: 20
    },
    updateMessage: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginBottom: 35,
        lineHeight: 24,
        paddingHorizontal: 10
    },
    updateBtn: {
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 16,
        width: '100%',
        minWidth: 250,
        alignItems: 'center',
        elevation: 8,
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    updateBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
        textTransform: 'uppercase'
    },
    closeBtn: {
        marginTop: 20,
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center'
    },
    closeBtnText: {
        color: COLORS?.secondary,
        fontSize: 15,
        fontWeight: '600',
        textDecorationLine: 'underline'
    },
    checkingContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    checkingLogo: {
        width: 150,
        height: 100,
        resizeMode: 'contain',
        marginBottom: 16,
    },
    checkingText: {
        color: '#000000',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    }
});

export default IntroScreen;
