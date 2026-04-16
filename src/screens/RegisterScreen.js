/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Image,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { COLORS } from '../styles/theme';
import { APIURL } from '../constants/api';
import Icon from 'react-native-vector-icons/FontAwesome5';
import CustomAlert from '../components/CustomAlert';
import FCMService from '../services/FCMService';
import TermsAndConditions from '../components/TermsAndConditions';
import UserPolicy from '../components/UserPolicy';

const RegisterScreen = ({ onRegister, onSwitchToLogin }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // OTP & Step State
    const [step, setStep] = useState(1);
    const [otp, setOtp] = useState('');

    // Password Strength State
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '#E2E8F0' });

    useEffect(() => {
        calculatePasswordStrength(password);
    }, [password]);

    const calculatePasswordStrength = (pass) => {
        let score = 0;
        if (!pass) {
            setPasswordStrength({ score: 0, label: '', color: '#E2E8F0' });
            return;
        }

        if (pass.length > 5) score += 1;
        if (pass.length > 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        let label = 'Weak';
        let color = '#FC8181'; // Red

        if (score >= 4) {
            label = 'Strong';
            color = '#48BB78'; // Green
        } else if (score >= 2) {
            label = 'Medium';
            color = '#ECC94B'; // Yellow
        }

        setPasswordStrength({ score, label, color });
    };

    // Terms & Policy State
    const [isTermsAccepted, setIsTermsAccepted] = useState(false);
    const [isPolicyAccepted, setIsPolicyAccepted] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPolicy, setShowPolicy] = useState(false);

    // Derived State for Main Checkbox
    const isCommonAccepted = isTermsAccepted && isPolicyAccepted;

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        buttons: []
    });

    const hideAlert = () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    };

    const handleSendOtp = async () => {
        if (!phone || !password) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please fill all required fields', type: 'error' });
            return;
        }
        if (phone.length !== 10) {
            setAlertConfig({ visible: true, title: 'Invalid Phone', message: 'Phone number must be exactly 10 digits.', type: 'warning' });
            return;
        }
        if (password !== confirmPassword) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Passwords do not match', type: 'error' });
            return;
        }
        if (!isCommonAccepted) {
            setAlertConfig({ visible: true, title: 'Required', message: 'Please read and accept both Terms & Conditions and User Policy to proceed.', type: 'warning' });
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${APIURL}/merchants/send-reg-otp`, { phone });
            setAlertConfig({
                visible: true,
                title: 'OTP Sent',
                message: `A 6-digit OTP has been sent to +91 ${phone}`,
                type: 'success',
                buttons: [{ text: 'OK', onPress: () => setStep(2) }]
            });
        } catch (error) {
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: error.response?.data?.message || 'Failed to send OTP. Please try again.',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyAndRegister = async () => {
        if (otp.length !== 6) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter the 6-digit OTP', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            // 1. Verify OTP
            await axios.post(`${APIURL}/merchants/verify-reg-otp`, { phone, otp });

            // 2. Create account
            const { data } = await axios.post(`${APIURL}/users`, {
                name: 'New User',
                phone,
                password,
                role: 'user'
            });

            setAlertConfig({
                visible: true,
                title: 'Welcome!',
                message: 'Account created successfully! Please complete your profile.',
                type: 'success',
                buttons: [{
                    text: 'Continue',
                    onPress: () => {
                        FCMService.displayLocalNotification('Welcome to DK Gold', 'Your account has been created successfully!');
                        onRegister(data);
                    }
                }]
            });
        } catch (error) {
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: error.response?.data?.message || 'Verification failed. Please try again.',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#f2e07bff', '#c1ab8eff', '#915200']}
            start={{ x: 1, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <Image source={require('../assets/DK.png')} style={styles.logo} />

                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.subtitle}>
                                {step === 1 ? 'Start your journey with DK Gold' : `Enter the OTP sent to +91 ${phone}`}
                            </Text>
                        </View>

                        {step === 1 ? (
                            <>

                        <View style={styles.inputGroup}>
                            <View style={styles.iconInputContainer}>
                                <Icon name="phone-alt" size={16} color={COLORS?.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Phone Number (10 digits)"
                                    placeholderTextColor="#A0AEC0"
                                    value={phone}
                                    onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                />
                            </View>
                        </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.iconInputContainer}>
                                        <Icon name="lock" size={16} color={COLORS?.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Password"
                                            placeholderTextColor="#A0AEC0"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setShowPassword(!showPassword)}
                                        >
                                            <Icon name={showPassword ? 'eye' : 'eye-slash'} size={18} color="#A0AEC0" />
                                        </TouchableOpacity>
                                    </View>
                                    {/* Password Strength Indicator */}
                                    {password.length > 0 && (
                                        <View style={styles.strengthContainer}>
                                            <View style={styles.strengthBarContainer}>
                                                <View
                                                    style={[
                                                        styles.strengthBar,
                                                        {
                                                            width: `${(passwordStrength.score / 5) * 100}%`,
                                                            backgroundColor: passwordStrength.color
                                                        }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                                {passwordStrength.label}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.iconInputContainer}>
                                        <Icon name="lock" size={16} color={COLORS?.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Confirm Password"
                                            placeholderTextColor="#A0AEC0"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showConfirmPassword}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            <Icon name={showConfirmPassword ? 'eye' : 'eye-slash'} size={18} color="#A0AEC0" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {password && confirmPassword && password !== confirmPassword && (
                                    <View style={styles.messageContainer}>
                                        <Icon name="exclamation-circle" size={12} color={COLORS?.danger} />
                                        <Text style={styles.errorText}>Passwords do not match</Text>
                                    </View>
                                )}
                                {password && confirmPassword && password === confirmPassword && (
                                    <View style={styles.messageContainer}>
                                        <Icon name="check-circle" size={12} color={COLORS?.success} />
                                        <Text style={styles.successText}>Passwords match</Text>
                                    </View>
                                )}

                                {/* Terms & Policy Section */}
                                <View style={styles.agreementsContainer}>
                                    <Text style={styles.sectionHeader}>Required Agreements</Text>
                                    <TouchableOpacity style={styles.agreementRow} onPress={() => setShowTerms(true)} activeOpacity={0.7}>
                                        <View style={[styles.miniCheckbox, isTermsAccepted && styles.miniCheckboxChecked]}>
                                            {isTermsAccepted && <Icon name="check" size={10} color="#fff" />}
                                        </View>
                                        <Text style={[styles.linkText, isTermsAccepted && styles.linkTextChecked]}>Terms & Conditions</Text>
                                        <Icon name="chevron-right" size={12} color={COLORS?.textSecondary} style={styles.chevron} />
                                    </TouchableOpacity>

                                    <View style={styles.divider} />

                                    <TouchableOpacity style={styles.agreementRow} onPress={() => setShowPolicy(true)} activeOpacity={0.7}>
                                        <View style={[styles.miniCheckbox, isPolicyAccepted && styles.miniCheckboxChecked]}>
                                            {isPolicyAccepted && <Icon name="check" size={10} color="#fff" />}
                                        </View>
                                        <Text style={[styles.linkText, isPolicyAccepted && styles.linkTextChecked]}>Privacy Policy</Text>
                                        <Icon name="chevron-right" size={12} color={COLORS?.textSecondary} style={styles.chevron} />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[styles.button, !isCommonAccepted && styles.disabledButton]}
                                    onPress={handleSendOtp}
                                    disabled={isLoading || !isCommonAccepted}
                                    activeOpacity={0.8}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.buttonText}>Send OTP</Text>
                                            <Icon name="arrow-right" size={14} color="#fff" style={{ marginLeft: 8 }} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.otpContainer}>
                                    <Icon name="mobile-alt" size={36} color={COLORS?.primary} style={{ marginBottom: 16 }} />
                                    <Text style={styles.otpLabel}>Enter the 6-digit OTP sent to</Text>
                                    <Text style={[styles.otpLabel, { fontWeight: 'bold', color: COLORS?.primary }]}>+91 {phone}</Text>
                                    <TextInput
                                        style={styles.otpInput}
                                        placeholder="000000"
                                        placeholderTextColor="#CBD5E0"
                                        value={otp}
                                        onChangeText={setOtp}
                                        keyboardType="numeric"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleVerifyAndRegister}
                                    disabled={isLoading}
                                    activeOpacity={0.8}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>Verify & Create Account</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => { setStep(1); setOtp(''); }} style={styles.linkButton}>
                                    <Icon name="arrow-left" size={12} color={COLORS?.primary} style={{ marginRight: 6 }} />
                                    <Text style={styles.linkTextPrimary}>Back to Details</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={onSwitchToLogin}>
                                <Text style={styles.loginLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={hideAlert}
            />

            {/* Terms & Policy Modals */}
            <TermsAndConditions
                visible={showTerms}
                onClose={() => setShowTerms(false)}
                onAccept={() => {
                    setIsTermsAccepted(true);
                    setShowTerms(false);
                }}
            />
            <UserPolicy
                visible={showPolicy}
                onClose={() => setShowPolicy(false)}
                onAccept={() => {
                    setIsPolicyAccepted(true);
                    setShowPolicy(false);
                }}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    scrollContent: {
        padding: 20,
        justifyContent: 'center',
        flexGrow: 1,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 30,
        width: '100%',
        alignItems: 'stretch',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    logo: {
        width: 70,
        height: 70,
        alignSelf: 'center',
        marginBottom: 20,
        resizeMode: 'contain'
    },
    headerContainer: {
        marginBottom: 30,
        alignItems: 'center'
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS?.primary,
        marginBottom: 8,
        letterSpacing: 0.5
    },
    subtitle: {
        fontSize: 15,
        color: '#718096',
        letterSpacing: 0.3
    },
    inputGroup: {
        marginBottom: 16
    },
    iconInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EDF2F7',
        height: 56,
        paddingHorizontal: 16
    },
    inputIcon: {
        marginRight: 12,
        opacity: 0.7
    },
    input: {
        flex: 1,
        color: '#2D3748',
        fontSize: 15,
        height: '100%'
    },
    eyeIcon: {
        padding: 8
    },
    strengthContainer: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4
    },
    strengthBarContainer: {
        flex: 1,
        height: 4,
        backgroundColor: '#EDF2F7',
        borderRadius: 2,
        marginRight: 10,
        overflow: 'hidden'
    },
    strengthBar: {
        height: '100%',
        borderRadius: 2
    },
    strengthLabel: {
        fontSize: 11,
        fontWeight: 'bold'
    },
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4
    },
    errorText: {
        color: COLORS?.danger,
        fontSize: 13,
        marginLeft: 6
    },
    successText: {
        color: COLORS?.success,
        fontSize: 13,
        marginLeft: 6
    },
    agreementsContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#A0AEC0',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 10,
        marginTop: 5
    },
    agreementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8
    },
    divider: {
        height: 1,
        backgroundColor: '#EDF2F7',
        marginHorizontal: 10
    },
    miniCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#CBD5E0',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff'
    },
    miniCheckboxChecked: {
        backgroundColor: COLORS?.success,
        borderColor: COLORS?.success
    },
    linkText: {
        fontSize: 14,
        color: '#4A5568',
        flex: 1,
        fontWeight: '500'
    },
    linkTextChecked: {
        color: '#2D3748',
        fontWeight: '600'
    },
    chevron: {
        opacity: 0.4
    },
    disclaimerContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        paddingHorizontal: 4
    },
    disclaimerText: {
        fontSize: 12,
        color: '#718096',
        flex: 1,
        lineHeight: 18
    },
    button: {
        backgroundColor: COLORS?.primary,
        borderRadius: 16,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6
    },
    disabledButton: {
        backgroundColor: '#CBD5E0',
        shadowOpacity: 0
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 0.5
    },
    otpContainer: {
        alignItems: 'center',
        marginBottom: 30
    },
    otpLabel: {
        fontSize: 14,
        color: '#718096',
        marginBottom: 16
    },
    otpInput: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2D3748',
        letterSpacing: 8,
        borderBottomWidth: 2,
        borderBottomColor: COLORS?.primary,
        paddingBottom: 8,
        width: 200,
        textAlign: 'center'
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10
    },
    linkTextPrimary: {
        color: COLORS?.primary,
        fontWeight: '600',
        fontSize: 14
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10
    },
    footerText: {
        color: '#718096',
        fontSize: 14
    },
    loginLink: {
        color: COLORS?.primary,
        fontWeight: 'bold',
        fontSize: 14
    },
    logo: {
        width: 150,
        height: 100,
        resizeMode: 'contain',
        alignSelf: 'center',
    }
});

export default RegisterScreen;
