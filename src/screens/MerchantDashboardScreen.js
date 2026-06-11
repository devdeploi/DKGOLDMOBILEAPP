
/* eslint-disable no-unused-vars */
/* eslint-disable react-native/no-inline-styles */

import LinearGradient from 'react-native-linear-gradient';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ImageBackground,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    Image,
    Animated,
    Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import axios from 'axios';
import { APIURL, BASE_URL } from '../constants/api';
import Icon from 'react-native-vector-icons/FontAwesome5';

import MerchantOverview from '../components/MerchantOverview';
import MerchantPlans from '../components/MerchantPlans';
import MerchantUsers from '../components/MerchantUsers';
import UnsubscribedUsersList from '../components/UnsubscribedUsersList';
import MerchantProfile from '../components/MerchantProfile';
import AdManager from '../components/AdManager';
import MerchantReports from '../components/MerchantReports';
import GoldTab from '../components/dashboard/GoldTab';
import CustomAlert from '../components/CustomAlert';

const MerchantDashboardScreen = ({ user, onLogout, onUserUpdate, onRefreshAds }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const slideAnim = useRef(new Animated.Value(-300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const openSidebar = () => {
        setShowSidebar(true);
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease)
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            })
        ]).start();
    };

    const closeSidebar = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -300,
                duration: 250,
                useNativeDriver: true,
                easing: Easing.in(Easing.ease)
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true
            })
        ]).start(() => {
            setShowSidebar(false);
        });
    };

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

    const [stats, setStats] = useState({
        activePlans: 0,
        totalEnrolled: 0,
        activeUserCollection: 0,
        settledAmount: 0,
        dailyCollection: 0,
        monthlyCollection: 0,
        dailySettlement: 0,
        monthlySettlement: 0
    });
    const [plans, setPlans] = useState([]);
    const [subscribers, setSubscribers] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(false);

    // Profile Edit State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileData, setProfileData] = useState({ ...user });
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    const stabilizedUser = useMemo(() => ({ ...user, ...profileData }), [user, profileData]);

    const merchantTabs = [
        { id: 'overview', icon: 'chart-pie', label: 'Overview' },
        { id: 'plans', icon: 'clipboard-list', label: 'My Plans' },
        { id: 'subscribers', icon: 'users', label: 'Subscribers' },
        { id: 'new-users', icon: 'user-plus', label: 'New Users' },
    ];

    const fetchPlans = useCallback(async () => {
        if (!user) return;
        try {
            setLoadingPlans(true);
            const id = user._id || user.id;
            const token = user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [plansRes, subsRes] = await Promise.all([
                axios.get(`${APIURL}/chit-plans/merchant/${id}?limit=100`, config),
                axios.get(`${APIURL}/chit-plans/my-subscribers`, config).catch(() => ({ data: [] }))
            ]);

            const fetchedPlans = plansRes.data.plans || [];
            const fetchedSubscribers = subsRes.data || [];

            setPlans(fetchedPlans);

            const activePlans = fetchedPlans.length;
            const totalEnrolled = fetchedSubscribers.length;

            const activeUserCollection = fetchedSubscribers
                .filter(s => s.subscription?.status === 'active' || s.status === 'active')
                .reduce((acc, s) => acc + (s.subscription?.totalAmountPaid || s.totalPaid || 0), 0);

            const settledAmount = fetchedSubscribers
                .filter(s => s.subscription?.status === 'settled' || s.status === 'settled')
                .reduce((acc, s) => acc + (Number(s.subscription?.settlementDetails?.amount) || Number(s.settlementAmount) || 0), 0);

            // Calculate daily/monthly settlements from all subscribers
            const today = new Date().toISOString().split('T')[0];
            const thisMonth = new Date().toISOString().slice(0, 7);
            let dailySettlement = 0;
            let monthlySettlement = 0;

            fetchedSubscribers.forEach(sub => {
                const sDetails = sub.subscription?.settlementDetails || sub.settlementDetails;
                if (sDetails?.settledDate) {
                    const sDate = sDetails.settledDate.split('T')[0];
                    const sMonth = sDetails.settledDate.slice(0, 7);
                    if (sDate === today) dailySettlement += Number(sDetails.amount) || 0;
                    if (sMonth === thisMonth) monthlySettlement += Number(sDetails.amount) || 0;
                }
            });

            setStats(prev => ({
                ...prev,
                activePlans,
                totalEnrolled,
                activeUserCollection,
                settledAmount,
                dailySettlement,
                monthlySettlement
            }));

            // Use the full list for internal display list if needed
            setSubscribers(fetchedSubscribers.map(sub => ({
                ...sub,
                planName: sub.plan?.planName || sub.planName,
                planAmount: sub.plan?.monthlyAmount || sub.planAmount,
                _id: sub._id || sub.id || Math.random().toString()
            })));



        } catch (error) {
            console.error("Error fetching merchant data", error);
        } finally {
            setLoadingPlans(false);
        }
    }, [user]);

    const fetchDashboardStats = useCallback(async () => {
        if (!user) return;
        try {
            const token = user.token;
            const { data } = await axios.get(`${APIURL}/merchants/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStats(prev => ({
                ...prev,
                dailyCollection: data.dailyCollection || 0,
                monthlyCollection: data.monthlyCollection || 0,
                todaysCollections: data.todaysCollections || [],
                monthlyCollections: data.monthlyCollections || []
            }));
        } catch (error) {
            console.error("Error fetching dashboard stats", error);
        }
    }, [user]);

    const fetchProfile = useCallback(async () => {
        if (!user) return;
        try {
            const token = user.token;
            const id = user._id || user.id;
            const { data } = await axios.get(`${APIURL}/merchants/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const safeData = {
                ...data,
                shopImages: data.shopImages || []
            };

            if (onUserUpdate) {
                onUserUpdate({ ...user, ...safeData });
            }

            setProfileData(prev => ({ ...prev, ...safeData }));
        } catch (error) {
            console.error("Error fetching profile", error);
        }
    }, [user]);

    // Initial Fetch on Mount
    useEffect(() => {
        fetchPlans();
        fetchDashboardStats();
        fetchProfile();
    }, []); // Only run on first mount

    // Tab Change Fetch
    useEffect(() => {
        if (activeTab === 'overview' || activeTab === 'plans' || activeTab === 'subscribers') {
            // Optional: Re-fetch on tab change if data needs to be fresh
            // fetchPlans();
        }
    }, [activeTab]);

    const handleUpdateProfile = async (updatedData) => {
        try {
            setUpdatingProfile(true);
            const token = user.token;
            const id = user._id || user.id;

            // Simplified payload matching web app
            const payload = {
                name: updatedData.name,
                address: updatedData.address,
                shopImages: updatedData.shopImages,
                shopLogo: updatedData.shopLogo,
                phone: updatedData.phone,
                email: updatedData.email,
                upiId: updatedData.upiId,
                upiNumber: updatedData.upiNumber,
                gstin: updatedData.gstin,
                pancard: updatedData.pancard,
                goldRate18k: updatedData.goldRate18k,
                goldRate22k: updatedData.goldRate22k,
                goldRate24k: updatedData.goldRate24k,
                silverRate: updatedData.silverRate
            };

            const { data } = await axios.put(`${APIURL}/merchants/${id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Make sure we keep the token and any other front-end specific data not returned by the put endpoint
            const safeData = {
                ...profileData,
                ...data,
                shopImages: data.shopImages || []
            };

            setProfileData(safeData);
            setIsEditingProfile(false);
            setAlertConfig({ visible: true, title: 'Success', message: 'Profile updated successfully', type: 'success' });

            // Refresh the main user state to reflect changes in Live Rates
            if (onUserUpdate) onUserUpdate(safeData);

        } catch (error) {
            console.error("Update profile error", error);
            setAlertConfig({ visible: true, title: 'Error', message: 'Failed to update profile', type: 'error' });
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleRefresh = useCallback(async () => {
        const tasks = [fetchPlans(), fetchDashboardStats(), fetchProfile()];
        if (onRefreshAds) tasks.push(onRefreshAds());
        await Promise.all(tasks);
    }, [fetchPlans, fetchDashboardStats, fetchProfile, onRefreshAds]);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <View style={{ flex: 1 }}>
                        <MerchantOverview
                            user={stabilizedUser}
                            stats={stats}
                            plans={plans}
                            refreshing={loadingPlans}
                            onRefresh={handleRefresh}
                        />
                    </View>
                );
            case 'gold':
                return <GoldTab />;
            case 'plans':
                return (
                    <MerchantPlans
                        user={stabilizedUser}
                        loadingPlans={loadingPlans}
                        plans={plans}
                        onPlanCreated={fetchPlans}
                        onRefresh={fetchPlans}
                    />
                );
            case 'subscribers':
                return <MerchantUsers user={stabilizedUser} />;
            case 'new-users':
                return <UnsubscribedUsersList user={stabilizedUser} />;
            case 'ads':
                return <AdManager user={stabilizedUser} />;
            case 'reports':
                return <MerchantReports user={stabilizedUser} plans={plans} />;
            case 'profile':
                return (
                    <MerchantProfile
                        user={user}
                        profileData={profileData}
                        setProfileData={setProfileData}
                        isEditingProfile={isEditingProfile}
                        setIsEditingProfile={setIsEditingProfile}
                        handleUpdateProfile={handleUpdateProfile}
                        updatingProfile={updatingProfile}
                        uploadingDoc={uploadingDoc}
                        setUploadingDoc={setUploadingDoc}
                        setShowLogoutModal={setShowLogoutModal}
                        onLogout={onLogout}
                        onRefresh={fetchProfile}
                    />
                );
        }
    };

    return (
        <ImageBackground source={require('../../public/assests/DKGOLDBG.png')} style={styles.container} resizeMode="cover">
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                {/* Header */}
                <View style={[styles.header, { position: 'relative' }]}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity
                            style={[styles.logoutBtn, { marginRight: 10, paddingHorizontal: 10 }]}
                            onPress={openSidebar}
                        >
                            <Icon name="bars" size={18} color="#915200" />
                        </TouchableOpacity>
                        <Image source={require('../assets/logodk.png')} style={styles.logo} />
                    </View>

                    <Image source={require('../assets/DKTITLE.png')} style={styles.centerLogo} />
                </View>

                {/* Content */}
                <View style={styles.mainContent}>
                    {renderContent()}
                </View>
            </SafeAreaView>

            {/* BottomNav outside SafeAreaView — its paddingBottom from insets fills home-indicator area with gold color */}
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} tabs={merchantTabs} />

            {/* Sidebar Modal */}
            <Modal visible={showSidebar} transparent onRequestClose={closeSidebar}>
                <View style={styles.sidebarOverlay}>
                    {/* Animated Backdrop */}
                    <Animated.View 
                        style={[
                            StyleSheet.absoluteFill, 
                            { 
                                backgroundColor: 'rgba(0,0,0,0.5)', 
                                opacity: fadeAnim 
                            }
                        ]}
                    >
                        <TouchableOpacity style={{ flex: 1 }} onPress={closeSidebar} activeOpacity={1} />
                    </Animated.View>

                    <Animated.View style={[styles.sidebarContent, { transform: [{ translateX: slideAnim }] }]}>
                        <LinearGradient
                            colors={['#fffdf7', '#fbeea8']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <View style={styles.sidebarHeader}>
                            <TouchableOpacity style={styles.sidebarCloseBtn} onPress={closeSidebar}>
                                <Icon name="times" size={22} color="#915200" />
                            </TouchableOpacity>
                            <View style={styles.profileImageWrapper}>
                                { (profileData?.shopLogo || user?.shopLogo) ? (
                                    <Image 
                                        source={typeof (profileData?.shopLogo || user?.shopLogo) === 'string' ? { uri: `${BASE_URL}${profileData?.shopLogo || user?.shopLogo}` } : (profileData?.shopLogo || user?.shopLogo)} 
                                        style={styles.sidebarProfileImage} 
                                    />
                                ) : (
                                    <View style={[styles.sidebarProfileImage, { justifyContent: 'center', alignItems: 'center' }]}>
                                        <Icon name="user" size={24} color="#915200" />
                                    </View>
                                )}
                            </View>
                            <Text style={styles.sidebarName} numberOfLines={1}>{profileData?.name || user?.name || 'Merchant'}</Text>
                            <Text style={styles.sidebarRole}>Merchant Portal</Text>
                        </View>
                        <View style={styles.sidebarMenu}>
                            <TouchableOpacity 
                                style={[styles.sidebarMenuItem, activeTab === 'reports' && styles.sidebarActiveMenuItem]} 
                                onPress={() => { setActiveTab('reports'); closeSidebar(); }}
                            >
                                <Icon name="file-alt" size={18} color={activeTab === 'reports' ? '#fff' : '#915200'} style={styles.sidebarIcon} />
                                <Text style={[styles.sidebarMenuText, activeTab === 'reports' && styles.sidebarActiveMenuText]}>Reports</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.sidebarMenuItem, activeTab === 'gold' && styles.sidebarActiveMenuItem]} 
                                onPress={() => { setActiveTab('gold'); closeSidebar(); }}
                            >
                                <Icon name="coins" size={18} color={activeTab === 'gold' ? '#fff' : '#915200'} style={styles.sidebarIcon} />
                                <Text style={[styles.sidebarMenuText, activeTab === 'gold' && styles.sidebarActiveMenuText]}>Live Rates</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.sidebarMenuItem, activeTab === 'ads' && styles.sidebarActiveMenuItem]} 
                                onPress={() => { setActiveTab('ads'); closeSidebar(); }}
                            >
                                <Icon name="bullhorn" size={18} color={activeTab === 'ads' ? '#fff' : '#915200'} style={styles.sidebarIcon} />
                                <Text style={[styles.sidebarMenuText, activeTab === 'ads' && styles.sidebarActiveMenuText]}>Promote</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.sidebarMenuItem, activeTab === 'profile' && styles.sidebarActiveMenuItem]} 
                                onPress={() => { setActiveTab('profile'); closeSidebar(); }}
                            >
                                <Icon name="user-cog" size={18} color={activeTab === 'profile' ? '#fff' : '#915200'} style={styles.sidebarIcon} />
                                <Text style={[styles.sidebarMenuText, activeTab === 'profile' && styles.sidebarActiveMenuText]}>Profile</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.sidebarFooter}>
                            <TouchableOpacity style={styles.sidebarLogoutBtn} onPress={() => { closeSidebar(); setShowLogoutModal(true); }}>
                                <Icon name="sign-out-alt" size={16} color="#fff" style={styles.sidebarIconLogout} />
                                <Text style={styles.sidebarLogoutText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Logout Modal */}
            <Modal visible={showLogoutModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Icon name="sign-out-alt" size={40} color="#915200" style={{ marginBottom: 15 }} />
                        <Text style={styles.modalTitle}>Confirm Logout</Text>
                        <Text style={styles.modalText}>Are you sure you want to log out?</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowLogoutModal(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={onLogout}>
                                <Text style={styles.confirmButtonText}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={hideAlert}
            />
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2d183',
        backgroundColor: '#ebdc87', // Gold gradient start approximation
    },
    appTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#915200',
        letterSpacing: 1,
    },
    logo: {
        width: 50,
        height: 50,
        resizeMode: 'contain',
    },
    centerLogoContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    centerLogo: {
        width: 140,
        height: 60,
        resizeMode: 'contain',
    },
    mainContent: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2,
    },
    logoutBtn: {
        zIndex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbf0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#fff',
    },
    logoutBtnText: {
        color: '#915200',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 6,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    modalText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        gap: 15,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
    },
    confirmButton: {
        backgroundColor: '#915200',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    // Sidebar Styles
    sidebarOverlay: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    sidebarContent: {
        width: 260,
        height: '100%',
        paddingTop: 40,
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        position: 'relative',
        overflow: 'hidden',
    },
    sidebarHeader: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(145, 82, 0, 0.15)',
        position: 'relative',
    },
    sidebarCloseBtn: {
        position: 'absolute',
        top: 0,
        right: 15,
        padding: 10,
        zIndex: 10,
    },
    profileImageWrapper: {
        shadowColor: '#915200',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
        borderRadius: 40,
        padding: 2,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    sidebarProfileImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#f9f9f9',
    },
    sidebarName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#915200',
        textAlign: 'center',
    },
    sidebarRole: {
        fontSize: 12,
        color: 'rgba(145, 82, 0, 0.6)',
        marginTop: 2,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sidebarMenu: {
        flex: 1,
        paddingTop: 20,
        paddingHorizontal: 12,
    },
    sidebarMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 6,
    },
    sidebarActiveMenuItem: {
        backgroundColor: '#915200',
        shadowColor: '#915200',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 3,
    },
    sidebarIcon: {
        width: 24,
        textAlign: 'center',
        marginRight: 12,
    },
    sidebarMenuText: {
        fontSize: 15,
        color: '#915200',
        fontWeight: '600',
    },
    sidebarActiveMenuText: {
        color: '#fff',
        fontWeight: '700',
    },
    sidebarFooter: {
        padding: 20,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: 'rgba(145, 82, 0, 0.15)',
    },
    sidebarLogoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e74c3c', // Premium Crimson Red
        padding: 12,
        borderRadius: 10,
        justifyContent: 'center',
        shadowColor: '#e74c3c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    sidebarLogoutText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    sidebarIconLogout: {
        marginRight: 8,
    },
});

export default MerchantDashboardScreen;
