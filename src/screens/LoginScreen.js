/* eslint-disable react-native/no-inline-styles */
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    // SafeAreaView,

    ActivityIndicator,
    Image,
    Animated,
    LayoutAnimation,
    Platform,
    UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../styles/theme';
import { APIURL, BASE_URL } from '../constants/api';

import CustomAlert from '../components/CustomAlert';
import FCMService from '../services/FCMService';

const OTPInput = ({ value, onChange, refs, isLoading }) => {
    const handleOtpChange = (text, index) => {
        const newOtp = [...value];
        newOtp[index] = text;
        onChange(newOtp);

        if (text && index < 5) {
            refs[index + 1].current.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
            refs[index - 1].current.focus();
        }
    };

    return (
        <View style={styles.otpRow}>
            {value.map((digit, index) => (
                <TextInput
                    key={index}
                    ref={refs[index]}
                    style={styles.otpBox}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading}
                />
            ))}
        </View>
    );
};

const LoginScreen = ({ onLogin, onRegisterClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Login Mode: 'otp' or 'password'
    const [loginMode, setLoginMode] = useState('otp');
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [resendTimer, setResendTimer] = useState(0);


    useEffect(() => {
        if (Platform.OS === 'android') {
            if (UIManager.setLayoutAnimationEnabledExperimental) {
                UIManager.setLayoutAnimationEnabledExperimental(true);
            }
        }
    }, []);


    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer > 0]);

    const switchMode = (mode) => {
        if (mode === loginMode) return;
        const toValue = mode === 'otp' ? 0 : 1;

        Animated.timing(slideAnim, {
            toValue,
            duration: 300,
            useNativeDriver: false,
        }).start();

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setLoginMode(mode);
    };

    // Merchant Login OTP State
    const [merchantLoginStep, setMerchantLoginStep] = useState(1);
    const [merchantOtp, setMerchantOtp] = useState(['', '', '', '', '', '']);
    const mOtpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    // Forgot Password State
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetStep, setResetStep] = useState(1);
    const [resetEmail, setResetEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
    const [generatedOtp, setGeneratedOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    // const [resendTimer, setResendTimer] = useState(0); (Moved up)

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

    const handleLogin = async () => {
        console.log('Attempting login to:', `${APIURL}/users/login`);
        console.log('Using APIURL:', APIURL);
        // If Phone regex logic needed, can be added. Backend handles "email" field as identifier usually.
        if (password.length === 0 && loginMode === 'password') {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter password', type: 'error' });
            return;
        }

        setIsLoading(true);

        try {
            // Diagnostic Ping
            try {
                const ping = await axios.get(BASE_URL, { timeout: 5000 });
                console.log('Diagnostic Ping Success:', ping.data);
            } catch (pErr) {
                console.log('Diagnostic Ping Error:', pErr.message);
            }

            // Try User/Admin Login first if password mode
            // Note: Users currently only have password login.
            if (loginMode === 'password') {
                try {
                    const { data } = await axios.post(`${APIURL}/users/login`, { email, password });
                    console.log('User Login Success:', data);

                    if (data.role === 'admin') {
                        setAlertConfig({ visible: true, title: 'Access Denied', message: 'Admin login is not allowed on mobile.', type: 'error' });
                        setIsLoading(false);
                        return;
                    }

                    await FCMService.registerToken(data._id, data.role, data.token);
                    FCMService.displayLocalNotification('Welcome Back!', `Welcome back, ${data.name || 'User'}!`);
                    onLogin(data.role, data);
                    return; // Success
                } catch (err) {
                    console.log('User Login Error:', err.response?.data || err.message);
                    // Fallthrough to Merchant check
                }
            }

            // Merchant Login
            try {
                // If OTP Mode, we don't call login yet, we called send-otp.
                // But if we are here in handleLogin, it implies Password mode login for merchant
                // OR we are reusing this function? 
                // Let's separate it. This function is for Password Login button.

                const { data } = await axios.post(`${APIURL}/merchants/login`, {
                    email,
                    password,
                    platform: Platform.OS
                });
                console.log('Merchant Login Success:', data);



                if (data.otpSent) {
                    setMerchantLoginStep(2);
                    setAlertConfig({ visible: true, title: 'OTP Sent', message: `Verification code sent to ${email} `, type: 'success' });
                } else {
                    // Check for Grace period warning
                    if (data.isGracePeriod) {
                        setAlertConfig({ visible: true, title: 'Warning', message: 'Your subscription has expired. You are in a grace period.', type: 'warning' });
                    }
                    await FCMService.registerToken(data._id, 'merchant', data.token);
                    FCMService.displayLocalNotification('Merchant Login', `Welcome back, ${data.name || 'Merchant'}!`);
                    onLogin('merchant', data);
                }
            } catch (err) {
                console.log('Merchant Login Error:', err.response?.data || err.message);
                // If password mode failed for both
                const msg = err.response?.data?.message || 'Invalid credentials';
                setAlertConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
            }
        } catch (error) {
            console.error('Login Error:', error);
            setAlertConfig({ visible: true, title: 'Error', message: 'Login failed', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendLoginOtp = async () => {
        if (!email) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter email or phone', type: 'error' });
            return;
        }
        setIsLoading(true);
        try {
            const response = await axios.post(`${APIURL}/merchants/send-login-otp`, { email });
            console.log('Send Login OTP Success:', response.data);
            setMerchantLoginStep(2); // Move to OTP entry
            setResendTimer(60);
            setAlertConfig({ visible: true, title: 'Success', message: response.data.message || 'OTP Sent successfully', type: 'success' });
        } catch (error) {
            console.log('Send Login OTP Error:', error.response?.data || error.message);
            const msg = error.response?.data?.message || 'Failed to send OTP. Check if registered.';
            setAlertConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMerchantVerifyOtp = async () => {
        const otpString = merchantOtp.join('');
        if (otpString.length !== 6) {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter a 6-digit OTP', type: 'error' });
            return;
        }
        setIsLoading(true);
        try {
            const { data } = await axios.post(`${APIURL}/merchants/verify-login-otp`, {
                email,
                otp: otpString,
                platform: Platform.OS
            });
            console.log('Verify Merchant OTP Success:', data);



            await FCMService.registerToken(data._id, data.role, data.token);
            FCMService.displayLocalNotification('OTP Verified', 'Merchant login successful.');
            onLogin(data.role, data);
        } catch (err) {
            console.log('Verify Merchant OTP Error:', err.response?.data || err.message);
            console.log("error", err);

            const msg = err.response?.data?.message || 'Invalid OTP';
            setAlertConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOtp = async () => {
        if (resetEmail) {
            setIsLoading(true);
            try {
                const { data } = await axios.post(`${APIURL}/forgot-password`, { email: resetEmail });
                console.log('Forgot Password OTP Success:', data);
                setAlertConfig({ visible: true, title: 'OTP Sent', message: data.message || 'OTP sent to your registered email/phone', type: 'success' });
                setResetStep(2);
                setResendTimer(60);
            } catch (error) {
                console.log('Forgot Password OTP Error:', error.response?.data || error.message);
                const msg = error.response?.data?.message || 'Failed to send OTP. Account not found.';
                setAlertConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
            } finally {
                setIsLoading(false);
            }
        } else {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter email or phone', type: 'error' });
        }
    };

    const handleVerifyOtp = async () => {
        const otpString = otp.join('');
        if (otpString.length === 6) {
            setIsLoading(true);
            try {
                const response = await axios.post(`${APIURL}/verify-otp`, { email: resetEmail, otp: otpString });
                console.log('Verify OTP Success:', response.data);
                setResetStep(3);
            } catch (error) {
                console.log('Verify OTP Error:', error.response?.data || error.message);
                const msg = error.response?.data?.message || 'Invalid or expired OTP';
                setAlertConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
            } finally {
                setIsLoading(false);
            }
        } else {
            setAlertConfig({ visible: true, title: 'Error', message: 'Please enter a 6-digit OTP', type: 'error' });
        }
    };

    const handleResetPassword = async () => {
        if (newPassword === confirmNewPassword && newPassword.length >= 6) {
            setIsLoading(true);
            try {
                const { data } = await axios.post(`${APIURL}/reset-password`, {
                    email: resetEmail,
                    otp: otp.join(''),
                    newPassword
                });
                console.log('Reset Password Success:', data);
                setAlertConfig({
                    visible: true,
                    title: 'Success',
                    message: data.message || 'Password reset successful',
                    type: 'success',
                    buttons: [{
                        text: 'OK',
                        onPress: () => {
                            setIsForgotPassword(false);
                            setResetStep(1);
                            setResetEmail('');
                            setNewPassword('');
                            setConfirmNewPassword('');
                            setOtp(['', '', '', '', '', '']);
                            setResendTimer(0);
                            hideAlert();
                        }
                    }]
                });
            } catch (error) {
                const msg = error.response?.data?.message || 'Failed to reset password';
                setAlertConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
            } finally {
                setIsLoading(false);
            }
        } else {
            const msg = newPassword.length < 6 ? 'Password must be at least 6 characters' : 'Passwords do not match';
            setAlertConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
        }
    };

    if (isForgotPassword) {
        return (
            <LinearGradient
                colors={['#c1ab8eff', '#f2e07bff', '#915200']}
                start={{ x: 1, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.card}>
                        <Image source={require('../assets/DK.png')} style={styles.logo} />
                            <Text style={styles.title}>Reset Password</Text>
                            {/* <Text style={styles.subtitle}>Enter details to reset</Text> */}

                            {resetStep === 1 && (
                                <>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter registered email or phone"
                                        placeholderTextColor={COLORS?.textSecondary}
                                        value={resetEmail}
                                        onChangeText={setResetEmail}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={isLoading}>
                                        {isLoading ? (
                                            <ActivityIndicator color={COLORS?.white} />
                                        ) : (
                                            <Text style={styles.buttonText}>Send OTP</Text>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => {
                                        setIsForgotPassword(false);
                                        setResendTimer(0);
                                    }} style={styles.linkButton}>
                                        <Text style={styles.linkText}>Back to Login</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {resetStep === 2 && (
                                <>
                                    <Text style={styles.infoText}>OTP sent to {resetEmail}</Text>
                                    <OTPInput
                                        value={otp}
                                        onChange={setOtp}
                                        refs={otpRefs}
                                        isLoading={isLoading}
                                    />
                                    <TouchableOpacity style={[styles.button, { marginTop: 15 }]} onPress={handleVerifyOtp} disabled={isLoading}>
                                        {isLoading ? (
                                            <ActivityIndicator color={COLORS?.white} />
                                        ) : (
                                            <Text style={styles.buttonText}>Verify OTP</Text>
                                        )}
                                    </TouchableOpacity>

                                    <View style={styles.rowContainer}>
                                        <TouchableOpacity
                                            onPress={resendTimer > 0 ? null : handleSendOtp}
                                            style={styles.linkButton}
                                            disabled={resendTimer > 0}
                                        >
                                            <Text style={[
                                                styles.linkText,
                                                { color: resendTimer > 0 ? COLORS?.textSecondary : COLORS?.primary, textDecorationLine: 'none' }
                                            ]}>
                                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={() => {
                                            setIsForgotPassword(false);
                                            setResendTimer(0);
                                        }} style={styles.linkButton}>
                                            <Text style={styles.linkText}>Back to Login</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}

                            {resetStep === 3 && (
                                <>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={[styles.input, { marginBottom: 0, flex: 1, borderRightWidth: 0, backgroundColor: 'transparent' }]}
                                            placeholder="New Password"
                                            placeholderTextColor={COLORS?.textSecondary}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showNewPassword}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setShowNewPassword(!showNewPassword)}
                                        >
                                            <Icon name={showNewPassword ? 'eye' : 'eye-slash'} size={20} color={COLORS?.textSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={[styles.input, { marginBottom: 0, flex: 1, borderRightWidth: 0, backgroundColor: 'transparent' }]}
                                            placeholder="Confirm New Password"
                                            placeholderTextColor={COLORS?.textSecondary}
                                            value={confirmNewPassword}
                                            onChangeText={setConfirmNewPassword}
                                            secureTextEntry={!showConfirmNewPassword}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                        >
                                            <Icon name={showConfirmNewPassword ? 'eye' : 'eye-slash'} size={20} color={COLORS?.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={isLoading}>
                                        {isLoading ? (
                                            <ActivityIndicator color={COLORS?.white} />
                                        ) : (
                                            <Text style={styles.buttonText}>Reset Password</Text>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => {
                                        setIsForgotPassword(false);
                                        setResendTimer(0);
                                    }} style={styles.linkButton}>
                                        <Text style={styles.linkText}>Back to Login</Text>
                                    </TouchableOpacity>
                                </>
                            )}
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
            </LinearGradient >
        );
    }

    return (
        <LinearGradient
            colors={['#c1ab8eff', '#f2e07bff', '#915200']}
            start={{ x: 1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.card}>
                        <Image source={require('../assets/DK.png')} style={styles.logo} />
                        {/* <Text style={styles.appTitle}>DK GOLD</Text> */}
                        <Text style={styles.title}>SIGN IN</Text>
                        {/* <Text style={styles.subtitle}> </Text> */}

                        {merchantLoginStep === 1 ? (
                            <>
                                {/* Login Mode Tabs */}
                                <View style={styles.tabContainer}>
                                    <Animated.View style={[
                                        styles.activeTabIndicator,
                                        {
                                            left: slideAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '50%']
                                            })
                                        }
                                    ]} />
                                    <TouchableOpacity
                                        style={styles.tab}
                                        onPress={() => switchMode('otp')}
                                    >
                                        <Animated.Text style={[styles.tabText, {
                                            color: slideAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [COLORS?.white, COLORS?.primary]
                                            })
                                        }]}>OTP Login</Animated.Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.tab}
                                        onPress={() => switchMode('password')}
                                    >
                                        <Animated.Text style={[styles.tabText, {
                                            color: slideAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [COLORS?.primary, COLORS?.white]
                                            })
                                        }]}>Password</Animated.Text>
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter email or phone"
                                    placeholderTextColor={COLORS?.textSecondary}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                />

                                {loginMode === 'password' && (
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={[styles.input, { marginBottom: 0, flex: 1, borderRightWidth: 0, backgroundColor: 'transparent' }]}
                                            placeholder="Password"
                                            placeholderTextColor={COLORS?.textSecondary}
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setShowPassword(!showPassword)}
                                        >
                                            <Icon name={showPassword ? 'eye' : 'eye-slash'} size={20} color={COLORS?.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={loginMode === 'password' ? handleLogin : handleSendLoginOtp}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={COLORS?.white} />
                                    ) : (
                                        <Text style={styles.buttonText}>
                                            {loginMode === 'password' ? 'Login' : 'Get OTP'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.infoText}>Enter OTP sent to {email}</Text>
                                <OTPInput
                                    value={merchantOtp}
                                    onChange={setMerchantOtp}
                                    refs={mOtpRefs}
                                    isLoading={isLoading}
                                />
                                <TouchableOpacity style={[styles.button, { marginTop: 15 }]} onPress={handleMerchantVerifyOtp} disabled={isLoading}>
                                    {isLoading ? (
                                        <ActivityIndicator color={COLORS?.white} />
                                    ) : (
                                        <Text style={styles.buttonText}>Verify & Login</Text>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.rowContainer}>
                                    <TouchableOpacity
                                        onPress={resendTimer > 0 ? null : handleSendLoginOtp}
                                        style={styles.linkButton}
                                        disabled={resendTimer > 0}
                                    >
                                        <Text style={[
                                            styles.linkText,
                                            { color: resendTimer > 0 ? COLORS?.textSecondary : COLORS?.primary, textDecorationLine: 'none' }
                                        ]}>
                                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={() => {
                                        setMerchantLoginStep(1);
                                        setResendTimer(0);
                                    }} style={styles.linkButton}>
                                        <Text style={styles.linkText}>Back to Login</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        <View style={[styles.rowContainer, { marginTop: 20 }]}>
                            <TouchableOpacity onPress={() => setIsForgotPassword(true)} style={styles.linkButton}>
                                <Text style={[styles.linkText, { color: COLORS?.textSecondary, textDecorationLine: 'none' }]}>Forgot Password?</Text>
                            </TouchableOpacity>

                            <View style={[styles.footer, { marginTop: 5 }]}>
                                <TouchableOpacity onPress={onRegisterClick}>
                                    <Text style={styles.registerLink}>New User!</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        {/* <Text style={styles.envInfo}>
                        (Use 'merchant@test.com' for Merchant, else User)
                    </Text> */}
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
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: COLORS?.glass,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS?.glassBorder,
        alignItems: 'center',
    },
    headerIcon: {
        marginBottom: 20,
    },
    logo: {
        width: 160,
        height: 100,
        marginBottom: 10,
        resizeMode: 'contain'
    },
    appTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS?.primary,
        letterSpacing: 2,
        marginBottom: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS?.textPrimary,
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS?.textSecondary,
    },
    input: {
        width: '100%',
        backgroundColor: COLORS?.inputBackground,
        borderRadius: 10,
        padding: 15,
        color: COLORS?.textPrimary,
        marginBottom: 15,
    },
    passwordContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS?.inputBackground,
        borderRadius: 10,
        marginBottom: 15,
    },
    eyeIcon: {
        padding: 10,
    },
    button: {
        width: '100%',
        backgroundColor: COLORS?.primary,
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonText: {
        color: COLORS?.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    linkButton: {
        marginBottom: 10,
        marginTop: 5,
    },
    linkText: {
        color: COLORS?.textPrimary,
        textDecorationLine: 'underline',
    },
    footer: {
        flexDirection: 'row',
        marginTop: 20,
    },
    footerText: {
        color: COLORS?.textSecondary,
    },
    registerLink: {
        color: COLORS?.textPrimary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    infoText: {
        color: COLORS?.textPrimary,
        marginBottom: 10,
    },
    envInfo: {
        color: COLORS?.textSecondary,
        marginTop: 10,
        fontSize: 10,
        textAlign: 'center'
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: COLORS?.inputBackground,
        borderRadius: 12,
        height: 50,
        position: 'relative',
        overflow: 'hidden',
    },
    activeTabIndicator: {
        position: 'absolute',
        width: '50%',
        height: '100%',
        backgroundColor: COLORS?.primary,
        borderRadius: 12,
    },
    tab: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    tabText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
        paddingHorizontal: 5,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginVertical: 10,
    },
    otpBox: {
        width: 45,
        height: 55,
        backgroundColor: COLORS?.white,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS?.primary, // Using primary gold for high contrast
        textAlign: 'center',
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS?.textPrimary,
        elevation: 3, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
});

export default LoginScreen;
