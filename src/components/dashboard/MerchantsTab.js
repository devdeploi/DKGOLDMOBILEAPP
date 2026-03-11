/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    Modal,
    Dimensions,
    ActivityIndicator,
    FlatList,
    RefreshControl,
    TextInput,
    Platform,
    Alert,
    Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '../../styles/theme';
import { APIURL, BASE_URL } from '../../constants/api';
import { SkeletonItem } from '../SkeletonLoader';
import CustomAlert from '../CustomAlert';
import GoldTicker from '../GoldTicker';
import { useGoldRate } from '../../context/GoldRateContext';

const { width } = Dimensions.get('window');

const MerchantsTab = ({ merchants, refreshing, onRefresh, loading, user }) => {
    // We assume only one merchant is relevant or we pick the first one
    const merchant = merchants && merchants.length > 0 ? merchants[0] : null;

    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [subscribedPlanIds, setSubscribedPlanIds] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);

    // Subscription Modal State
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [selectedPlanForSub, setSelectedPlanForSub] = useState(null);
    const [proofImage, setProofImage] = useState(null);
    const [transactionId, setTransactionId] = useState('');
    const [subNote, setSubNote] = useState('');
    const [subscriptionAmount, setSubscriptionAmount] = useState(''); // Added for unlimited plans
    const [submitting, setSubmitting] = useState(false);

    // Use global synchronized gold rate and timer from context
    const { goldRate, refreshTimer: goldRefreshTimer } = useGoldRate();

    // Locked rate for Modal calculations
    const [lockedGoldRate, setLockedGoldRate] = useState(0);

    // Alert State
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        buttons: []
    });

    useEffect(() => {
        if (merchant) {
            fetchPlans();
            fetchMySubscriptions();
        }
    }, [merchant]);

    useEffect(() => {
        if (goldRefreshTimer === 60) {
            setLockedGoldRate(goldRate);
        }
    }, [goldRefreshTimer, goldRate]);

    const fetchPlans = async () => {
        setLoadingPlans(true);
        try {
            const { data } = await axios.get(`${APIURL}/chit-plans/merchant/${merchant._id}`);
            setPlans(data.plans || []);
        } catch (error) {
            console.error("Failed to fetch plans", error);
        } finally {
            setLoadingPlans(false);
        }
    };

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

    const handleSubscribePress = (plan) => {
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

        setSelectedPlanForSub(plan);
        setProofImage(null);
        if (plan.type === 'unlimited') {
            setSubscriptionAmount(plan.monthlyAmount.toString()); // Default to min amount
        } else {
            setSubscriptionAmount('');
        }
        setTransactionId('');
        setSubNote('');
        if (lockedGoldRate === 0 && goldRate > 0) {
            setLockedGoldRate(goldRate);
        }
        setShowSubscribeModal(true);
    };

    const handleUpiPayment = async () => {
        if (!merchant?.upiId) {
            Alert.alert("Error", "Merchant UPI ID not available.");
            return;
        }

        const amount = selectedPlanForSub?.type === 'unlimited' ? subscriptionAmount : selectedPlanForSub?.monthlyAmount;

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            Alert.alert("Error", "Please enter a valid amount.");
            return;
        }

        const upiUrl = `upi://pay?pa=${merchant.upiId}&pn=${encodeURIComponent(merchant.name || 'Merchant')}&am=${amount}&cu=INR`;

        try {
            const supported = await Linking.canOpenURL(upiUrl);
            if (supported) {
                await Linking.openURL(upiUrl);
            } else {
                Alert.alert("Error", "No UPI app found on this device.");
            }
        } catch (error) {
            console.error("An error occurred", error);
            Alert.alert("Error", "Failed to open UPI app.");
        }
    };

    const handleChoosePhoto = () => {
        launchImageLibrary({ noData: true, mediaType: 'photo' }, (response) => {
            if (response.assets && response.assets.length > 0) {
                setProofImage(response.assets[0]);
            }
        });
    };

    const submitSubscription = async () => {
        if (!proofImage) {
            Alert.alert("Required", "Please upload a screenshot of your payment.");
            return;
        }

        setSubmitting(true);
        try {
            // 1. Upload Image
            const formData = new FormData();
            formData.append('image', {
                uri: Platform.OS === 'android' ? proofImage.uri : proofImage.uri.replace('file://', ''),
                type: proofImage.type || 'image/jpeg',
                name: proofImage.fileName || 'payment_proof.jpg',
            });

            const uploadRes = await axios.post(`${APIURL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${user.token}`,
                },
            });

            const imageUrl = uploadRes.data;

            // 2. Submit Subscription Request
            await axios.post(`${APIURL}/chit-plans/${selectedPlanForSub._id}/subscribe`, {
                proofImage: imageUrl,
                transactionId,
                note: subNote,
                amount: selectedPlanForSub.type === 'unlimited' ? subscriptionAmount : undefined,
                goldRate: lockedGoldRate || goldRate // Send the rate locked in modal
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            setSubmitting(false);
            setShowSubscribeModal(false);
            setAlertConfig({
                visible: true,
                title: 'Success',
                message: 'Your subscription has been successfully recorded and approved.',
                type: 'success'
            });
            fetchPlans(); // status might not update immediately until approved, but good to refresh
            fetchMySubscriptions(); // Refresh to see pending state if handled
        } catch (error) {
            console.error("Subscription Error:", error);
            setSubmitting(false);
            const msg = error.response?.data?.message || 'Failed to submit request';
            Alert.alert("Error", msg);
        }
    };

    if (loading && !merchant) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS?.primary} />
                <Text style={{ marginTop: 10, color: COLORS?.secondary }}>Loading Merchant...</Text>
            </View>
        );
    }

    if (!merchant) {
        return (
            <View style={styles.centerContainer}>
                <Icon name="store-slash" size={50} color={COLORS?.light} />
                <Text style={{ marginTop: 20, fontSize: 18, color: COLORS?.secondary }}>No merchant found.</Text>
            </View>
        );
    }

    // --- RENDER COMPONENTS ---

    const renderHeader = () => (
        <View style={styles.header}>
            <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'transparent']}
                style={styles.headerGradient}
            />
            {merchant.shopImages && merchant.shopImages.length > 0 ? (
                <Image
                    source={{ uri: `${BASE_URL}${merchant.shopImages[0]}` }}
                    style={styles.coverImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.coverImage, { backgroundColor: COLORS?.primary, justifyContent: 'center', alignItems: 'center' }]}>
                    <Icon name="store" size={60} color="#fff" />
                </View>
            )}
        </View>
    );

    const renderMerchantProfile = () => (
        <View style={styles.profileSection}>
            <View style={styles.profileRow}>
                <View style={styles.profileLogoContainer}>
                    {merchant.shopLogo ? (
                        <Image source={{ uri: `${BASE_URL}${merchant.shopLogo}` }} style={styles.profileLogo} />
                    ) : (
                        <Text style={styles.logoText}>{merchant.name?.charAt(0)}</Text>
                    )}
                </View>
                <View style={styles.profileDetails}>
                    <Text style={styles.profileName}>{merchant.name}</Text>
                    <View style={styles.profileLocationRow}>
                        <Icon name="map-marker-alt" size={14} color={COLORS?.secondary} style={{ marginRight: 5 }} />
                        <Text style={styles.profileAddress} numberOfLines={2}>{merchant.address || 'Address not available'}</Text>
                    </View>
                    {merchant.upiId && (
                        <View style={styles.profileUpiRow}>
                            <Icon name="university" size={12} color={COLORS?.primary} style={{ marginRight: 5 }} />
                            <Text style={styles.profileUpiText}>UPI: {merchant.upiId}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    const renderInfoSection = () => (
        <View style={styles.sectionContainer}>
            <View style={styles.infoGrid}>
                <TouchableOpacity
                    style={styles.infoItem}
                    onPress={() => {
                        if (merchant.phone) {
                            Linking.openURL(`tel:${merchant.phone}`).catch(err => console.error("Could not open dialpad", err));
                        }
                    }}
                >
                    <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                        <Icon name="phone-alt" size={18} color="#1565C0" />
                    </View>
                    <Text style={styles.infoLabel}>Call Us</Text>
                    <Text style={styles.infoValue}>{merchant.phone}</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                    style={styles.infoItem}
                    onPress={() => {
                        const phone = merchant.phoneNumber || merchant.phone;
                        if (phone) {
                            // Assume Indian number if 10 digits
                            const formattedPhone = phone.toString().length === 10 ? `+91${phone}` : phone;
                            Linking.openURL(`whatsapp://send?phone=${formattedPhone}`).catch(() => {
                                Alert.alert("Error", "Make sure WhatsApp is installed on your device");
                            });
                        }
                    }}
                >
                    <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                        <Icon name="whatsapp" size={20} color="#2E7D32" />
                    </View>
                    <Text style={styles.infoLabel}>Chat</Text>
                    <Text style={styles.infoValue}>{merchant.phoneNumber || merchant.phone}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderGallery = () => {
        if (!merchant.shopImages || merchant.shopImages.length === 0) return null;
        return (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Gallery</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                    {merchant.shopImages.map((img, index) => (
                        <TouchableOpacity key={index} onPress={() => setSelectedImage(`${BASE_URL}${img}`)}>
                            <Image source={{ uri: `${BASE_URL}${img}` }} style={styles.galleryImage} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderPlanCard = ({ item }) => {
        const isGold = item.returnType === 'Gold';

        return (
            <View style={styles.planCard}>
                <View style={[styles.planHeader, isGold ? styles.goldHeader : styles.cashHeader]}>
                    <Text style={[styles.planTypeBadge, { color: isGold ? '#856404' : '#155724' }]}>
                        {isGold ? 'GOLD SCHEME' : 'CASH SCHEME'}
                    </Text>
                    <View style={styles.durationBadge}>
                        <Icon name="clock" size={12} color="#fff" />
                        <Text style={styles.durationText}>
                            {item.type === 'unlimited' ? 'No Limit' : `${item.durationMonths} Months`}
                        </Text>
                    </View>
                </View>

                <View style={styles.planBody}>
                    <Text style={styles.planName}>{item.planName}</Text>
                    {!!item.description && (
                        <Text style={styles.planDescription}>{item.description}</Text>
                    )}

                    <View style={styles.amountRow}>
                        <View>
                            <Text style={styles.amountLabel}>{item.type === 'unlimited' ? 'Min Investment' : 'Monthly'}</Text>
                            <Text style={styles.amountValue}>₹{item.monthlyAmount}</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View>
                            <Text style={styles.amountLabel}>Total Value</Text>
                            <Text style={styles.totalValue}>
                                {item.type === 'unlimited' ? 'Unlimited' : `₹${item.totalAmount?.toLocaleString()}`}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.subscribeBtn}
                        onPress={() => handleSubscribePress(item)}
                        disabled={submitting}
                    >
                        <Text style={styles.subscribeBtnText}>
                            SUBSCRIBE NOW
                        </Text>
                    </TouchableOpacity>
                </View>
            </View >
        );
    };

    return (
        <LinearGradient
            colors={['#f2e07bff', '#c1ab8eff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }} style={styles.container}>

            <FlatList
                ListHeaderComponent={
                    <>
                        {renderHeader()}

                        <View style={{ marginTop: -30, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#FAFBFC', overflow: 'hidden' }}>
                            <LinearGradient
                                colors={['#c1ab8eff', '#f2e07bff']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}>
                                {renderMerchantProfile()}
                                {renderInfoSection()}
                                {renderGallery()}
                                <View style={[styles.sectionContainer, { paddingBottom: 10 }]}>
                                    <Text style={styles.sectionTitle}>Available Plans</Text>
                                </View>
                            </LinearGradient>

                        </View>
                    </>
                }
                data={plans}
                renderItem={renderPlanCard}
                keyExtractor={item => item._id}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    loadingPlans ? (
                        <ActivityIndicator style={{ marginTop: 20 }} size="large" color={COLORS?.primary} />
                    ) : (
                        <Text style={styles.emptyText}>No plans available at the moment.</Text>
                    )
                }
            />

            {/* Image Modal */}
            <Modal visible={!!selectedImage} transparent={true} onRequestClose={() => setSelectedImage(null)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeModal} onPress={() => setSelectedImage(null)}>
                        <Icon name="times" size={24} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />}
                </View>
            </Modal>

            {/* Subscribe UPI Modal */}
            <Modal visible={showSubscribeModal} transparent={true} animationType="slide" onRequestClose={() => setShowSubscribeModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.bottomModalContent}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Subscribe to {selectedPlanForSub?.planName}</Text>
                            <TouchableOpacity onPress={() => setShowSubscribeModal(false)}>
                                <Icon name="times" size={20} color={COLORS?.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            <View style={styles.upiCard}>
                                <Text style={styles.upiLabel}>Merchant UPI Details (Tap to Pay)</Text>
                                <TouchableOpacity style={styles.upiRow} onPress={handleUpiPayment}>
                                    <Text style={styles.upiValue}>{merchant?.upiId || 'Not Available'}</Text>
                                    <Icon name="external-link-alt" size={16} color={COLORS?.primary} style={{ marginLeft: 10 }} />
                                    <Text style={{ marginLeft: 5, color: COLORS?.primary, fontSize: 12, fontWeight: 'bold' }}>PAY NOW</Text>
                                </TouchableOpacity>
                                {merchant?.upiNumber && (
                                    <Text style={[styles.upiValue, { marginTop: 5 }]}>Number: {merchant.upiNumber}</Text>
                                )}
                                {selectedPlanForSub?.type === 'unlimited' ? (
                                    <View style={{ marginBottom: 15 }}>
                                        <Text style={styles.label}>Enter Investment Amount (Min ₹{selectedPlanForSub.monthlyAmount})</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder={`Minimum ₹${selectedPlanForSub.monthlyAmount}`}
                                            value={subscriptionAmount}
                                            onChangeText={setSubscriptionAmount}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                ) : (
                                    <Text style={styles.helperText}>Pay ₹{selectedPlanForSub?.monthlyAmount} using any UPI app.</Text>
                                )}

                                {(selectedPlanForSub?.returnType?.toLowerCase() === 'gold' || selectedPlanForSub?.type === 'unlimited') && goldRate > 0 && (
                                    <View style={styles.goldCalculationContainer}>
                                        <View style={styles.goldPriceRow}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={[styles.liveIndicator, { backgroundColor: '#4CAF50' }]} />
                                                <Text style={styles.goldPriceText}>Live Price (24K): ₹{(lockedGoldRate || goldRate).toFixed(2)}/gm</Text>
                                            </View>
                                        </View>
                                        {/* Full width timer progression bar */}
                                        <View style={styles.fullWidthTimerContainer}>
                                            <View style={[styles.timerProgress, { width: `${(goldRefreshTimer / 60) * 100}%` }]} />
                                        </View>
                                        <View style={styles.calcRow}>
                                            <View style={styles.calcBox}>
                                                <Text style={styles.calcLabel}>Allocated Weight</Text>
                                                <Text style={styles.calcValue}>
                                                    {((selectedPlanForSub?.type === 'unlimited' ? Number(subscriptionAmount) : selectedPlanForSub?.monthlyAmount) / (lockedGoldRate || goldRate)).toFixed(3)}g
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.goldRefreshHint}>
                                            * Live gold rates refresh automatically every 60 seconds.
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Transaction ID / Reference No (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter UPI numeric ID"
                                    value={transactionId}
                                    onChangeText={setTransactionId}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Notes (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Any notes for merchant..."
                                    value={subNote}
                                    onChangeText={setSubNote}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Payment Screenshot (Mandatory) *</Text>
                                <TouchableOpacity style={styles.uploadBtn} onPress={handleChoosePhoto}>
                                    {proofImage ? (
                                        <Image source={{ uri: proofImage.uri }} style={styles.uploadedThumb} />
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Icon name="cloud-upload-alt" size={24} color={COLORS?.primary} />
                                            <Text style={styles.uploadText}>Tap to Upload</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                                onPress={submitSubscription}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit</Text>}
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'linear-gradient(to right, #c1ab8eff, #f2e07bff, #915200)' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: { height: 220, position: 'relative' },
    coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, zIndex: 1 },

    // Profile Section
    profileSection: { paddingHorizontal: 20, paddingTop: 20 },
    profileRow: { flexDirection: 'row', alignItems: 'center' },
    profileLogoContainer: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
        marginRight: 15, elevation: 4, overflow: 'hidden', borderWidth: 2, borderColor: '#fff'
    },
    profileLogo: { width: '100%', height: '100%', resizeMode: 'cover' },
    profileDetails: { flex: 1 },
    profileName: { fontSize: 22, fontWeight: 'bold', color: COLORS?.dark, marginBottom: 4 },
    profileLocationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    profileAddress: { color: COLORS?.secondary, fontSize: 13, flex: 1 },
    profileUpiRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, backgroundColor: '#F3E5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    profileUpiText: { color: COLORS?.primary, fontSize: 12, fontWeight: '600' },
    logoText: { fontSize: 30, fontWeight: 'bold', color: COLORS?.primary },

    // Sections
    sectionContainer: { paddingHorizontal: 20, marginTop: 24 },
    infoGrid: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 15, elevation: 2 },
    infoItem: { flex: 1, alignItems: 'center' },
    divider: { width: 1, backgroundColor: '#E0E0E0', marginHorizontal: 10 },
    iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    infoLabel: { fontSize: 12, color: COLORS?.secondary, marginBottom: 2 },
    infoValue: { fontSize: 14, fontWeight: '600', color: COLORS?.dark },

    // Gallery
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS?.dark, marginBottom: 15 },
    galleryImage: { width: 120, height: 120, borderRadius: 12, marginRight: 12, resizeMode: 'contain' },

    // Plans
    planCard: {
        backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 20, marginBottom: 20,
        elevation: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0'
    },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, alignItems: 'center' },
    goldHeader: { backgroundColor: '#FFF9C4' },
    cashHeader: { backgroundColor: '#D4EDDA' },
    planTypeBadge: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    durationBadge: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignItems: 'center' },
    durationText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },

    planBody: { padding: 20 },
    planName: { fontSize: 20, fontWeight: 'bold', color: COLORS?.dark, marginBottom: 5 },
    planDescription: { fontSize: 13, color: COLORS?.secondary, marginBottom: 15, lineHeight: 18 },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    verticalDivider: { width: 1, backgroundColor: '#eee' },
    amountLabel: { fontSize: 12, color: COLORS?.secondary, marginBottom: 4 },
    amountValue: { fontSize: 18, fontWeight: '600', color: COLORS?.dark },
    totalValue: { fontSize: 22, fontWeight: '800', color: COLORS?.primary },

    subscribeBtn: {
        backgroundColor: COLORS?.primary, paddingVertical: 14, borderRadius: 12,
        alignItems: 'center', flexDirection: 'row', justifyContent: 'center'
    },
    subscribedBtn: { backgroundColor: '#90A4AE' },
    subscribeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },

    emptyText: { textAlign: 'center', color: COLORS?.secondary, marginTop: 40 },

    // Modal
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: width, height: 400 },
    closeModal: { position: 'absolute', top: 40, right: 20, padding: 10, zIndex: 10 },

    // Subscribe Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomModalContent: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, maxHeight: '85%'
    },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS?.dark },

    upiCard: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, marginBottom: 20 },
    upiLabel: { fontSize: 12, color: COLORS?.secondary, marginBottom: 4 },
    upiRow: { flexDirection: 'row', alignItems: 'center' },
    upiValue: { fontSize: 16, fontWeight: 'bold', color: COLORS?.dark },
    helperText: { fontSize: 12, color: COLORS?.secondary, marginTop: 8, fontStyle: 'italic' },

    formGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: COLORS?.dark, marginBottom: 8 },
    input: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: COLORS?.dark
    },
    uploadBtn: {
        borderWidth: 1, borderColor: COLORS?.primary, borderRadius: 12,
        height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFDFD'
    },
    uploadText: { marginTop: 8, color: COLORS?.primary, fontSize: 14, fontWeight: '600' },
    uploadedThumb: { width: '100%', height: '100%', borderRadius: 12 },

    submitBtn: {
        backgroundColor: COLORS?.primary, paddingVertical: 16, borderRadius: 12,
        alignItems: 'center', marginTop: 10
    },
    submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    // Gold Calculation Styles
    goldCalculationContainer: {
        marginTop: 15,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    goldPriceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#FEF3C7',
    },
    liveIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#DC2626',
        marginRight: 6,
    },
    goldPriceText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#92400E',
    },
    fullWidthTimerContainer: {
        width: '100%',
        height: 6,
        backgroundColor: '#FEF3C7',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
    },
    timerProgress: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#FCD34D',
    },
    calcRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    calcBox: {
        flex: 1,
        alignItems: 'center',
    },
    calcLabel: {
        fontSize: 10,
        color: '#B45309',
        marginBottom: 2,
    },
    calcValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    goldRefreshHint: {
        fontSize: 10,
        color: '#92400E',
        fontStyle: 'italic',
        marginTop: 10,
        textAlign: 'center',
        opacity: 0.8,
    },
});

export default MerchantsTab;