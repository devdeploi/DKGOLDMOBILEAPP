/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { ImageBackground,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { BASE_URL } from '../constants/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const THEME = {
    primary: '#ebdc87',
    primaryDark: '#915200',
    primaryLight: '#f3e9bd',
    background: '#fffbf0',
    cardBg: '#ffffff',
    text: '#2c2c2c',
    subText: '#666666',
    border: '#e2d183',
};

const ProfileCard = ({ profile, onSelect, index }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    const initials = profile.name
        ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    const avatarColors = [
        ['#ebdc87', '#c1ab8e'],
        ['#f3a683', '#f19066'],
        ['#a29bfe', '#6c5ce7'],
        ['#55efc4', '#00b894'],
        ['#74b9ff', '#0984e3'],
    ];
    const colorPair = avatarColors[index % avatarColors.length];

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => onSelect(profile)}
                style={styles.card}
            >
                <View
                    style={[styles.avatarGradient, { backgroundColor: colorPair[0] }]}
                >
                    {profile.profileImage ? (
                        <Image
                            source={{ uri: `${BASE_URL}${profile.profileImage}` }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <Text style={styles.avatarInitials}>{initials}</Text>
                    )}
                </View>

                <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{profile.name || 'User'}</Text>
                    {profile.activePlanAcc ? (
                        <View style={styles.accBadge}>
                            <Icon name="file-invoice-dollar" size={10} color={THEME.primaryDark} />
                            <Text style={styles.accText} numberOfLines={1}>
                                {profile.activePlanAcc.includes(',') ? 'Active A/cs' : 'Active A/c'}: {profile.activePlanAcc}
                            </Text>
                        </View>
                    ) : profile.allPlansAcc ? (
                        <View style={[styles.accBadge, { backgroundColor: '#f5f5f5', borderColor: '#ccc' }]}>
                            <Icon name="check-circle" size={10} color="#888" />
                            <Text style={[styles.accText, { color: '#888' }]} numberOfLines={1}>
                                {profile.allPlansAcc.includes(',') ? 'Completed A/cs' : 'Completed A/c'}: {profile.allPlansAcc}
                            </Text>
                        </View>
                    ) : (
                        <Text style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic', marginTop: 2 }}>No plans registered</Text>
                    )}
                </View>

                <View style={styles.selectArrow}>
                    <Icon name="chevron-right" size={14} color={THEME.primaryDark} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const ProfileSelectScreen = ({ profiles, onSelect, onLogout }) => {
    const [selecting, setSelecting] = useState(false);

    const handleSelect = (profile) => {
        if (selecting) return;
        setSelecting(true);
        onSelect(profile);
        setTimeout(() => setSelecting(false), 1500);
    };

    return (
        <ImageBackground source={require('../../public/assests/DKGOLDBG.png')} style={{ flex: 1 }} resizeMode="cover">
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.container}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Image
                            source={require('../assets/DK.png')}
                            style={styles.logo}
                        />
                        <Text style={styles.headerTitle}>Select Profile</Text>
                        <Text style={styles.headerSubtitle}>
                            Multiple profiles found for this number.{'\n'}Choose which account to access.
                        </Text>

                        {/* Profile Count Pill */}
                        <View style={styles.countPill}>
                            <Icon name="users" size={12} color={THEME.primaryDark} />
                            <Text style={styles.countText}>
                                {profiles.length} Profiles
                            </Text>
                        </View>
                    </View>

                    {/* Profiles List */}
                    <View style={styles.listContainer}>
                        {profiles.map((profile, index) => (
                            <ProfileCard
                                key={profile._id}
                                profile={profile}
                                onSelect={handleSelect}
                                index={index}
                            />
                        ))}
                    </View>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Logout/Cancel */}
                    <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                        <Icon name="sign-out-alt" size={14} color={THEME.primaryDark} />
                        <Text style={styles.logoutText}>Go Back to Login</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        paddingTop: Platform.OS === 'android' ? 10 : 0,
    },
    logo: {
        width: 120,
        height: 70,
        resizeMode: 'contain',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#e6ded4',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    countPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: THEME.border,
        gap: 6,
        shadowColor: THEME.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    countText: {
        fontSize: 13,
        fontWeight: '700',
        color: THEME.primaryDark,
    },
    listContainer: {
        gap: 14,
        marginBottom: 24,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        shadowColor: THEME.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#f5ebb0',
    },
    avatarGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 28,
    },
    avatarInitials: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME.primaryDark,
    },
    cardInfo: {
        flex: 1,
    },
    cardName: {
        fontSize: 16,
        fontWeight: '700',
        color: THEME.text,
        marginBottom: 3,
    },
    cardEmail: {
        fontSize: 13,
        color: THEME.subText,
        marginBottom: 5,
    },
    accBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.background,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: THEME.border,
        gap: 4,
    },
    accText: {
        fontSize: 11,
        color: THEME.primaryDark,
        fontWeight: '600',
    },
    selectArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: THEME.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 1)',
    },
    dividerText: {
        marginHorizontal: 12,
        color: '#ffffffff',
        fontSize: 13,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: THEME.border,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: THEME.primaryDark,
    },
});

export default ProfileSelectScreen;
