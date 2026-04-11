/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Dimensions,
    Platform,
    StatusBar,
    RefreshControl,
    LayoutAnimation,
    UIManager,
    Modal,
    FlatList
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import { APIURL, BASE_URL } from '../constants/api';
import { COLORS } from '../styles/theme';

import CustomAlert from '../components/CustomAlert';
import FCMService from '../services/FCMService';
import { SkeletonItem } from '../components/SkeletonLoader';

const { width } = Dimensions.get('window');
const BATCH_SIZE = 5;

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const MerchantDetailsScreen = ({ merchant, onBack, user }) => {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState('plans');

    // Pagination State
    const [allPlans, setAllPlans] = useState([]);
    const [displayedPlans, setDisplayedPlans] = useState([]);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    const [loadingPlans, setLoadingPlans] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [subscribing, setSubscribing] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const [subscribedPlanIds, setSubscribedPlanIds] = useState([]);

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

    useEffect(() => {
        fetchPlans();
        fetchMySubscriptions();
    }, []);

    const fetchMySubscriptions = async () => {
        if (!user || !user.token) return;
        try {
            const { data } = await axios.get(`${APIURL}/chit-plans/my-plans`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const ids = data.map(p => p._id);
            setSubscribedPlanIds(ids);
        } catch (error) {
            console.log("Failed to fetch subscriptions", error);
        }
    };

    const fetchPlans = async () => {
        try {
            const { data } = await axios.get(`${APIURL}/chit-plans/merchant/${merchant._id}`);
            const fetchedPlans = data.plans || [];
            setAllPlans(fetchedPlans);
            setDisplayedPlans(fetchedPlans.slice(0, BATCH_SIZE));
            setPage(1);
        } catch (error) {
            console.error(error);
            setAlertConfig({ visible: true, title: 'Error', message: 'Failed to load chit plans', type: 'error' });
        } finally {
            setLoadingPlans(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPlans();
        fetchMySubscriptions();
    };

    const handleLoadMore = () => {
        if (loadingMore || displayedPlans.length >= allPlans.length) return;
        setLoadingMore(true);

        // Simulate delay for smooth UI
        setTimeout(() => {
            const nextPage = page + 1;
            const newBatch = allPlans.slice(0, nextPage * BATCH_SIZE);
            setDisplayedPlans(newBatch);
            setPage(nextPage);
            setLoadingMore(false);
        }, 1000);
    };

    const handleTabPress = (tab) => {
        if (activeTab !== tab) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab(tab);
        }
    };

    const openPlanDetails = (plan) => {
        setSelectedPlan(plan);
        setShowDetailModal(true);
    };

    const handleSubscribe = async (plan) => {
        // Check Profile Completion
        if (!user || !user.name || user.name === 'New User' || !user.phone || !user.address) {
            setAlertConfig({
                visible: true,
                title: 'Incomplete Profile',
                message: 'Please complete your profile (Name, Phone, Address) in the Profile tab before subscribing.',
                type: 'warning'
            });
            return;
        }

        setAlertConfig({
            visible: true,
            title: 'Confirm Request',
            message: plan.type === 'unlimited'
                ? `Request to join ${plan.planName}? You will need to pay ₹${plan.monthlyAmount} at the store.`
                : `Request to join ${plan.planName}? You will need to pay ₹${plan.monthlyAmount} at the store.`,
            type: 'info',
            buttons: [
                { text: 'Cancel', style: 'cancel', onPress: () => { } },
                {
                    text: 'Send Request',
                    onPress: async () => {
                        setSubscribing(plan._id);
                        try {
                            const config = {
                                headers: {
                                    Authorization: `Bearer ${user.token}`,
                                },
                            };

                            // Request Offline Payment / Join Request
                            await axios.post(`${APIURL}/payments/offline/request`, {
                                chitPlanId: plan._id,
                                amount: plan.monthlyAmount,
                                notes: 'Requested via App'
                            }, config);

                            setSubscribing(null);
                            setAlertConfig({ visible: true, title: 'Request Sent', message: 'Your request has been sent to the merchant. Please visit the store to complete payment.', type: 'success' });
                            FCMService.displayLocalNotification('Request Sent', `Request to join ${plan.planName} sent successfully.`);
                            // fetchPlans(); // Optional
                            // fetchMySubscriptions(); // Optional
                        } catch (error) {
                            console.error("Subscription Request Error:", error);
                            setSubscribing(null);
                            const msg = error.response?.data?.message || 'Failed to send request';
                            setAlertConfig({ visible: true, title: 'Error', message: msg, type: 'error' });
                        }
                    }
                }
            ]
        });
    };

    console.log(merchant);


    const renderHeader = () => (
        <View style={styles.header}>
            {/* <View style={styles.headerTop}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Icon name="arrow-left" size={20} color={COLORS?.primaryDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>DK GOLD</Text>
                <View style={{ width: 40 }} />
            </View> */}

            <View style={styles.merchantInfo}>
                <View style={[styles.avatarContainer, { overflow: 'hidden' }]}>
                    {merchant.shopLogo ? (
                        <Image
                            source={{ uri: `${BASE_URL}${merchant.shopLogo}` }}
                            style={styles.avatarImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <Text style={styles.avatarText}>{merchant.name?.charAt(0)?.toUpperCase() || 'M'}</Text>
                    )}
                </View>
                <View style={styles.infoContent}>
                    <Text style={styles.merchantName}>{merchant.name}</Text>
                    {/* <Text style={styles.merchantAddress} numberOfLines={2}>{merchant.address || 'No address'}</Text> */}
                    {/* {merchant.rating && (
                        <View style={styles.ratingContainer}>
                            <Icon name="star" size={12} color="#FFD700" solid />
                            <Text style={styles.ratingText}>{merchant.rating} Rating</Text>
                        </View>
                    )} */}
                </View>
            </View>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'plans' && styles.activeTab]}
                onPress={() => handleTabPress('plans')}
            >
                <Text style={[styles.tabText, activeTab === 'plans' && styles.activeTabText]}>Chit Plans</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'about' && styles.activeTab]}
                onPress={() => handleTabPress('about')}
            >
                <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
            </TouchableOpacity>
        </View>
    );

    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: 50 }} />;
        return (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS?.primary} />
                {/* <Text style={{ marginTop: 8, color: COLORS?.secondary, fontSize: 12 }}>Loading more plans...</Text> */}
            </View>
        );
    };

    const renderPlanItem = ({ item: plan }) => {
        const isSubscribed = subscribedPlanIds.includes(plan._id);

        return (
            <View style={styles.planCard}>
                <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.planName}</Text>
                    <View style={[styles.badge, { backgroundColor: plan.returnType === 'Gold' ? '#FFF9C4' : '#C6F6D5' }]}>
                        <Text style={[styles.badgeText, { color: plan.returnType === 'Gold' ? '#FBC02D' : '#38A169' }]}>
                            {plan.returnType || 'Cash'}
                        </Text>
                    </View>
                </View>

                <Text style={styles.amountLabel}>Total Value</Text>
                <Text style={styles.amountValue}>
                    {plan.type === 'unlimited' ? 'Unlimited' : `₹${plan.totalAmount}`}
                </Text>

                <View style={styles.planDetails}>
                    <View style={styles.detailItem}>
                        <Icon name="clock" size={14} color={COLORS?.secondary} />
                        <Text style={styles.detailText}>
                            {plan.type === 'unlimited' ? 'No Limit' : `${plan.durationMonths} Months`}
                        </Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Icon name="calendar-alt" size={14} color={COLORS?.secondary} />
                        <Text style={styles.detailText}>
                            {plan.type === 'unlimited' ? `Min ₹${plan.monthlyAmount}` : `₹${plan.monthlyAmount}/mo`}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => openPlanDetails(plan)}
                >
                    <Text style={styles.detailsButtonText}>View Chit Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.subscribeButton,
                        isSubscribed && styles.subscribedButton
                    ]}
                    onPress={() => handleSubscribe(plan)}
                    disabled={subscribing === plan._id || isSubscribed}
                >
                    {subscribing === plan._id ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.subscribeText}>
                                {isSubscribed ? 'Subscribed' : 'Request to Join'}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderPlans = () => {
        if (loadingPlans) {
            return (
                <View style={styles.plansList}>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={styles.planCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                                <SkeletonItem width="50%" height={20} />
                                <SkeletonItem width="20%" height={20} borderRadius={10} />
                            </View>
                            <SkeletonItem width="30%" height={12} style={{ marginBottom: 5 }} />
                            <SkeletonItem width="60%" height={30} style={{ marginBottom: 15 }} />
                            <SkeletonItem width="100%" height={40} style={{ marginBottom: 20 }} />
                            <SkeletonItem width="100%" height={50} borderRadius={8} />
                        </View>
                    ))}
                </View>
            );
        }

        if (allPlans.length === 0) {
            return (
                <View style={styles.centerContainer}>
                    <Text style={{ fontSize: 16, color: COLORS?.secondary }}>No chit plans available for this merchant.</Text>
                </View>
            );
        }

        return (
            <FlatList
                data={displayedPlans}
                renderItem={renderPlanItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.plansList}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            />
        );
    };

    const [selectedImage, setSelectedImage] = useState(null);
    const [featuredDisplayImage, setFeaturedDisplayImage] = useState(null);

    useEffect(() => {
        if (merchant.shopImages && merchant.shopImages.length > 0) {
            setFeaturedDisplayImage(`${BASE_URL}${merchant.shopImages[0]}`);
        }
    }, [merchant.shopImages]);

    const renderAbout = () => (
        <View style={styles.aboutContainer}>
            {merchant.shopImages && merchant.shopImages.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                    {(() => {
                        const images = merchant.shopImages || [];
                        const currentFeatured = featuredDisplayImage || `${BASE_URL}${images[0]}`;

                        return (
                            <>
                                {/* Big Featured Image */}
                                <TouchableOpacity
                                    onPress={() => setSelectedImage(currentFeatured)}
                                    activeOpacity={0.95}
                                >
                                    <Image
                                        source={{ uri: currentFeatured }}
                                        style={{
                                            width: '100%',
                                            height: 250,
                                            borderRadius: 16,
                                            backgroundColor: '#f1f5f9',
                                            marginBottom: 12,
                                            borderWidth: 1,
                                            borderColor: 'rgba(0,0,0,0.05)'
                                        }}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>

                                {/* Thumbnail Grid (4 in a row) */}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                                    {images.map((img, i) => {
                                        const uri = `${BASE_URL}${img}`;
                                        const isSelected = uri === currentFeatured;
                                        return (
                                            <TouchableOpacity
                                                key={i}
                                                onPress={() => setFeaturedDisplayImage(uri)}
                                                activeOpacity={0.8}
                                                style={{
                                                    width: '25%', // 4 items per row
                                                    padding: 4
                                                }}
                                            >
                                                <Image
                                                    source={{ uri }}
                                                    style={{
                                                        width: '100%',
                                                        aspectRatio: 1,
                                                        borderRadius: 10,
                                                        borderWidth: isSelected ? 2.5 : 0,
                                                        borderColor: COLORS?.primary,
                                                        backgroundColor: '#f1f5f9'
                                                    }}
                                                    resizeMode="cover"
                                                />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        );
                    })()}
                </View>
            )}

            {/* Full Screen Image Modal */}
            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Icon name="arrow-left" size={24} color="white" />
                    </TouchableOpacity>

                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={{ width: width, height: '100%' }}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.infoRow}>
                    <Icon name="phone" size={16} color={COLORS?.primary} style={{ width: 25 }} />
                    <Text style={styles.infoText}>{merchant.phone || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Icon name="map-marker-alt" size={16} color={COLORS?.primary} style={{ width: 25 }} />
                    <Text style={styles.infoText}>{merchant.address || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Icon name="envelope" size={16} color={COLORS?.primary} style={{ width: 25 }} />
                    <Text style={styles.infoText}>{merchant.email || 'N/A'}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <LinearGradient
            colors={['#ebdc87', '#f3e9bd']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

                {renderHeader()}
                {renderTabs()}

                {activeTab === 'plans' ? (
                    renderPlans()
                ) : (
                    <ScrollView
                        style={styles.content}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    >
                        {renderAbout()}
                    </ScrollView>
                )}
            </SafeAreaView>
            {/* Plan Details Modal */}
            <Modal
                transparent={true}
                visible={showDetailModal}
                animationType="slide"
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedPlan && (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{selectedPlan.planName}</Text>
                                    <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                        <Icon name="times" size={20} color={COLORS?.secondary} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView contentContainerStyle={styles.modalBody}>
                                    <View style={styles.modalDetailRow}>
                                        <Text style={styles.modalDetailLabel}>Total Value</Text>
                                        <Text style={styles.modalDetailValue}>₹{selectedPlan.totalAmount?.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.modalDetailRow}>
                                        <Text style={styles.modalDetailLabel}>Monthly Installment</Text>
                                        <Text style={styles.modalDetailValue}>₹{selectedPlan.monthlyAmount?.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.modalDetailRow}>
                                        <Text style={styles.modalDetailLabel}>Duration</Text>
                                        <Text style={styles.modalDetailValue}>{selectedPlan.durationMonths} Months</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.modalDetailRow}>
                                        <Text style={styles.modalDetailLabel}>Return Type</Text>
                                        <Text style={[styles.modalDetailValue, { color: selectedPlan.returnType === 'Gold' ? '#FBC02D' : '#38A169' }]}>
                                            {selectedPlan.returnType || 'Cash'}
                                        </Text>
                                    </View>
                                    <View style={styles.divider} />
                                    {selectedPlan.description && (
                                        <View style={{ marginTop: 10 }}>
                                            <Text style={styles.modalDetailLabel}>Description</Text>
                                            <Text style={styles.modalDescription}>{selectedPlan.description}</Text>
                                        </View>
                                    )}
                                </ScrollView>
                                <TouchableOpacity
                                    style={styles.modalCloseButton}
                                    onPress={() => setShowDetailModal(false)}
                                >
                                    <Text style={styles.modalCloseButtonText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
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
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        // paddingTop: 10,
        paddingBottom: 25,
        backgroundColor: 'transparent',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // marginBottom: 25,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS?.primaryDark,
        letterSpacing: 2,
    },
    merchantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: COLORS?.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 32,
        color: '#fff',
        fontWeight: 'bold',
    },
    infoContent: {
        flex: 1,
        justifyContent: 'center',
    },
    merchantName: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS?.dark,
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    merchantAddress: {
        fontSize: 14,
        color: COLORS?.secondary,
        marginBottom: 8,
        lineHeight: 20,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    ratingText: {
        marginLeft: 5,
        fontSize: 13,
        color: COLORS?.dark,
        fontWeight: '700',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 0,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: COLORS?.primary,
    },
    tabText: {
        fontSize: 16,
        color: COLORS?.secondary,
        fontWeight: '600',
    },
    activeTabText: {
        color: COLORS?.primaryDark,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        minHeight: 200,
    },
    plansList: {
        padding: 20,
        paddingBottom: 40,
    },
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    badge: {
        backgroundColor: '#FFF9C4',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    badgeText: {
        color: '#FBC02D',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    amountLabel: {
        fontSize: 13,
        color: COLORS?.secondary,
        marginBottom: 4,
        fontWeight: '500',
    },
    amountValue: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS?.primaryDark,
        marginBottom: 20,
    },
    planDetails: {
        flexDirection: 'row',
        marginBottom: 24,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        justifyContent: 'space-between',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        marginLeft: 8,
        color: COLORS?.secondary,
        fontSize: 14,
        fontWeight: '600',
    },
    subscribeButton: {
        backgroundColor: COLORS?.primary,
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    subscribedButton: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0.1,
    },
    subscribeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    detailsButton: {
        backgroundColor: '#F1F5F9',
        padding: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    detailsButtonText: {
        color: COLORS?.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    aboutContainer: {
        padding: 20,
    },
    gallery: {
        marginBottom: 24,
        marginTop: 8,
    },
    galleryImage: {
        width: 180,
        height: 120,
        borderRadius: 12,
        marginRight: 12,
    },
    section: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    infoText: {
        fontSize: 15,
        color: COLORS?.dark,
        flex: 1,
        marginLeft: 8,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS?.secondary,
        textAlign: 'center',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS?.dark,
        flex: 1,
    },
    modalBody: {
        paddingBottom: 20,
    },
    modalDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    modalDetailLabel: {
        fontSize: 14,
        color: COLORS?.secondary,
        fontWeight: '500',
    },
    modalDetailValue: {
        fontSize: 16,
        color: COLORS?.dark,
        fontWeight: 'bold',
    },
    modalDescription: {
        marginTop: 5,
        fontSize: 14,
        color: COLORS?.dark,
        lineHeight: 22,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
    },
    modalCloseButton: {
        backgroundColor: COLORS?.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    modalCloseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default MerchantDetailsScreen;