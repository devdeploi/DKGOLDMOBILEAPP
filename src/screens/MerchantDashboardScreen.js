
/* eslint-disable no-unused-vars */
/* eslint-disable react-native/no-inline-styles */

import LinearGradient from 'react-native-linear-gradient';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import axios from 'axios';
import { APIURL } from '../constants/api';
import Icon from 'react-native-vector-icons/FontAwesome5';

import MerchantOverview from '../components/MerchantOverview';
import MerchantPlans from '../components/MerchantPlans';
import MerchantUsers from '../components/MerchantUsers';
import MerchantProfile from '../components/MerchantProfile';
import AdManager from '../components/AdManager';
import GoldTab from '../components/dashboard/GoldTab';
import CustomAlert from '../components/CustomAlert';

const MerchantDashboardScreen = ({ user, onLogout, onUserUpdate, onRefreshAds }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [showLogoutModal, setShowLogoutModal] = useState(false);

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
        { id: 'gold', icon: 'coins', label: 'Live Rates' },
        { id: 'plans', icon: 'clipboard-list', label: 'My Plans' },
        { id: 'subscribers', icon: 'users', label: 'Users' },
        { id: 'ads', icon: 'bullhorn', label: 'Promote' },
        { id: 'profile', icon: 'user-cog', label: 'Profile', profileImage: profileData?.shopLogo || user?.shopLogo },
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
                monthlyCollection: data.monthlyCollection || 0
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
            console.log("Full DB Profile:", data);

            const safeData = {
                ...data,
                shopImages: data.shopImages || []
            };

            // if (onUserUpdate) {
            //     onUserUpdate({ ...user, ...safeData });
            // }

            setProfileData(prev => ({ ...prev, ...safeData }));
        } catch (error) {
            console.error("Error fetching profile", error);
        }
    }, [user]);

    // Fetch Stats & Plans
    useEffect(() => {
        if (activeTab === 'overview' || activeTab === 'plans' || activeTab === 'subscribers') {
            fetchPlans();
            if (activeTab === 'overview') {
                fetchDashboardStats();
            }
        }

        if (user) {
            fetchProfile();
        }
    }, [user, activeTab, fetchPlans, fetchProfile]);

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
                goldRate22k: updatedData.goldRate22k
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

            // Optionally, refresh the main user state if needed
            // if (onUserUpdate) onUserUpdate(safeData);

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
            case 'ads':
                return <AdManager user={stabilizedUser} />;
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
        <LinearGradient
            colors={['#fffbf0', '#fffbf0']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                {/* Header */}
                <View style={[styles.header, { position: 'relative' }]}>
                    <View style={styles.headerRow}>
                        <Image source={require('../assets/logodk.png')} style={styles.logo} />
                    </View>

                    <View style={styles.centerLogoContainer}>
                        <Image source={require('../assets/DKTITLE.png')} style={styles.centerLogo} />
                    </View>

                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={() => setShowLogoutModal(true)}
                    >
                        <Icon name="sign-out-alt" size={14} color="#915200" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.mainContent}>
                    {renderContent()}
                </View>
            </SafeAreaView>

            {/* BottomNav outside SafeAreaView — its paddingBottom from insets fills home-indicator area with gold color */}
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} tabs={merchantTabs} />

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
        </LinearGradient>
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
        paddingVertical: 15,
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
});

export default MerchantDashboardScreen;
