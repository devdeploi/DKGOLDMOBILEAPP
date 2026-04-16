/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
import LinearGradient from 'react-native-linear-gradient';
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    // SafeAreaView,
    TouchableOpacity,
    Modal,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import { COLORS } from '../styles/theme';
import BottomNav from '../components/BottomNav';
import QuickproAd from '../components/QuickproAd';
import { useGoldRate } from '../context/GoldRateContext';

import DashboardTab from '../components/dashboard/DashboardTab';
import MerchantsTab from '../components/dashboard/MerchantsTab';
import AnalyticsTab from '../components/dashboard/AnalyticsTab';
import ProfileTab from '../components/dashboard/ProfileTab';
import GoldTab from '../components/dashboard/GoldTab';
import CustomAlert from '../components/CustomAlert';
import { APIURL } from '../constants/api';

const UserDashboardScreen = ({ user: initialUser, onLogout, onSelectMerchant, onUserUpdate, initialTab = 'dashboard', ads = [], onRefreshAds, onSwitchProfile }) => {
    const [user, setUser] = useState(initialUser);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [refreshingMerchants, setRefreshingMerchants] = useState(false);

    // Use global synchronized gold rate from context
    const { goldRate: globalGoldRate } = useGoldRate();


    // Merchants State
    const [merchants, setMerchants] = useState([]);
    const [page, setPage] = useState(1);
    const [loadingMerchants, setLoadingMerchants] = useState(false);
    const [hasMoreMerchants, setHasMoreMerchants] = useState(true);

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

    const handleLogoutPress = () => {
        setShowLogoutModal(true);
    };

    useEffect(() => {
        if (activeTab === 'merchants') {
            fetchMerchants();
        }
    }, [activeTab]);

    const fetchMerchants = async () => {
        if (loadingMerchants) return;

        if (merchants.length > 0 && page === 1 && activeTab === 'merchants') {
            return;
        }

        setLoadingMerchants(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };
            const { data } = await axios.get(`${APIURL}/merchants?page=${page}&limit=10`, config);

            if (page === 1) {
                setMerchants(data.merchants);
            } else {
                setMerchants(prev => [...prev, ...data.merchants]);
            }

            setHasMoreMerchants(data.pagination.hasNextPage);

        } catch (error) {
            console.error(error);
            setAlertConfig({ visible: true, title: 'Error', message: 'Failed to load merchants', type: 'error' });
        } finally {
            setLoadingMerchants(false);
        }
    };

    const handleLoadMoreMerchants = () => {
        if (hasMoreMerchants && !loadingMerchants) {
            setPage(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (activeTab === 'merchants') {
            if (page > 1) {
                const loadMore = async () => {
                    setLoadingMerchants(true);
                    try {
                        const config = {
                            headers: { Authorization: `Bearer ${user.token}` }
                        };
                        const { data } = await axios.get(`${APIURL}/merchants?page=${page}&limit=10`, config);
                        setMerchants(prev => [...prev, ...data.merchants]);
                        setHasMoreMerchants(data.pagination.hasNextPage);
                    } catch (error) {
                        console.log(error);
                    } finally {
                        setLoadingMerchants(false);
                    }
                };
                loadMore();
            } else if (page === 1 && merchants.length === 0) {
                // Initial load logic moved to fetchMerchants mostly, but if we need force refresh logic here:
                const initialLoad = async () => {
                    setLoadingMerchants(true);
                    try {
                        const config = {
                            headers: { Authorization: `Bearer ${user.token}` }
                        };
                        const { data } = await axios.get(`${APIURL}/merchants?page=${1}&limit=10`, config);
                        setMerchants(data.merchants);
                        setHasMoreMerchants(data.pagination.hasNextPage);
                    } catch (error) {
                        console.log(error);
                    } finally {
                        setLoadingMerchants(false);
                    }
                };
                initialLoad();
            }
        }
    }, [page, activeTab]);

    const handleRefreshMerchants = async () => {
        if (loadingMerchants) return;

        setRefreshingMerchants(true);
        setPage(1);

        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };
            const { data } = await axios.get(`${APIURL}/merchants?page=1&limit=10`, config);
            setMerchants(data.merchants);
            setHasMoreMerchants(data.pagination.hasNextPage);
        } catch (error) {
            console.error(error);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Failed to refresh merchants',
                type: 'error'
            });
        } finally {
            setRefreshingMerchants(false);
        }
    };


    const handleUpdateProfile = async (updatedData) => {
        try {
            const userId = user._id || user.id;
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };
            const { data } = await axios.put(`${APIURL}/users/${userId}`, updatedData, config);
            const updatedUser = { ...user, ...data };
            setUser(updatedUser);
            if (onUserUpdate) {
                onUserUpdate(updatedUser);
            }
            setAlertConfig({ visible: true, title: 'Success', message: 'Profile updated successfully', type: 'success' });
        } catch (error) {
            console.error(error);
            setAlertConfig({ visible: true, title: 'Error', message: 'Failed to update profile', type: 'error' });
            throw error; // Propagate error so child can handle loading state if needed
        }
    };

    const updateProfileImage = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
        if (result.didCancel || !result.assets || result.assets.length === 0) return;

        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('image', {
            uri: asset.uri,
            type: asset.type,
            name: asset.fileName || 'profile.jpg',
        });

        try {
            const { data: imagePath } = await axios.post(`${APIURL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            await handleUpdateProfile({ profileImage: imagePath });
        } catch (error) {
            console.error(error);
            setAlertConfig({ visible: true, title: 'Error', message: 'Failed to upload image', type: 'error' });
        }
    };

    const fetchUser = async () => {
        try {
            const userId = user._id || user.id;
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };
            const { data } = await axios.get(`${APIURL}/users/${userId}`, config);

            // Merge existing user data (like token) with new profile data
            const updatedUser = { ...user, ...data };
            setUser(updatedUser);

            // Notify App.tsx of the update if data changed
            if (onUserUpdate && (data.plan !== user.plan || data.role !== user.role)) {
                onUserUpdate(updatedUser);
            }
        } catch (error) {
            console.error("Failed to refresh user profile", error);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    // <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' }}>
                    //     <Icon name="chart-pie" size={48} color={COLORS?.primary} style={{ opacity: 0.8, marginBottom: 16 }} />
                    //     <Text style={{ fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 }}>Dashboard</Text>
                    //     <Text style={{ fontSize: 14, color: '#666' }}>Your financial overview is creating...</Text>
                    // </View>
                    <DashboardTab user={user} ads={ads} onRefreshAds={onRefreshAds} />
                );
            case 'merchants':
                return (
                    <MerchantsTab
                        merchants={merchants}
                        loading={loadingMerchants}
                        refreshing={refreshingMerchants}
                        onRefresh={handleRefreshMerchants}
                        onLoadMore={handleLoadMoreMerchants}
                        onSelectMerchant={onSelectMerchant}
                        hasMore={hasMoreMerchants}
                        user={user} // Pass user down if needed, but onSelectMerchant is the handler
                    />
                );
            case 'gold':
                return <GoldTab />;
            case 'analytics':
                return <AnalyticsTab user={user} />;
            case 'profile':
                return <ProfileTab user={user} onUpdate={handleUpdateProfile} onUpdateImage={updateProfileImage} onLogout={handleLogoutPress} onRefresh={fetchUser} onSwitchProfile={onSwitchProfile} />;
            default:
                return null;
        }
    };

    console.log(merchants);


    const userTabs = [
        { id: 'dashboard', icon: 'home', label: 'Overview' },
        { id: 'gold', icon: 'coins', label: 'Live Rates' },
        { id: 'merchants', icon: 'store', label: 'DK Gold' },
        { id: 'analytics', icon: 'chart-line', label: 'Subscriptions' },
        { id: 'profile', icon: 'user', label: 'Profile', profileImage: user?.profileImage },
    ];

    return (
        <LinearGradient
            colors={['#ffffffff', '#ffffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
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
                        onPress={handleLogoutPress}
                    >
                        <Icon name="sign-out-alt" size={14} color="#915200" />
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                    {renderContent()}
                </View>
            </SafeAreaView>

            {/* BottomNav sits OUTSIDE SafeAreaView so its paddingBottom (from insets) fills the home indicator area with gold color */}
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} tabs={userTabs} />

            {/* Logout Modal */}
            <Modal visible={showLogoutModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Icon name="exclamation-triangle" size={40} color={COLORS?.warning} style={{ marginBottom: 15 }} />
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
        // marginTop: 35
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e2d183',
        backgroundColor: '#ebdc87',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2,
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
        backgroundColor: COLORS?.primary,
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

export default UserDashboardScreen;

