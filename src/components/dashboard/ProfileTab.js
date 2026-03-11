/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    Image,
    RefreshControl,
    Platform,
    Dimensions,
    KeyboardAvoidingView
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { BASE_URL } from '../../constants/api';
import { COLORS } from '../../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Premium Gold Theme matches Dashboard
const THEME = {
    background: '#fffbf0',
    primary: '#ebdc87',
    primaryDark: '#915200',
    primaryLight: '#f3e9bd',
    cardBg: '#ffffff',
    text: '#2c2c2c',
    subText: '#666666',
    border: '#e2d183',
    danger: '#d32f2f'
};

const ProfileTab = ({ user, onUpdate, onUpdateImage, onLogout, onRefresh }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email || ''); // Add email state
    const [phone, setPhone] = useState(user.phone || '');
    const [address, setAddress] = useState(user.address || '');
    const [acc_no, setAccNo] = useState(user.acc_no || '');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeInput] = useState(new Animated.Value(0));

    const handleRefresh = async () => {
        if (onRefresh) {
            setRefreshing(true);
            await onRefresh();
            setRefreshing(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim() || phone.trim().length !== 10) {
            // Add proper alert or toast
            return;
        }
        setLoading(true);
        try {
            await onUpdate({ name, email, phone, address, acc_no }); // Send email
            setIsEditing(false);
        } catch (e) {
            console.log("Update failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.wrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <LinearGradient
                colors={['#c1ab8eff', '#f2e07bff', '#915200']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[THEME.primaryDark]}
                            tintColor={THEME.primaryDark}
                        />
                    }
                >
                    {/* Decorative Background Element */}
                    <View style={styles.cornerDecoration}>
                        <Image
                            source={require('../../assets/AURUM.png')}
                            style={{ width: 120, height: 60, opacity: 0.1, resizeMode: 'contain' }}
                        />
                    </View>

                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <View>
                            <Text style={styles.sectionTitle}>My Profile</Text>
                            <Text style={styles.sectionSubtitle}>Manage your personal details</Text>
                        </View>
                        {!isEditing && (
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => {
                                    setName(user.name);
                                    setEmail(user.email || ''); // Added email binding
                                    setPhone(user.phone || '');
                                    setAddress(user.address || '');
                                    setAccNo(user.acc_no || '');
                                    setIsEditing(true);
                                }}
                            >
                                <Icon name="pen" size={12} color={THEME.primaryDark} />
                                <Text style={styles.editButtonText}>EDIT</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Profile Completion */}
                    {(() => {
                        let completed = 0;
                        const total = 5;
                        if (user.name && user.name !== 'New User') completed++;
                        if (user.email) completed++;
                        if (user.phone) completed++;
                        if (user.address) completed++;
                        if (user.acc_no) completed++;

                        const progress = completed / total;
                        const percent = Math.round(progress * 100);

                        return (
                            <View style={styles.card}>
                                <View style={styles.progressHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Icon name="chart-pie" size={14} color={THEME.primaryDark} style={{ marginRight: 8 }} />
                                        <Text style={styles.cardTitle}>Profile Completion</Text>
                                    </View>
                                    <Text style={styles.progressPercent}>{percent}%</Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <LinearGradient
                                        colors={[THEME.primary, THEME.primaryDark]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.progressBarFill, { width: `${percent}%` }]}
                                    />
                                </View>
                                {percent < 100 && (
                                    <Text style={styles.progressNote}>Complete profile to unlock all features.</Text>
                                )}
                            </View>
                        );
                    })()}

                    {/* Main Profile Card */}
                    <View style={styles.card}>
                        <View style={styles.profileHeader}>
                            <TouchableOpacity onPress={onUpdateImage} disabled={!isEditing} style={styles.avatarContainer}>
                                <LinearGradient
                                    colors={[THEME.primary, THEME.background]}
                                    style={styles.avatarGradient}
                                >
                                    {user.profileImage ? (
                                        <Image
                                            source={{ uri: `${BASE_URL}${user.profileImage}` }}
                                            style={styles.avatarImage}
                                        />
                                    ) : (
                                        <Text style={styles.avatarText}>
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                        </Text>
                                    )}
                                </LinearGradient>
                                {isEditing && (
                                    <View style={styles.cameraBadge}>
                                        <Icon name="camera" size={12} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{user.role || 'User'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {isEditing ? (
                            <View style={styles.formContainer}>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Full Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={name}
                                        onChangeText={setName}
                                        placeholderTextColor="#aaa"
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Email Address</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        placeholderTextColor="#aaa"
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Phone Number</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={phone}
                                        onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
                                        keyboardType="phone-pad"
                                        placeholderTextColor="#aaa"
                                        maxLength={10}
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Address</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        value={address}
                                        onChangeText={setAddress}
                                        multiline
                                        numberOfLines={3}
                                        placeholderTextColor="#aaa"
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Account Number</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={acc_no}
                                        onChangeText={setAccNo}
                                        placeholderTextColor="#aaa"
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={() => setIsEditing(false)}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.saveBtn}
                                        onPress={handleSave}
                                        disabled={loading}
                                    >
                                        <View style={styles.saveBtnContent}>
                                            {loading ? (
                                                <ActivityIndicator color={THEME.primaryDark} size="small" />
                                            ) : (
                                                <Text style={styles.saveBtnText}>Save Changes</Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.detailsContainer}>
                                <View style={styles.detailRow}>
                                    <View style={styles.iconBox}>
                                        <Icon name="user" size={14} color={THEME.primaryDark} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailLabel}>Full Name</Text>
                                        <Text style={styles.detailValue}>{user.name}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <View style={styles.iconBox}>
                                        <Icon name="phone-alt" size={14} color={THEME.primaryDark} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailLabel}>Phone Number</Text>
                                        <Text style={styles.detailValue}>{user.phone || 'Not provided'}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <View style={styles.iconBox}>
                                        <Icon name="map-marker-alt" size={14} color={THEME.primaryDark} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailLabel}>Address</Text>
                                        <Text style={styles.detailValue}>{user.address || 'Not provided'}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <View style={styles.iconBox}>
                                        <Icon name="envelope" size={14} color={THEME.primaryDark} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailLabel}>Email Address</Text>
                                        <Text style={styles.detailValue}>{user.email}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <View style={styles.iconBox}>
                                        <Icon name="university" size={14} color={THEME.primaryDark} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailLabel}>Account Number</Text>
                                        <Text style={styles.detailValue}>{user.acc_no || 'Not provided'}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Logout Button Removed as requested */}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
    },
    cornerDecoration: {
        position: 'absolute',
        top: -10,
        right: -20,
        transform: [{ rotate: '15deg' }]
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: COLORS?.dark,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: THEME.border,
        shadowColor: THEME.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: THEME.primaryDark,
        marginLeft: 6,
    },
    card: {
        backgroundColor: THEME.cardBg,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        shadowColor: THEME.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: THEME.text,
    },
    // Progress
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressPercent: {
        fontSize: 16,
        fontWeight: 'bold',
        color: THEME.primaryDark,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressNote: {
        fontSize: 12,
        color: THEME.subText,
        fontStyle: 'italic',
    },
    // Profile Header
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    avatarGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    avatarText: {
        fontSize: 42,
        fontWeight: 'bold',
        color: THEME.primaryDark,
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: THEME.primaryDark,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    profileHeadInfo: {
        flex: 1,
    },
    headName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: THEME.text,
        marginBottom: 2,
    },
    headEmail: {
        fontSize: 14,
        color: THEME.subText,
        marginBottom: 8,
    },
    roleBadge: {
        backgroundColor: THEME.background,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: THEME.border,
        alignSelf: 'center',
    },
    roleText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: THEME.primaryDark,
        textTransform: 'uppercase',
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 10,
        marginBottom: 20,
    },
    // Form
    formContainer: {},
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: THEME.text,
        marginBottom: 6,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: THEME.text,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 15,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        color: THEME.subText,
        fontWeight: 'bold',
    },
    saveBtn: {
        flex: 2,
        borderRadius: 12,
        backgroundColor: THEME.primary,
        overflow: 'hidden',
    },
    saveBtnContent: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: THEME.primaryDark,
        fontWeight: 'bold',
    },
    // Details View
    detailsContainer: {
        gap: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: THEME.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailLabel: {
        fontSize: 12,
        color: THEME.subText,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '600',
        color: THEME.text,
    },
    // Logout
    logoutBtn: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#fee',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    logoutContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    logoutBtnText: {
        color: THEME.primaryDark,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    }
});

export default ProfileTab;