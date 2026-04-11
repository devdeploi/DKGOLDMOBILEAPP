import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Modal, TouchableOpacity, Linking, Platform, BackHandler, ActivityIndicator } from 'react-native';
import { COLORS } from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { APIURL } from '../constants/api';
import packageJson from '../../package.json';

const IntroScreen = ({ onFinish }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateConfig, setUpdateConfig] = useState(null);
    const [checkingUpdate, setCheckingUpdate] = useState(true);

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

                if (data.minVersion && isVersionLower(currentVersion, data.minVersion)) {
                    setUpdateConfig(data);
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

        // Timer to finish
        const timer = setTimeout(() => {
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(onFinish);
        }, 3000);

        return () => clearTimeout(timer);
    };

    const handleUpdate = () => {
        if (updateConfig?.updateUrl) {
            Linking.openURL(updateConfig.updateUrl);
        }
    };

    const handleCloseApp = () => {
        if (Platform.OS === 'android') {
            BackHandler.exitApp();
        }
    };

    return (
        <LinearGradient
            colors={['#c1ab8eff', '#f2e07bff', '#915200']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }} style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../assets/DK.png')}
                        style={styles.logo}
                    />
                </View>

                <View style={styles.poweredByContainer}>
                    <Text style={styles.poweredBy}>Powered By</Text>
                    <Image
                        source={require('../../public/assests/Safpro-logo.png')}
                        style={styles.safproLogo}
                    />
                </View>
            </Animated.View>

            <Modal visible={showUpdateModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.updateCard}>
                        <Image source={require('../assets/DK.png')} style={styles.updateLogo} />
                        <Text style={styles.updateTitle}>Update Required</Text>
                        <Text style={styles.updateMessage}>
                            {updateConfig?.message || 'A new version of DK GOLD is available. Please update to continue using the app.'}
                        </Text>

                        <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
                            <Text style={styles.updateBtnText}>Update Now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeBtn} onPress={handleCloseApp}>
                            <Text style={styles.closeBtnText}>Exit App</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {checkingUpdate && (
                <View style={styles.checkingContainer}>
                    <Image source={require('../assets/DK.png')} style={styles.checkingLogo} />
                    <Text style={styles.checkingText}>Checking for updates...</Text>
                </View>
            )}
        </LinearGradient>
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
    logo: {
        width: 180,
        height: 120,
        resizeMode: 'contain',
    },
    poweredByContainer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 20,
    },
    poweredBy: {
        fontSize: 10,
        color: '#000000',
        fontWeight: 'bold',
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontStyle: 'italic',
        marginBottom: 5,
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
    updateCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 400
    },
    updateLogo: {
        width: 120,
        height: 80,
        marginBottom: 20,
        borderRadius: 40,
        objectFit:'contain'
    },
    updateTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#915200',
        marginBottom: 10
    },
    updateMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22
    },
    updateBtn: {
        backgroundColor: '#915200',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 12
    },
    updateBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    closeBtn: {
        paddingVertical: 10,
        width: '100%',
        alignItems: 'center'
    },
    closeBtnText: {
        color: '#999',
        fontSize: 14,
        fontWeight: '600'
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
        color: '#915200',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    }
});

export default IntroScreen;
