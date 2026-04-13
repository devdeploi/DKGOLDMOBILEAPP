/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Modal,
    Linking,
    TextInput,
    ScrollView,
    RefreshControl,
    LayoutAnimation,
    Platform,
    UIManager,
    Animated,
    Alert,
    Keyboard
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../styles/theme';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import { APIURL, BASE_URL } from '../constants/api';
import CustomAlert from './CustomAlert';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import dkLogo from '../assets/DK.png';
import safproLogo from '../../public/assests/Safpro-logo.png';
import RNFS from 'react-native-fs';
import DateTimePicker from '@react-native-community/datetimepicker';
import GoldTicker from './GoldTicker';
import { useGoldRate } from '../context/GoldRateContext';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const SkeletonSubscriber = () => {
    const fadeAnim = React.useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [fadeAnim]);

    return (
        <Animated.View style={[styles.subscriberCard, { opacity: fadeAnim }]}>
            <View style={styles.subHeader}>
                <View style={styles.userInfo}>
                    <View style={[styles.avatar, { backgroundColor: '#e0e0e0' }]} />
                    <View style={{ marginLeft: 10 }}>
                        <View style={{ width: 120, height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 6 }} />
                        <View style={{ width: 80, height: 10, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                    </View>
                </View>
                <View style={{ width: 60, height: 20, backgroundColor: '#e0e0e0', borderRadius: 6 }} />
            </View>
            <View style={styles.subBody}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ width: 50, height: 10, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                    <View style={{ width: 80, height: 10, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                </View>
                <View style={{ height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, marginBottom: 10 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fafbfc', padding: 10, borderRadius: 8 }}>
                    <View style={{ width: 40, height: 20, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                    <View style={{ width: 40, height: 20, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                    <View style={{ width: 40, height: 20, backgroundColor: '#e0e0e0', borderRadius: 4 }} />
                </View>
            </View>
        </Animated.View>
    );
};

const MerchantUsers = ({ user }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [planFilter, setPlanFilter] = useState('all');
    const [amountFilter, setAmountFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(true);
    const [subscribers, setSubscribers] = useState([]);
    const searchInputRef = React.useRef(null);
    const [lastToggleTime, setLastToggleTime] = useState(0);
    const [pendingPayments, setPendingPayments] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedSubId, setExpandedSubId] = useState(null);

    // Date Search State
    const [dateQuery, setDateQuery] = useState('');
    const [dailyPayments, setDailyPayments] = useState(null);
    const [isSearchingDate, setIsSearchingDate] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDateInput, setShowDateInput] = useState(false);
    
    // Global Gold Rate Context
    const { goldRate, refreshTimer: lockedTimer } = useGoldRate();
    const [lockedGoldRate, setLockedGoldRate] = useState(0);
    // Pagination State
    const BATCH_SIZE = 5;
    const [displayedSubscribers, setDisplayedSubscribers] = useState([]);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    const handleDateChange = useCallback((event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (event.type === 'set' && selectedDate) {
            const currentDate = selectedDate || new Date();
            const formatted = currentDate.toISOString().split('T')[0];
            setDateQuery(formatted);
        }
    }, [setShowDatePicker, setDateQuery]);

    const executeSettlement = async () => {
        if (!selectedWithdrawalRequest) return;
        if (!settlementForm.amount || !settlementForm.transactionId) {
            showCustomAlert("Error", "Please enter amount and transaction ID", "error");
            return;
        }

        setSubmittingSettlement(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post(`${APIURL}/chit-plans/${selectedWithdrawalRequest.plan._id}/settle`, {
                userId: selectedWithdrawalRequest.user._id,
                subscriptionId: selectedWithdrawalRequest._id || selectedWithdrawalRequest.subscriberId,
                amount: settlementForm.amount,
                settlementType: settlementForm.type,
                transactionId: settlementForm.transactionId,
                note: settlementForm.note
            }, config);

            setSettlementModalVisible(false);
            await fetchData();

            showCustomAlert("Success", "Settlement processed successfully", "success", [
                {
                    text: "Invoice",
                    onPress: () => {
                        generateSettlementReceipt(selectedWithdrawalRequest, settlementForm);
                    }
                },
                { text: "OK" }
            ]);
        } catch (error) {
            console.error("Settlement failed", error);
            showCustomAlert("Error", "Failed to process settlement", "error");
        } finally {
            setSubmittingSettlement(false);
        }
    };

    const fetchUndeliveredPayments = async (subscriber) => {
        setLoadingPayments(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const subId = subscriber._id || subscriber.subscriberId;
            const { data } = await axios.get(`${APIURL}/chit-plans/payments/undelivered/${subId}`, config);
            setUndeliveredPayments(data);
        } catch (error) {
            console.error("Failed to fetch undelivered payments", error);
        } finally {
            setLoadingPayments(false);
        }
    };

    const executeDelivery = async () => {
        if (!selectedForDelivery) return;
        
        if (deliveryForm.isPartial) {
            if (!deliveryForm.goldWeight && !deliveryForm.amount) {
                showCustomAlert("Error", "Please enter gold weight or amount for partial delivery", "error");
                return;
            }
        }

        setSubmittingDelivery(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const body = {
                userId: selectedForDelivery.user._id,
                subscriptionId: selectedForDelivery._id || selectedForDelivery.subscriberId,
                isPartial: deliveryForm.isPartial,
                deliveryType: deliveryForm.type,
                goldWeight: deliveryForm.goldWeight,
                amount: deliveryForm.amount,
                paymentIds: deliveryForm.paymentIds,
                transactionId: deliveryForm.transactionId,
                notes: deliveryForm.notes
            };

            await axios.post(`${APIURL}/chit-plans/${selectedForDelivery.plan._id}/deliver`, body, config);

            setDeliveryModalVisible(false);
            await fetchData();

            showCustomAlert("Success", deliveryForm.isPartial ? "Partial delivery recorded" : "Marked as fully delivered", "success", [
                {
                    text: "Invoice",
                    onPress: () => {
                        if (deliveryForm.isPartial) {
                            generatePartialDeliveryReceipt(selectedForDelivery, {
                                ...deliveryForm,
                                deliveredDate: new Date()
                            });
                        } else {
                            // Full delivery uses standard receipt or settlement?
                            // For now let's just show success
                        }
                    }
                },
                { text: "OK" }
            ]);
        } catch (error) {
            console.error("Delivery failed", error);
            showCustomAlert("Error", error.response?.data?.message || "Failed to process delivery", "error");
        } finally {
            setSubmittingDelivery(false);
        }
    };

    const handleApproveClosure = (subscriber) => {
        showCustomAlert(
            "Approve Closure?",
            `Are you sure you want to approve ${subscriber.user.name}'s closure request?`,
            "warning",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const config = { headers: { Authorization: `Bearer ${user.token}` } };
                            await axios.post(`${APIURL}/chit-plans/${subscriber.plan._id}/approve-closure`, {
                                subscriptionId: subscriber._id || subscriber.subscriberId
                            }, config);
                            showCustomAlert("Success", "Closure request approved. You can now settle the plan.", "success");
                            fetchData();
                        } catch (error) {
                            showCustomAlert("Error", error.response?.data?.message || "Failed to approve closure", "error");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDirectClose = async (subscriber) => {
        showCustomAlert(
            "Close Plan Prematurely?",
            `Are you sure you want to close ${subscriber.user.name}'s plan?`,
            "warning",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Close Plan",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const config = { headers: { Authorization: `Bearer ${user.token}` } };
                            await axios.post(`${APIURL}/chit-plans/${subscriber.plan._id}/close`, {
                                subscriptionId: subscriber._id || subscriber.subscriberId
                            }, config);
                            showCustomAlert("Success", "Plan closed successfully.", "success");
                            fetchData();
                        } catch (error) {
                            showCustomAlert("Error", error.response?.data?.message || "Failed to close plan", "error");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDateSearch = async () => {
        if (!dateQuery) return;
        setIsSearchingDate(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${APIURL}/payments/search/date?date=${dateQuery}`, config);
            setDailyPayments(data);
        } catch (error) {
            console.error("Date search failed", error);
            showCustomAlert("Error", "Failed to fetch payments for this date.", "error");
        } finally {
            setIsSearchingDate(false);
        }
    };

    const clearDateSearch = () => {
        setDailyPayments(null);
        setDateQuery('');
    };

    // Note: Timer and rate changes are now globally maintained via GoldRateContext

    // Action States
    const [actionLoading, setActionLoading] = useState(null); // ID of payment being processed

    // Alert State
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

    const showCustomAlert = (title, message, type = 'info', buttons = []) => {
        setAlertConfig({ visible: true, title, message, type, buttons });
    };

    // Manual Payment State
    const [showManualModal, setShowManualModal] = useState(false);
    const [selectedSubscriber, setSelectedSubscriber] = useState(null);
    const [manualForm, setManualForm] = useState({ amount: '', notes: '', customGoldRate: '', type: 'CASH' });
    const [selectedPaymentDate, setSelectedPaymentDate] = useState(new Date());
    const [manualDateInput, setManualDateInput] = useState({
        day: new Date().getDate().toString().padStart(2, '0'),
        month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
        year: new Date().getFullYear().toString()
    });
    const [submittingManual, setSubmittingManual] = useState(false);
    
    // History Details State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Settlement State
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);
    const [settlementModalVisible, setSettlementModalVisible] = useState(false);
    const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] = useState(null);
    const [settlementForm, setSettlementForm] = useState({
        amount: '',
        transactionId: '',
        note: '',
        type: 'Cash'
    });
    const [submittingSettlement, setSubmittingSettlement] = useState(false);

    // Delivery State
    const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
    const [selectedForDelivery, setSelectedForDelivery] = useState(null);
    const [deliveryForm, setDeliveryForm] = useState({
        isPartial: false,
        type: 'Gold',
        goldWeight: '',
        amount: '',
        notes: '',
        paymentIds: [],
        transactionId: ''
    });
    const [undeliveredPayments, setUndeliveredPayments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [submittingDelivery, setSubmittingDelivery] = useState(false);

    // Proof State
    const [previewProofUrl, setPreviewProofUrl] = useState(null);
    const [downloadingProof, setDownloadingProof] = useState(false);

    // User Details State
    const [selectedUserForModal, setSelectedUserForModal] = useState(null);
    const [userDetailsModalVisible, setUserDetailsModalVisible] = useState(false);

    // --- PDF Generation Logic ---

    const fetchImageAsBase64 = async (url) => {
        try {
            // If it's a local file from resolveAssetSource
            if (url && (url.startsWith('file://') || url.startsWith('/'))) {
                const cleanPath = url.replace('file://', '');
                const base64Data = await RNFS.readFile(cleanPath, 'base64');
                return `data:image/png;base64,${base64Data}`;
            }

            // Fallback for remote URLs or others
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Error fetching image:", error);
            return null;
        }
    };

    const shareFile = async (filePath) => {
        try {
            const shareOptions = {
                title: 'Share PDF',
                url: Platform.OS === 'android' ? `file://${filePath}` : `file://${filePath}`,
                type: 'application/pdf',
                failOnCancel: false
            };
            await Share.open(shareOptions);
        } catch (error) {
            console.log("Share Error:", error);
        }
    };

    const createAndDownloadPDF = async (html, fileName) => {
        try {
            const cleanFileName = fileName.replace(/[^a-z0-9]/gi, '_');
            const options = {
                html,
                fileName: cleanFileName,
                directory: 'Documents',
            };

            const file = await generatePDF(options);

            if (!file || !file.filePath) {
                throw new Error("Failed to generate PDF");
            }

            if (Platform.OS === 'android') {
                const downloadPath = `${RNFS.DownloadDirectoryPath}/${cleanFileName}.pdf`;
                try {
                    // Check if file exists and delete it before copying
                    const exists = await RNFS.exists(downloadPath);
                    if (exists) {
                        await RNFS.unlink(downloadPath);
                    }
                    await RNFS.copyFile(file.filePath, downloadPath);
                    showCustomAlert("Success", "PDF saved successfully to Downloads folder", "success", [
                        {
                            text: "Share",
                            onPress: () => shareFile(downloadPath)
                        },
                        { text: "OK" }
                    ]);
                } catch (copyErr) {
                    console.error("File Copy Error:", copyErr);
                    // Fallback to sharing the original file if copy fails
                    await shareFile(file.filePath);
                }
            } else {
                // For iOS, trigger the share sheet immediately as "Documents" isn't easily accessible
                await shareFile(file.filePath);
            }

        } catch (error) {
            console.error("PDF Download Error:", error);
            showCustomAlert("Error", "Failed to generate PDF", "error");
        }
    };

    const generateInvoice = async (payment, subscriber) => {
        setLoading(true);
        try {
            // 1. Load Logos
            let dkLogoImgTag = 'DK';
            let safproLogoImgTag = 'Safpro';

            if (Platform.OS === 'android' && !__DEV__) {
                dkLogoImgTag = `<img src="file:///android_asset/DK.png" style="width: 70px; height: auto;" />`;
                safproLogoImgTag = `<img src="file:///android_asset/Safpro-logo.png" style="width: 120px; height: auto;" />`;
            } else {
                const dkLogoUrl = Image.resolveAssetSource(dkLogo).uri;
                const dkLogoBase64 = await fetchImageAsBase64(dkLogoUrl);
                if (dkLogoBase64) dkLogoImgTag = `<img src="${dkLogoBase64}" style="width: 70px; height: auto;" />`;

                const safproLogoUrl = Image.resolveAssetSource(safproLogo).uri;
                const safproLogoBase64 = await fetchImageAsBase64(safproLogoUrl);
                if (safproLogoBase64) safproLogoImgTag = `<img src="${safproLogoBase64}" style="width: 120px; height: auto;" />`;
            }

            let shopLogoImgTag = '';
            if (user.shopLogo) {
                const shopLogoUrl = `${BASE_URL}${user.shopLogo}`;
                const shopLogoBase64 = await fetchImageAsBase64(shopLogoUrl);
                if (shopLogoBase64) {
                    shopLogoImgTag = `<img src="${shopLogoBase64}" style="width: 70px; height: 70px; border-radius: 35px; object-fit: cover;" />`;
                }
            }

            // 2. Data Prep
            const planName = subscriber.plan?.planName || subscriber.chitPlan?.planName || 'Unknown Plan';
            console.log(payment);

            // Use the established payment date from the record, fallback to now only if missing
            const paymentDateVal = payment.paymentDate || payment.date || new Date();
            const paymentDate = new Date(paymentDateVal).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const generationDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const merchantName = user.name.toUpperCase();
            const customerName = subscriber.user.name.toUpperCase();

            // 3. HTML Template
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #915200; }
                        .logo-left, .logo-right { width: 100px; display: flex; align-items: center; justify-content: center; }
                        .header-center { text-align: center; flex: 1; margin: 0 10px; }
                        .header-center h2 { color: #915200; margin: 0; font-size: 18px; text-transform: uppercase; }
                        .header-center p { margin: 2px 0; font-size: 10px; color: #666; }
                        
                        .title-section { text-align: center; margin-bottom: 30px; }
                        .title-section h1 { color: #915200; margin: 0; font-size: 24px; letter-spacing: 2px; }
                        .title-section p { color: #666; margin: 5px 0 0; font-size: 12px; }

                        .grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
                        .col { width: 45%; }
                        .label { color: #915200; font-weight: bold; font-size: 12px; margin-bottom: 5px; }
                        .name { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                        .info { font-size: 12px; color: #555; line-height: 1.4; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th { background-color: #915200; color: white; padding: 10px; text-align: left; font-size: 12px; }
                        td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
                        .total-row td { background-color: #fffbf0; font-weight: bold; color: #915200; }
                        .footer { text-align: center; margin-top: 50px; color: #915200; font-size: 12px; border-top: 1px solid #eee; padding-top: 30px; }
                        .brand-strip { background-color: #915200; color: white; text-align: center; padding: 5px; font-size: 10px; position: fixed; bottom: 0; left: 0; right: 0; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo-left">${dkLogoImgTag}</div>
                        <div class="header-center">
                            <h2>${merchantName}</h2>
                            <p>${user.address || ''}</p>
                            <p>Phone: ${user.phone}${user.email ? ' | ' + user.email : ''}</p>
                        </div>
                        <div class="logo-right">${shopLogoImgTag}</div>
                    </div>

                    <div class="title-section">
                        <h1>PAYMENT RECEIPT</h1>
                        <p>Date: ${generationDate}</p>
                    </div>

                    <div class="grid">
                        <div class="col">
                            <div class="label">TO:</div>
                            <div class="name">${customerName}</div>
                            <div class="info">
                                Phone: ${subscriber.user.phone}<br/>
                                ${subscriber.user.email ? subscriber.user.email : ''}
                            </div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Details</th>
                                <th style="text-align: right;">Amount (INR)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Plan Name</td>
                                <td>${planName}</td>
                                <td style="text-align: right;"></td>
                            </tr>
                            <tr>
                                <td>Payment Mode</td>
                                <td>${payment.type || "Offline"}</td>
                                <td style="text-align: right;"></td>
                            </tr>
                            <tr>
                                <td>Payment Date</td>
                                <td>${paymentDate}</td>
                                <td style="text-align: right;"></td>
                            </tr>
                             <tr>
                                <td>Notes</td>
                                <td>${payment.notes || "-"}</td>
                                <td style="text-align: right;"></td>
                            </tr>
                            <tr class="total-row">
                                <td colspan="2">TOTAL RECEIVED</td>
                                <td style="text-align: right;">Rs. ${Number(payment.amount).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="footer">
                        <p>Thank you!</p>
                        <p style="font-size: 10px; color: #888; font-weight: normal;">If you have any questions, please contact the merchant.</p>
                        
                        <div style="margin-top: 20px;">
                            <p style="font-size: 10px; color: #999; margin-bottom: 5px;">Powered By</p>
                            ${safproLogoImgTag}
                        </div>
                    </div>
                </body>
                </html>
            `;

            await createAndDownloadPDF(html, `Receipt_${subscriber.user.name}_${Date.now()}`);

        } catch (error) {
            console.error("Invoice Gen Error", error);
            showCustomAlert("Error", "Failed to generate invoice", "error");
        } finally {
            setLoading(false);
        }
    };

    const generateSettlementReceipt = async (subscriber, settlementData) => {
        setLoading(true);
        try {
            // Recycled Logo Logic
            let dkLogoImgTag = 'DK';
            let safproLogoImgTag = 'Safpro';
            let shopLogoImgTag = null;

            if (Platform.OS === 'android' && !__DEV__) {
                dkLogoImgTag = `<img src="file:///android_asset/DK.png" style="width: 70px; height: auto;" />`;
                safproLogoImgTag = `<img src="file:///android_asset/Safpro-logo.png" style="width: 120px; height: auto;" />`;
            } else {
                const dkLogoUrl = Image.resolveAssetSource(dkLogo).uri;
                const dkLogoBase64 = await fetchImageAsBase64(dkLogoUrl);
                if (dkLogoBase64) dkLogoImgTag = `<img src="${dkLogoBase64}" style="width: 70px; height: auto;" />`;

                const safproLogoUrl = Image.resolveAssetSource(safproLogo).uri;
                const safproLogoBase64 = await fetchImageAsBase64(safproLogoUrl);
                if (safproLogoBase64) safproLogoImgTag = `<img src="${safproLogoBase64}" style="width: 120px; height: auto;" />`;
            }

            if (user.shopLogo) {
                const shopLogoBase64 = await fetchImageAsBase64(`${BASE_URL}${user.shopLogo}`);
                if (shopLogoBase64) {
                    shopLogoImgTag = `<img src="${shopLogoBase64}" style="width: 70px; height: auto;" />`;
                }
            }

            const merchantName = user.name.toUpperCase();
            const customerName = subscriber.user.name.toUpperCase();

            const html = `
                <html>
                <body style="font-family: Helvetica; padding: 20px;">
                    <div style="text-align: center; border-bottom: 2px solid #915200; padding-bottom: 20px; margin-bottom: 20px;">
                        ${shopLogoImgTag ? shopLogoImgTag : dkLogoImgTag}
                        <h2 style="color: #915200; margin: 10px 0;">${merchantName}</h2>
                        <h3 style="margin: 5px 0;">SETTLEMENT RECEIPT</h3>
                        <p style="color: #666; font-size: 12px;">Date: ${new Date().toLocaleDateString()}</p>
                        ${shopLogoImgTag ? `<div style="margin-top: 10px;">${shopLogoImgTag}</div>` : ''}
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <p><strong>To:</strong> ${customerName}</p>
                        <p><strong>Plan:</strong> ${subscriber.plan.planName}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Description</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Details</th>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Settlement Amount</td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">Rs. ${Number(settlementData.amount).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Settlement Type</td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${settlementData.type || 'Cash'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Transaction Ref</td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${settlementData.transactionId || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Note</td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${settlementData.note || '-'}</td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin-top: 40px; color: #888; font-size: 12px;">
                        <p>This amounts fully settles the chit plan.</p>
                        <div style="margin-top: 20px;">
                             ${safproLogoImgTag}
                        </div>
                    </div>
                </body>
                </html>
            `;

            await createAndDownloadPDF(html, `Settlement_${subscriber.user.name}_${Date.now()}`);
        } catch (error) {
            console.error(error);
            showCustomAlert("Error", "Failed to generate receipt", "error");
        } finally {
            setLoading(false);
        }
    };

    const generatePartialDeliveryReceipt = async (subscriber, deliveryData) => {
        setLoading(true);
        try {
            let dkLogoImgTag = 'DK';
            let safproLogoImgTag = 'Safpro';
            let shopLogoImgTag = '';

            if (Platform.OS === 'android' && !__DEV__) {
                dkLogoImgTag = `<img src="file:///android_asset/DK.png" style="width: 70px; height: auto;" />`;
                safproLogoImgTag = `<img src="file:///android_asset/Safpro-logo.png" style="width: 120px; height: auto;" />`;
            } else {
                const dkLogoUrl = Image.resolveAssetSource(dkLogo).uri;
                const dkLogoBase64 = await fetchImageAsBase64(dkLogoUrl);
                if (dkLogoBase64) dkLogoImgTag = `<img src="${dkLogoBase64}" style="width: 70px; height: auto;" />`;

                const safproLogoUrl = Image.resolveAssetSource(safproLogo).uri;
                const safproLogoBase64 = await fetchImageAsBase64(safproLogoUrl);
                if (safproLogoBase64) safproLogoImgTag = `<img src="${safproLogoBase64}" style="width: 120px; height: auto;" />`;
            }

            if (user.shopLogo) {
                const shopLogoBase64 = await fetchImageAsBase64(`${BASE_URL}${user.shopLogo}`);
                if (shopLogoBase64) shopLogoImgTag = `<img src="${shopLogoBase64}" style="width: 70px; height: auto;" />`;
            }

            const totalGold = subscriber.subscription.totalGoldWeight || 0;
            const deliveredGold = subscriber.subscription.deliveredGoldWeight || 0;
            const weightInThisDelivery = deliveryData.type === 'Gold' ? (parseFloat(deliveryData.goldWeight) || 0) : 0;
            const remainingWeight = totalGold - deliveredGold - weightInThisDelivery;

            const html = `
                <html>
                <body style="font-family: Helvetica; padding: 20px;">
                    <div style="text-align: center; border-bottom: 2px solid #915200; padding-bottom: 20px; margin-bottom: 20px;">
                        ${shopLogoImgTag || dkLogoImgTag}
                        <h2 style="color: #915200; margin: 10px 0;">${user.name.toUpperCase()}</h2>
                        <h3 style="margin: 5px 0;">PARTIAL DELIVERY RECEIPT</h3>
                        <p style="color: #666; font-size: 12px;">Date: ${new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <p><strong>To:</strong> ${subscriber.user.name.toUpperCase()}</p>
                        <p><strong>Plan:</strong> ${subscriber.plan.planName}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Description</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Details</th>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Delivery Type</td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${deliveryData.type}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Gold Weight</td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${Number(deliveryData.goldWeight).toFixed(3)}g</td>
                        </tr>
                         <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Amount Value</td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">Rs. ${Number(deliveryData.amount).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Transaction Ref</td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${deliveryData.transactionId || '-'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">Notes</td>
                            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${deliveryData.notes || '-'}</td>
                        </tr>
                    </table>

                    <div style="background-color: #fff9db; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                         <p style="margin: 0; font-weight: bold; color: #92400E;">Remaining Gold Weight in Plan: ${remainingWeight.toFixed(3)}g</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 50px; color: #915200;">
                        <p>This receipt acknowledges partial delivery of SAVED gold/cash.</p>
                        <p style="font-size: 10px; color: #888;">Powered By</p>
                        ${safproLogoImgTag}
                    </div>
                </body>
                </html>
            `;

            await createAndDownloadPDF(html, `PartialDelivery_${subscriber.user.name}_${Date.now()}`);
        } catch (error) {
            console.error(error);
            showCustomAlert("Error", "Failed to generate receipt", "error");
        } finally {
            setLoading(false);
        }
    };

    const generateStatement = async (subscriber, history) => {
        setLoading(true);
        try {
            // 1. Load Logos
            let dkLogoImgTag = 'DK';
            let safproLogoImgTag = 'Safpro';

            if (Platform.OS === 'android' && !__DEV__) {
                dkLogoImgTag = `<img src="file:///android_asset/DK.png" style="width: 70px; height: auto;" />`;
                safproLogoImgTag = `<img src="file:///android_asset/Safpro-logo.png" style="width: 120px; height: auto;" />`;
            } else {
                const dkLogoUrl = Image.resolveAssetSource(dkLogo).uri;
                const dkLogoBase64 = await fetchImageAsBase64(dkLogoUrl);
                if (dkLogoBase64) dkLogoImgTag = `<img src="${dkLogoBase64}" style="width: 70px; height: auto;" />`;

                const safproLogoUrl = Image.resolveAssetSource(safproLogo).uri;
                const safproLogoBase64 = await fetchImageAsBase64(safproLogoUrl);
                if (safproLogoBase64) safproLogoImgTag = `<img src="${safproLogoBase64}" style="width: 120px; height: auto;" />`;
            }

            let shopLogoImgTag = '';
            if (user.shopLogo) {
                const shopLogoUrl = `${BASE_URL}${user.shopLogo}`;
                const shopLogoBase64 = await fetchImageAsBase64(shopLogoUrl);
                if (shopLogoBase64) {
                    shopLogoImgTag = `<img src="${shopLogoBase64}" style="width: 70px; height: 70px; border-radius: 35px; object-fit: cover;" />`;
                }
            }

            const merchantName = user.name.toUpperCase();
            const customerName = subscriber.user.name.toUpperCase();
            const planName = subscriber.plan?.planName || 'Unknown Plan';
            const totalPlanAmount = subscriber.plan?.totalAmount || 0;

            let totalPaid = 0;
            const sortedHistory = [...history].sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));

            const rowsHtml = sortedHistory.map(pay => {
                if (pay.status === 'Completed') totalPaid += Number(pay.amount);
                return `
                    <tr>
                        <td>${new Date(pay.paymentDate || pay.createdAt).toLocaleDateString()}</td>
                        <td>${pay.notes || "Installment Payment"}</td>
                        <td>${pay.type === 'online' ? 'Online' : pay.type === 'offline' ? 'Offline' : pay.type}</td>
                        <td style="text-align: right;">Rs. ${Number(pay.amount).toFixed(2)}</td>
                    </tr>
                `;
            }).join('');

            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #915200; }
                        .logo-left, .logo-right { width: 100px; display: flex; align-items: center; justify-content: center; }
                        .header-center { text-align: center; flex: 1; margin: 0 10px; }
                        .header-center h2 { color: #915200; margin: 0; font-size: 18px; text-transform: uppercase; }
                        .header-center p { margin: 2px 0; font-size: 10px; color: #666; }
                        
                        .title-section { text-align: center; margin-bottom: 30px; }
                        .title-section h1 { color: #915200; margin: 0; font-size: 24px; letter-spacing: 2px; }
                        .title-section p { color: #666; margin: 5px 0 0; font-size: 12px; }

                        .grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
                        .col { width: 45%; }
                        .label { color: #915200; font-weight: bold; font-size: 12px; margin-bottom: 5px; }
                        .name { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                        .info { font-size: 12px; color: #555; line-height: 1.4; }
                        .plan-info { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; font-size: 12px; border-left: 4px solid #915200; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th { background-color: #915200; color: white; padding: 8px; text-align: left; font-size: 11px; }
                        td { padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; }
                        .total-row td { background-color: #fffbf0; font-weight: bold; color: #915200; }
                        .footer { text-align: center; margin-top: 50px; color: #915200; font-size: 12px; border-top: 1px solid #eee; padding-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo-left">${dkLogoImgTag}</div>
                        <div class="header-center">
                            <h2>${merchantName}</h2>
                            <p>${user.address || ''}</p>
                            <p>Phone: ${user.phone}${user.email ? ' | ' + user.email : ''}</p>
                        </div>
                        <div class="logo-right">${shopLogoImgTag}</div>
                    </div>

                    <div class="title-section">
                        <h1>STATEMENT OF ACCOUNT</h1>
                        <p>Generated On: ${new Date().toLocaleDateString()}</p>
                    </div>

                    <div class="grid">
                        <div class="col">
                            <div class="label">TO:</div>
                            <div class="name">${customerName}</div>
                            <div class="info">
                                Phone: ${subscriber.user.phone}<br/>
                            </div>
                        </div>
                    </div>

                    <div class="plan-info">
                        <strong>Plan:</strong> ${planName} (Total Value: Rs. ${Number(totalPlanAmount).toLocaleString()})
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th style="text-align: right;">Amount (INR)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                            <tr class="total-row">
                                <td colspan="3">TOTAL PAID</td>
                                <td style="text-align: right;">Rs. ${totalPaid.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    ${subscriber.subscription?.status === 'settled' ? (() => {
                    const details = subscriber.subscription.settlementDetails || {};
                    const settlementAmount = details.amount || totalPaid;
                    const settlementDate = details.settledDate ? new Date(details.settledDate).toLocaleDateString() : new Date().toLocaleDateString();
                    const settlementTxnId = details.transactionId || 'N/A';
                    const settlementNotes = details.note || 'Settled';

                    return `
                        <div style="margin-top: 30px; border-top: 2px dashed #915200; padding-top: 20px;">
                            <h3 style="color: #915200; text-align: center; margin-bottom: 20px; font-size: 16px;">SETTLEMENT DETAILS</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="background-color: #fffbf0;">
                                    <td style="font-weight: bold; color: #915200; width: 40%;">Settlement Date</td>
                                    <td style="text-align: right;">${settlementDate}</td>
                                </tr>
                                <tr>
                                    <td style="font-weight: bold; color: #915200;">Transaction ID</td>
                                    <td style="text-align: right;">${settlementTxnId}</td>
                                </tr>
                                <tr style="background-color: #fffbf0;">
                                    <td style="font-weight: bold; color: #915200;">Settlement Amount</td>
                                    <td style="text-align: right; font-weight: bold; color: #2E7D32;">Rs. ${Number(settlementAmount).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style="font-weight: bold; color: #915200;">Notes</td>
                                    <td style="text-align: right; font-style: italic;">${settlementNotes}</td>
                                </tr>
                            </table>
                            <p style="text-align: center; color: #2E7D32; font-weight: bold; margin-top: 15px; font-size: 14px;">✓ This plan has been fully settled.</p>
                        </div>
                        `;
                })() : ''}

                ${subscriber.subscription?.status === 'delivered_gold' ? (() => {
                    const details = subscriber.subscription.deliveryDetails || {};
                    const deliveredDate = details.deliveredDate ? new Date(details.deliveredDate).toLocaleDateString() : new Date().toLocaleDateString();
                    const deliveryNotes = details.notes || 'Gold Delivered';

                    return `
                        <div style="margin-top: 30px; border-top: 2px dashed #d4af37; padding-top: 20px;">
                            <h3 style="color: #d4af37; text-align: center; margin-bottom: 20px; font-size: 16px;">GOLD DELIVERY DETAILS</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="background-color: #fffbf0;">
                                    <td style="font-weight: bold; color: #d4af37; width: 40%;">Delivery Date</td>
                                    <td style="text-align: right;">${deliveredDate}</td>
                                </tr>
                                <tr>
                                    <td style="font-weight: bold; color: #915200;">Notes</td>
                                    <td style="text-align: right; font-style: italic;">${deliveryNotes}</td>
                                </tr>
                            </table>
                            <p style="text-align: center; color: #d4af37; font-weight: bold; margin-top: 15px; font-size: 14px;">✓ This plan has been completed and gold has been delivered.</p>
                        </div>
                        `;
                })() : ''}

                     <div class="footer">
                        <p>Thank you for your business!</p>
                        <div style="margin-top: 20px;">
                            <p style="font-size: 10px; color: #999; margin-bottom: 5px;">Powered By</p>
                            ${safproLogoImgTag}
                        </div>
                    </div>
                </body>
                </html>
            `;

            await createAndDownloadPDF(html, `Statement_${subscriber.user.name}_${Date.now()}`);

        } catch (error) {
            console.error("Statement Gen Error", error);
            showCustomAlert("Error", "Failed to generate statement", "error");
        } finally {
            setLoading(false);
        }
    };

    const openHistoryModal = async (subscriber) => {
        setSelectedSubscriber(subscriber);
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const subId = subscriber._id || subscriber.subscriberId;
            const { data } = await axios.get(`${APIURL}/payments/history/${subscriber.plan._id}/${subscriber.user._id}?subscriptionId=${subId}`, config);
            setPaymentHistory(data);
        } catch (error) {
            console.error("Error fetching history", error);
            showCustomAlert("Error", "Failed to fetch payment history", "error");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleDeletePayment = (paymentId) => {
        showCustomAlert(
            "Delete Payment?",
            "This will permanently remove this payment record and reverse the subscriber's totals.",
            "warning",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const config = { headers: { Authorization: `Bearer ${user.token}` } };
                            await axios.delete(`${APIURL}/payments/${paymentId}`, config);
                            // Refresh history
                            const subId = selectedSubscriber._id || selectedSubscriber.subscriberId;
                            const { data } = await axios.get(`${APIURL}/payments/history/${selectedSubscriber.plan._id}/${selectedSubscriber.user._id}?subscriptionId=${subId}`, config);
                            setPaymentHistory(data);
                            // Refresh subscriber list
                            fetchData();
                            showCustomAlert("Deleted", "Payment record removed.", "success");
                        } catch (error) {
                            showCustomAlert("Error", "Failed to delete payment", "error");
                        }
                    }
                }
            ]
        );
    };

    // Fetch Data
    const fetchData = useCallback(async () => {
        try {
            if (!user) return;
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            // 1. Fetch Pending Payments
            const pendingRes = await axios.get(`${APIURL}/payments/offline/pending`, config);
            setPendingPayments(pendingRes.data);

            // 2. Fetch Subscribers
            const subRes = await axios.get(`${APIURL}/chit-plans/my-subscribers`, config);

            // No longer deduplicating to allow multiple subscriptions
            setSubscribers(subRes.data);

            // 3. Filter Action Requests (Only pending closure and withdrawal requests)
            const requests = subRes.data.filter(
                s => s.subscription.status === 'requested_withdrawal' ||
                    s.subscription.status === 'requested_closure'
            );
            setWithdrawalRequests(requests);


        } catch (error) {
            console.error("Error fetching merchant users data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const toggleDateInput = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowDateInput(!showDateInput);
    };

    const toggleSearch = () => {
        const now = Date.now();
        if (now - lastToggleTime < 300) return; // Prevent rapid clicking flickering
        setLastToggleTime(now);

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const nextShowSearch = !showSearch;
        setShowSearch(nextShowSearch);
        
        if (!nextShowSearch) {
            setSearchQuery('');
            Keyboard.dismiss();
        } else {
            // Focus after animation completes to prevent blinking/jumping on Android
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 300);
        }
    };

    const uniquePlans = React.useMemo(() => {
        const plans = subscribers.map(s => s.plan?.planName).filter(Boolean);
        return [...new Set(plans)];
    }, [subscribers]);

    const allFilteredSubscribers = React.useMemo(() => {
        let result = [...subscribers];

        // 1. Global Search
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            result = result.filter(sub =>
                (sub.user?.name?.toLowerCase() || '').includes(lower) ||
                (sub.user?.phone || '').includes(lower) ||
                (sub.user?.acc_no || '').toLowerCase().includes(lower) ||
                (sub.plan?.planName?.toLowerCase() || '').includes(lower)
            );
        }

        // 2. Status Filter
        if (statusFilter !== 'all') {
            result = result.filter(sub => sub.subscription?.status === statusFilter);
        }

        // 3. Plan Filter
        if (planFilter !== 'all') {
            result = result.filter(sub => sub.plan?.planName === planFilter);
        }

        // 4. Amount Filter
        if (amountFilter !== 'all') {
            result = result.filter(sub => sub.subscription?.totalAmountPaid >= Number(amountFilter));
        }

        return result;
    }, [subscribers, searchQuery, statusFilter, planFilter, amountFilter]);

    useEffect(() => {
        setDisplayedSubscribers(allFilteredSubscribers.slice(0, BATCH_SIZE));
        setPage(1);
    }, [allFilteredSubscribers]);

    const handleLoadMore = () => {
        if (loadingMore || displayedSubscribers.length >= allFilteredSubscribers.length) return;
        setLoadingMore(true);

        setTimeout(() => {
            const nextPage = page + 1;
            setDisplayedSubscribers(allFilteredSubscribers.slice(0, nextPage * BATCH_SIZE));
            setPage(nextPage);
            setLoadingMore(false);
        }, 1000);
    };

    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: 80 }} />;
        return (
            <View style={{ paddingVertical: 20, alignItems: 'center', paddingBottom: 100 }}>
                <ActivityIndicator size="small" color={COLORS?.primary} />
                {/* <Text style={{ marginTop: 8, color: COLORS?.secondary, fontSize: 12 }}>Loading more users...</Text> */}
            </View>
        );
    };

    // --- Handlers ---

    const handleApprove = (paymentId) => {
        showCustomAlert(
            "Approve Payment",
            "Are you sure you want to approve this offline payment?",
            "warning",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve",
                    onPress: () => executeApprove(paymentId)
                }
            ]
        );
    };

    const executeApprove = async (paymentId) => {
        setActionLoading(paymentId);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const paymentToApprove = pendingPayments.find(p => p._id === paymentId);

            await axios.put(`${APIURL}/payments/offline/${paymentId}/approve`, {}, config);
            await fetchData(); // Refresh list and await

            showCustomAlert("Success", "Payment approved successfully", "success", [
                {
                    text: "Invoice",
                    onPress: () => {
                        if (paymentToApprove) {
                            // detailed object for generateInvoice
                            const invoicePayment = {
                                ...paymentToApprove,
                                type: 'UPI', // ensure type is set
                            };
                            const invoiceSubscriber = {
                                user: paymentToApprove.user,
                                chitPlan: paymentToApprove.chitPlan,
                                plan: paymentToApprove.chitPlan
                            };
                            generateInvoice(invoicePayment, invoiceSubscriber);
                        }
                    }
                },
                { text: "OK", onPress: () => { } }
            ]);
        } catch (error) {
            console.error("Approve failed", error);
            showCustomAlert("Error", "Failed to approve payment", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = (paymentId) => {
        showCustomAlert(
            "Reject Payment",
            "Are you sure you want to reject this payment?",
            "warning",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reject",
                    onPress: () => executeReject(paymentId)
                }
            ]
        );
    };

    const executeReject = async (paymentId) => {
        setActionLoading(paymentId);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(`${APIURL}/payments/offline/${paymentId}/reject`, {}, config);
            await fetchData();
            showCustomAlert("Rejected", "Payment rejected successfully", "success");
        } catch (error) {
            console.error("Reject failed", error);
            showCustomAlert("Error", "Failed to reject payment", "error");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeliverGold = (subscriber) => {
        setSelectedForDelivery(subscriber);
        const planName = (subscriber.plan?.planName || '').toLowerCase();
        const isUnlimited = planName.includes('unlimited') || planName.includes('infinity') || subscriber.plan?.type === 'unlimited';
        
        setDeliveryForm({
            isPartial: isUnlimited,
            type: 'Gold',
            goldWeight: '',
            amount: '',
            notes: '',
            paymentIds: [],
            transactionId: ''
        });
        
        if (isUnlimited) {
            fetchUndeliveredPayments(subscriber);
        }
        setDeliveryModalVisible(true);
    };

    const confirmDelivery = async () => {
        if (!selectedForDelivery) return;
        setSubmittingDelivery(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const planId = selectedForDelivery.plan._id;
            const userId = selectedForDelivery.user._id;
            const subscriptionId = selectedForDelivery._id || selectedForDelivery.subscriberId;

            await axios.post(`${APIURL}/chit-plans/${planId}/deliver`, {
                userId,
                subscriptionId, // Add this
                notes: deliveryNote
            }, config);

            setDeliveryModalVisible(false);
            await fetchData();
            showCustomAlert("Success", "Gold marked as delivered successfully!", "success");
        } catch (error) {
            console.error("Delivery failed", error);
            showCustomAlert("Error", "Failed to update delivery status", "error");
        } finally {
            setSubmittingDelivery(false);
        }
    };

    const handleManualDateChange = (type, value) => {
        const newParts = { ...manualDateInput, [type]: value };
        setManualDateInput(newParts);
        
        const d = parseInt(newParts.day);
        const m = parseInt(newParts.month) - 1;
        const y = parseInt(newParts.year);

        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 2000) {
            const newDate = new Date(y, m, d);
            if (newDate.getDate() === d && newDate.getMonth() === m && newDate.getFullYear() === y) {
                setSelectedPaymentDate(newDate);
            }
        }
    };

    const openManualPaymentModal = (subscriber) => {
        setSelectedSubscriber(subscriber);
        setManualForm({
            amount: subscriber.plan.monthlyAmount > 0 
                && subscriber.plan.type !== 'unlimited' 
                && subscriber.plan.planType !== 'unlimited' 
                && subscriber.plan.durationMonths !== 0 
                    ? subscriber.plan.monthlyAmount.toString() 
                    : '',
            notes: '',
            customGoldRate: (lockedGoldRate || goldRate) ? Number(lockedGoldRate || goldRate).toFixed(2) : ''
        });
        const today = new Date();
        setSelectedPaymentDate(today);
        setManualDateInput({
            day: today.getDate().toString().padStart(2, '0'),
            month: (today.getMonth() + 1).toString().padStart(2, '0'),
            year: today.getFullYear().toString()
        });
        if (lockedGoldRate === 0 && goldRate > 0) {
            setLockedGoldRate(goldRate);
        }
        setShowManualModal(true);
    };

    const submitManualPayment = async () => {
        if (!selectedSubscriber) return;
        if (!manualForm.amount) {
            showCustomAlert("Error", "Please enter an amount", "error");
            return;
        }

        setSubmittingManual(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const subId = selectedSubscriber._id || selectedSubscriber.subscriberId;
            const result = await axios.post(`${APIURL}/payments/offline/record`, {
                chitPlanId: selectedSubscriber.plan._id,
                userId: selectedSubscriber.user._id,
                subscriptionId: subId, // Add this
                amount: manualForm.amount,
                date: selectedPaymentDate.toISOString(),
                goldRate: ((selectedSubscriber?.plan?.type === 'unlimited') || (selectedSubscriber?.plan?.planType === 'unlimited')) 
                    ? (manualForm.customGoldRate ? parseFloat(manualForm.customGoldRate) : (lockedGoldRate || goldRate))
                    : 0,
                notes: manualForm.notes,
                type: manualForm.type || 'CASH'
            }, config);

            setShowManualModal(false);

            await fetchData();

            showCustomAlert("Success", "Payment recorded successfully", "success", [
                {
                    text: "Invoice",
                    onPress: () => {
                        generateInvoice(result.data, selectedSubscriber);
                    }
                },
                { text: "OK", onPress: () => { } }
            ]);

        } catch (error) {
            console.error("Manual payment failed", error);
            showCustomAlert("Error", "Failed to record payment", "error");
        } finally {
            setSubmittingManual(false);
        }
    };

    const viewProof = (proofPath) => {
        if (!proofPath) return;
        const url = `${BASE_URL}${proofPath}`;
        setPreviewProofUrl(url);
    };

    const downloadProofImage = async () => {
        if (!previewProofUrl) return;
        setDownloadingProof(true);
        try {
            const isPdf = previewProofUrl.toLowerCase().endsWith('.pdf');
            const ext = isPdf ? 'pdf' : 'jpg';
            const fileName = `Proof_${Date.now()}.${ext}`;

            let downloadPath;
            if (Platform.OS === 'android') {
                downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
            } else {
                downloadPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
            }

            const options = {
                fromUrl: previewProofUrl,
                toFile: downloadPath,
            };

            const result = await RNFS.downloadFile(options).promise;

            if (result.statusCode === 200) {
                if (Platform.OS === 'android') {
                    showCustomAlert("Success", "Proof downloaded successfully to Downloads folder", "success", [
                        {
                            text: "Share",
                            onPress: () => shareFile(downloadPath)
                        },
                        { text: "OK" }
                    ]);
                } else {
                    await shareFile(downloadPath);
                }
            } else {
                showCustomAlert("Error", "Failed to download proof", "error");
            }
        } catch (error) {
            console.error(error);
            showCustomAlert("Error", "Failed to download proof", "error");
        } finally {
            setDownloadingProof(false);
        }
    };


    // --- Render Items ---

    const renderPendingPayment = ({ item }) => (
        <View style={styles.pendingCard}>
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Image
                        source={{ uri: item.user?.profileImage ? `${BASE_URL}${item.user.profileImage}` : 'https://via.placeholder.com/100' }}
                        style={styles.avatar}
                    />
                    <TouchableOpacity
                        style={{ marginLeft: 10 }}
                        onPress={() => {
                            setSelectedUserForModal(item.user);
                            setUserDetailsModalVisible(true);
                        }}
                    >
                        <Text style={styles.userName}>{(item.user?.name?.length > 10 ? item.user.name.substring(0, 10) + '...' : item.user?.name) || 'Unknown'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.userPhone}>{item.user?.phone}</Text>
                            {item.user?.acc_no && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Icon name="university" size={8} color="#666" style={{ marginRight: 4 }} />
                                    <Text style={{ fontSize: 10, color: '#666', fontWeight: 'bold' }}>{item.user.acc_no}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={styles.amountBadge}>
                    <Text style={styles.amountText}>₹{item.amount}</Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.row}>
                    <Text style={styles.label}>Plan:</Text>
                    <Text style={styles.value}>{item.chitPlan?.planName}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Date:</Text>
                    <Text style={styles.value}>{new Date(item.paymentDate).toLocaleDateString()}</Text>
                </View>
                {item.notes && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Notes:</Text>
                        <Text style={[styles.value, { fontStyle: 'italic' }]}>{item.notes}</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardFooter}>
                {item.proofImage ? (
                    <TouchableOpacity style={styles.proofButton} onPress={() => viewProof(item.proofImage)}>
                        <Icon name="image" size={14} color={COLORS?.primary} />
                        <Text style={styles.proofButtonText}>View Proof</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.noProofText}>No Proof</Text>
                )}

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleReject(item._id)}
                        disabled={actionLoading === item._id}
                    >
                        <Icon name="times" size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprove(item._id)}
                        disabled={actionLoading === item._id}
                    >
                        {actionLoading === item._id ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Icon name="check" size={14} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );



    const renderWithdrawalRequest = ({ item }) => {
        const planName = item.plan?.planName || 'Unknown Plan';
        const isUnlimited = (planName.toLowerCase().includes('unlimited') || planName.toLowerCase().includes('infinity'));
        const paidAmount = item.subscription.totalAmountPaid || 0;
        const goldGrams = (isUnlimited && goldRate > 0) ? (paidAmount / goldRate).toFixed(3) : 0;

        return (
            <View style={styles.withdrawalCard}>
                <View style={styles.withdrawalHeader}>
                    <View style={styles.withdrawalUserInfo}>
                        {item.user?.profileImage ? (
                            <Image
                                source={{ uri: `${BASE_URL}${item.user.profileImage}` }}
                                style={styles.withdrawalAvatar}
                            />
                        ) : (
                            <View style={[styles.initialAvatar, { marginRight: 10 }]}>
                                <Text style={styles.initialText}>{item.user?.name?.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <View>
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedUserForModal(item.user);
                                    setUserDetailsModalVisible(true);
                                }}
                            >
                                <Text style={styles.withdrawalUserName}>{item.user?.name?.length > 10 ? item.user.name.substring(0, 10) + '...' : item.user?.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.withdrawalUserPhone}>{item.user?.phone}</Text>
                                    {item.user?.acc_no && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                            <Icon name="university" size={8} color="#666" style={{ marginRight: 4 }} />
                                            <Text style={{ fontSize: 10, color: '#666', fontWeight: 'bold' }}>{item.user.acc_no}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                            <View style={[styles.planBadge, { alignSelf: 'flex-start', marginTop: 4 }]}>
                                <Text style={styles.planBadgeText}>{planName}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.withdrawalAmountBadge}>
                        <Text style={styles.withdrawalAmountLabel}>Total Paid</Text>
                        <Text style={styles.withdrawalAmountValue}>₹{paidAmount}</Text>
                        {isUnlimited && goldRate > 0 && (
                            <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '700', marginTop: 2 }}>
                                {goldGrams}g (24K)
                            </Text>
                        )}
                    </View>
                </View>

                {/* Bank Details for Settlement */}
                {item.subscription.status === 'requested_withdrawal' && item.plan?.returnType === 'Cash' && item.subscription.withdrawalRequest && (
                    <View style={{ backgroundColor: '#f0f4f8', padding: 10, borderRadius: 8, marginTop: 12 }}>
                        <Text style={{ fontWeight: 'bold', color: COLORS?.dark, marginBottom: 5 }}>Bank Details:</Text>
                        <Text style={{ fontSize: 13, color: '#333' }}>Name: {item.user?.name}</Text>
                        <Text style={{ fontSize: 13, color: '#333' }}>Bank: {item.subscription.withdrawalRequest.bankName || 'N/A'}</Text>
                        <Text style={{ fontSize: 13, color: '#333' }}>A/C No: {item.subscription.withdrawalRequest.accountNumber}</Text>
                        <Text style={{ fontSize: 13, color: '#333' }}>IFSC: {item.subscription.withdrawalRequest.ifsc}</Text>
                    </View>
                )}

                {/* Action Button */}
                <View style={{ marginTop: 15 }}>
                    {item.subscription.status === 'requested_closure' ? (
                        <TouchableOpacity
                            style={[styles.settleButton, { backgroundColor: COLORS?.warning }]}
                            activeOpacity={0.9}
                            onPress={() => handleApproveClosure(item)}
                        >
                            <Text style={styles.settleButtonText}>Approve Closure</Text>
                            <Icon name="check-circle" size={12} color="#fff" />
                        </TouchableOpacity>
                    ) : item.plan.returnType === 'Cash' ? (
                        <TouchableOpacity
                            style={styles.settleButton}
                            activeOpacity={0.9}
                            onPress={() => {
                                setSelectedWithdrawalRequest(item);
                                setSettlementForm({
                                    amount: (item.subscription.totalAmountPaid || 0).toString(),
                                    transactionId: '',
                                    note: ''
                                });
                                setSettlementModalVisible(true);
                            }}
                        >
                            <Text style={styles.settleButtonText}>Settle Cash</Text>
                            <Icon name="hand-holding-usd" size={12} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.settleButton, { backgroundColor: '#ffd700' }]}
                            activeOpacity={0.9}
                            onPress={() => handleDeliverGold(item)}
                        >
                            <Text style={[styles.settleButtonText, { color: '#000' }]}>Deliver Gold</Text>
                            <Icon name="gift" size={12} color="#000" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const renderSubscriber = ({ item }) => {
        console.log("item", item);

        const planName = (item.plan?.planName || '').toLowerCase();
        const isUnlimited = planName.includes('unlimited') || planName.includes('infinity') || item.plan?.type === 'unlimited';

        const percentage = (isUnlimited || !item.plan.totalAmount) ? 0 : Math.min(Math.round((item.subscription.totalAmountPaid / item.plan.totalAmount) * 100), 100);
        const remainingBalance = Math.round((item.plan.totalAmount - item.subscription.totalAmountPaid));
        const monthsDueCount = 0; // Disabled since progress is governed by custom amounts now

        const isExpanded = expandedSubId === item.subscriberId;
        const planReturnType = item.plan?.returnType;
        const effectiveStatus = (isUnlimited && item.subscription.status === 'completed') ? 'active' : item.subscription.status;

        const showGoldConversion = isUnlimited;
        const totalGold = (item.subscription.totalGoldWeight || 0);
        const deliveredGold = (item.subscription.deliveredGoldWeight || 0);
        const remainingGold = Math.max(0, totalGold - deliveredGold);

        const totalPaid = (item.subscription.totalAmountPaid || 0);
        const deliveredAmount = (item.subscription.deliveredAmount || 0);
        const remainingAmountValue = Math.max(0, totalPaid - deliveredAmount);

        const goldGrams = remainingGold.toFixed(3);

        // Settle button visible for any Cash OR Unlimited plan that isn't already settled/delivered
        const canSettle = (item.plan.returnType === 'Cash' || isUnlimited) &&
            item.subscription.status !== 'settled' &&
            item.subscription.status !== 'delivered_gold';

        return (
            <TouchableOpacity
                style={styles.subscriberCard}
                activeOpacity={0.9}
                onPress={() => setExpandedSubId(isExpanded ? null : item.subscriberId)}
            >
                <View style={styles.subHeader}>
                    <View style={styles.userInfo}>
                        {item.user.profileImage ? (
                            <Image
                                source={{ uri: `${BASE_URL}${item.user.profileImage}` }}
                                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee' }}
                            />
                        ) : (
                            <View style={styles.initialAvatar}>
                                <Text style={styles.initialText}>{item.user.name?.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={{ marginLeft: 10 }}
                            onPress={() => {
                                setSelectedUserForModal(item.user);
                                setUserDetailsModalVisible(true);
                            }}
                        >
                            <Text style={styles.userName}>{item.user.name?.length > 10 ? item.user.name.substring(0, 10) + '...' : item.user.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.userPhone}>{item.user.phone}</Text>
                                {item.user.acc_no && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10, backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                        <Icon name="university" size={8} color="#666" style={{ marginRight: 4 }} />
                                        <Text style={{ fontSize: 10, color: '#666', fontWeight: 'bold' }}>{item.user.acc_no}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{item.plan.planName}</Text>
                    </View>
                </View>

                <View style={styles.subBody}>
                    <View style={styles.progressRow}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressValue}>
                            {isUnlimited ? 'Unlimited' : `${percentage}% (₹${item.subscription.totalAmountPaid} / ₹${item.plan.totalAmount})`}
                        </Text>
                    </View>
                    {!isUnlimited && (
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
                        </View>
                    )}

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Paid</Text>
                            <Text style={styles.statValue}>₹{remainingAmountValue}</Text>
                        </View>

                        {(showGoldConversion || goldGrams > 0) && (
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Gold Saved</Text>
                                <Text style={[styles.statValue, { color: '#B45309' }]}>{goldGrams}g</Text>
                            </View>
                        )}

                        {!isUnlimited && !['completed', 'settled', 'delivered_gold'].includes(effectiveStatus) && (
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Balance</Text>
                                <Text style={styles.statValue}>₹{remainingBalance}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {isExpanded && (
                    <View style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Joined:</Text>
                            <Text style={styles.value}>{new Date(item.subscription.joinedAt).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Status:</Text>
                            <Text style={[styles.value, { color: effectiveStatus === 'delivered_gold' ? '#d4af37' : effectiveStatus === 'active' ? 'orange' : 'green', fontWeight: 'bold' }]}>
                                {effectiveStatus === 'delivered_gold' ? 'DELIVERED GOLD' : (effectiveStatus ? effectiveStatus.toUpperCase() : 'ACTIVE')}
                            </Text>
                        </View>
                        {effectiveStatus === 'settled' && (
                            <View style={[styles.statusTag, { backgroundColor: '#E8F5E9', marginTop: 5, alignSelf: 'flex-start' }]}>
                                <Icon name="check-circle" size={12} color="#2E7D32" />
                                <Text style={styles.statusOkText}>Plan Settled</Text>
                            </View>
                        )}


                    </View>
                )}

                <View style={styles.subFooter}>
                    {monthsDueCount > 0 ? (
                        <View style={[styles.statusTag, styles.statusDue]}>
                            <Icon name="exclamation-circle" size={12} color="#D32F2F" />
                            <Text style={styles.statusDueText}>{monthsDueCount} Due</Text>
                        </View>
                    ) : (
                        effectiveStatus !== 'settled' ? (
                            <View style={[styles.statusTag, styles.statusOk]}>
                                <Icon name="check-circle" size={12} color="#2E7D32" />
                                <Text style={styles.statusOkText}>Up-to-Date</Text>
                            </View>
                        ) : <View />
                    )}

                    <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <TouchableOpacity
                            style={styles.viewHistoryButton}
                            onPress={() => openHistoryModal(item)}
                        >
                            <Icon name="history" size={12} color={COLORS?.secondary} />
                            <Text style={styles.viewHistoryText}>History</Text>
                        </TouchableOpacity>

                        {effectiveStatus === 'requested_closure' ? (
                            <TouchableOpacity
                                style={[styles.payOfflineButton, { backgroundColor: COLORS?.warning, borderColor: COLORS?.warning }]}
                                onPress={() => handleApproveClosure(item)}
                            >
                                <Icon name="check-circle" size={12} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={[styles.payOfflineText, { color: '#fff' }]}>Approve Closure</Text>
                            </TouchableOpacity>
                        ) : (effectiveStatus === 'completed' || effectiveStatus === 'closed' || effectiveStatus === 'requested_withdrawal') ? (
                            item.plan.returnType?.toLowerCase() === 'gold' ? (
                                <TouchableOpacity
                                    style={[styles.payOfflineButton, { backgroundColor: '#ffd700', borderColor: '#DAA520', flexDirection: 'row', alignItems: 'center' }]}
                                    onPress={() => handleDeliverGold(item)}
                                >
                                    <Text style={[styles.payOfflineText, { color: '#fff' }]}>Deliver Gold</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.payOfflineButton, { backgroundColor: COLORS?.success, borderColor: COLORS?.success }]}
                                    onPress={() => {
                                        setSelectedWithdrawalRequest(item);
                                        setSettlementForm({ amount: item.subscription.totalAmountPaid.toString(), transactionId: '', note: '' });
                                        setSettlementModalVisible(true);
                                    }}
                                >
                                    <Text style={[styles.payOfflineText, { color: '#fff' }]}>Settle Cash</Text>
                                </TouchableOpacity>
                            )
                        ) : (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 5, flex: 1 }}>
                                {effectiveStatus === 'active' && (
                                    <TouchableOpacity
                                        style={[styles.payOfflineButton, { backgroundColor: '#FEE2E2', borderColor: '#FEE2E2' }]}
                                        onPress={() => handleDirectClose(item)}
                                    >
                                        <Icon name="times-circle" size={12} color="#D32F2F" />
                                    </TouchableOpacity>
                                )}
                                {/* Settle/Deliver button always visible for Cash or Unlimited plans not yet settled */}
                                {canSettle && (
                                    <TouchableOpacity
                                        style={[
                                            styles.payOfflineButton, 
                                            { 
                                                backgroundColor: item.plan.returnType === 'Gold' ? '#ffd700' : COLORS?.success, 
                                                borderColor: item.plan.returnType === 'Gold' ? '#DAA520' : COLORS?.success 
                                            }
                                        ]}
                                        onPress={() => {
                                            if (item.plan.returnType === 'Gold') {
                                                handleDeliverGold(item);
                                            } else {
                                                setSelectedWithdrawalRequest(item);
                                                setSettlementForm({ amount: item.subscription.totalAmountPaid.toString(), transactionId: '', note: '' });
                                                setSettlementModalVisible(true);
                                            }
                                        }}
                                    >
                                        <Text style={[styles.payOfflineText, { color: item.plan.returnType === 'Gold' ? '#000' : '#fff' }]}>
                                            {item.plan.returnType === 'Gold' ? 'Gold' : 'Settle'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[
                                        styles.payOfflineButton,
                                        (((!isUnlimited && remainingBalance <= 0) ||
                                            ['settled', 'delivered_gold'].includes(effectiveStatus)) && { opacity: 0.5 })
                                    ]}
                                        onPress={() => openManualPaymentModal(item)}
                                        disabled={((!isUnlimited && remainingBalance <= 0) ||
                                            ['settled', 'delivered_gold'].includes(effectiveStatus))}
                                    >
                                        <Text style={styles.payOfflineText}>
                                            {effectiveStatus === 'settled' ? 'Settled' :
                                                effectiveStatus === 'delivered_gold' ? 'Delivered' : 'Paid'}
                                        </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Visual Indicator for Expand */}
                <View style={{ alignItems: 'center', marginTop: 5 }}>
                    <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={10} color="#ccc" />
                </View>
            </TouchableOpacity>
        );
    };

    const renderListHeader = () => (
        <>
            {/* Pending Payments Section */}
            {pendingPayments.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Icon name="clock" size={16} color={COLORS?.warning} />
                        <Text style={styles.sectionTitle}>Pending Validations ({pendingPayments.length})</Text>
                    </View>
                    <FlatList
                        data={pendingPayments}
                        renderItem={renderPendingPayment}
                        keyExtractor={item => item._id}
                        scrollEnabled={false}
                    />
                </View>
            )}

            {/* Withdrawal Requests Section */}
            {withdrawalRequests.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Icon name="bell" size={16} color={COLORS?.primary} />
                        <Text style={styles.sectionTitle}>Pending Action Requests ({withdrawalRequests.length})</Text>
                    </View>
                    <FlatList
                        data={withdrawalRequests}
                        renderItem={renderWithdrawalRequest}
                        keyExtractor={item => (item._id || item.subscriberId) + 'withdrawal'}
                        scrollEnabled={false}
                    />
                </View>
            )}

            {/* Subscribers Section Header */}
            <View style={[styles.section, { marginTop: pendingPayments.length > 0 ? 20 : 0 }]}>
                <View style={styles.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Icon name="users" size={16} color={COLORS?.primary} />
                        <Text style={styles.sectionTitle}>Subscribers ({allFilteredSubscribers.length})</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setShowFilters(!showFilters);
                        }}
                        style={[styles.searchToggle, { marginRight: 8, backgroundColor: showFilters ? COLORS?.primary : '#EDF2F7' }]}
                    >
                        <Icon name="filter" size={14} color={showFilters ? '#fff' : COLORS?.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleDateInput} style={[styles.searchToggle, { marginRight: 8 }]}>
                        <Icon name={showDateInput ? "times" : "calendar-alt"} size={16} color={COLORS?.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleSearch} style={styles.searchToggle}>
                        <Icon name={showSearch ? "times" : "search"} size={18} color={COLORS?.primary} />
                    </TouchableOpacity>
                </View>

                {/* Expandable Filter UI */}
                {showFilters && (
                    <View style={styles.filterSection}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <Text style={[styles.filterLabel, { marginBottom: 0 }]}>Filters</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setShowFilters(false);
                                }}
                                style={{ padding: 5 }}
                            >
                                <Icon name="times" size={18} color={COLORS?.primary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.filterRow}>
                            {/* Status Filter */}
                            <View style={styles.filterGroup}>
                                <Text style={styles.filterLabel}>Status</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                                    {['all', 'active', 'requested_closure', 'closed', 'completed', 'settled', 'delivered_gold'].map((status) => (
                                        <TouchableOpacity
                                            key={status}
                                            style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                                            onPress={() => setStatusFilter(status)}
                                        >
                                            <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                                                {status.replace('_', ' ').toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.filterRow}>
                            {/* Amount Filter */}
                            <View style={styles.filterGroup}>
                                <Text style={styles.filterLabel}>Min Paid Amount</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                                    {[
                                        { label: 'Any', value: 'all' },
                                        { label: '₹1k+', value: '1000' },
                                        { label: '₹5k+', value: '5000' },
                                        { label: '₹10k+', value: '10000' },
                                        { label: '₹25k+', value: '25000' },
                                        { label: '₹50k+', value: '50000' },
                                        { label: '₹1L+', value: '100000' }
                                    ].map((opt) => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[styles.filterChip, amountFilter === opt.value && styles.filterChipActive]}
                                            onPress={() => setAmountFilter(opt.value)}
                                        >
                                            <Text style={[styles.filterChipText, amountFilter === opt.value && styles.filterChipTextActive]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.filterRow}>
                            {/* Plan Filter */}
                            <View style={styles.filterGroup}>
                                <Text style={styles.filterLabel}>Plan Type</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                                    <TouchableOpacity
                                        style={[styles.filterChip, planFilter === 'all' && styles.filterChipActive]}
                                        onPress={() => setPlanFilter('all')}
                                    >
                                        <Text style={[styles.filterChipText, planFilter === 'all' && styles.filterChipTextActive]}>ALL PLANS</Text>
                                    </TouchableOpacity>
                                    {uniquePlans.map((name) => (
                                        <TouchableOpacity
                                            key={name}
                                            style={[styles.filterChip, planFilter === name && styles.filterChipActive]}
                                            onPress={() => setPlanFilter(name)}
                                        >
                                            <Text style={[styles.filterChipText, planFilter === name && styles.filterChipTextActive]}>
                                                {name.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={() => {
                                setStatusFilter('all');
                                setPlanFilter('all');
                                setAmountFilter('all');
                                setSearchQuery('');
                            }}
                        >
                            <Text style={styles.resetButtonText}>Reset All Filters</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Date Search Input & Results */}
                {showDateInput && (
                    <View style={{ marginBottom: 15 }}>
                        <View style={styles.searchContainer}>
                            <TouchableOpacity
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: '100%' }}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Icon name="calendar" size={14} color="#9CA3AF" style={{ marginRight: 10 }} />
                                <Text style={{ color: dateQuery ? COLORS?.dark : '#999', fontSize: 14 }}>
                                    {dateQuery || "Select Date..."}
                                </Text>
                            </TouchableOpacity>

                            {dateQuery ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TouchableOpacity
                                        style={{ marginRight: 10, padding: 5 }}
                                        onPress={handleDateSearch}
                                        disabled={isSearchingDate}
                                    >
                                        {isSearchingDate ? (
                                            <ActivityIndicator size="small" color={COLORS?.primary} />
                                        ) : (
                                            <Icon name="search" size={16} color={COLORS?.primary} />
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={clearDateSearch} style={{ padding: 5 }}>
                                        <Icon name="times-circle" size={16} color="#9CA3AF" />
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            {/* Date Pickers moved to stable root location */}
                        </View>

                        {/* Daily Results */}
                        {dailyPayments && (
                            <View style={{ marginTop: 10 }}>
                                <Text style={styles.resultTitle}>
                                    Transactions on {dateQuery}: <Text style={{ color: COLORS?.primary, fontWeight: 'bold' }}>{dailyPayments.length}</Text>
                                </Text>

                                {dailyPayments.length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>No payments found for this date.</Text>
                                    </View>
                                ) : (
                                    dailyPayments.map(pay => (
                                        <View key={pay._id} style={styles.paymentResultCard}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={styles.resultName}>{(pay.user?.name?.length > 10 ? pay.user.name.substring(0, 10) + '...' : pay.user?.name) || 'Unknown'}</Text>
                                                <Text style={styles.resultAmount}>₹{pay.amount}</Text>
                                            </View>
                                            <Text style={styles.resultPlan}>{pay.chitPlan?.planName}</Text>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                                                <Text style={[styles.resultBadge, pay.type === 'offline' ? { color: '#666', backgroundColor: '#eee' } : { color: COLORS?.primary, backgroundColor: COLORS?.primary + '10' }]}>
                                                    {pay.type === 'offline' ? 'Offline' : 'Online'}
                                                </Text>
                                                <TouchableOpacity onPress={() => generateInvoice(pay, { user: pay.user, chitPlan: pay.chitPlan, plan: pay.chitPlan })}>
                                                    <Icon name="file-invoice" size={14} color={COLORS?.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}
                    </View>
                )}

                {showSearch && (
                    <View style={styles.searchContainer}>
                        <Icon name="search" size={14} color="#9CA3AF" style={{ marginRight: 10 }} />
                        <TextInput
                            ref={searchInputRef}
                            style={styles.searchInput}
                            placeholder="Search by Name, Phone, or Plan..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="done"
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 10 }}>
                                    <Icon name="times-circle" size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={() => {
                                    const now = Date.now();
                                    if (now - lastToggleTime < 300) return;
                                    setLastToggleTime(now);

                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setShowSearch(false);
                                    setSearchQuery('');
                                    Keyboard.dismiss();
                                }}
                                style={{ padding: 5 }}
                            >
                                <Icon name="times" size={18} color={COLORS?.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </>
    );

    const renderListEmpty = () => {
        if (loading) {
            return (
                <View style={{ marginTop: 20 }}>
                    {[1, 2, 3, 4, 5].map(key => (
                        <SkeletonSubscriber key={key} />
                    ))}
                </View>
            );
        }
        return (
            <View style={styles.emptyContainer}>
                <Icon name="users-slash" size={40} color={COLORS?.secondary} />
                <Text style={styles.emptyText}>{searchQuery ? 'No users matching search.' : 'No subscribers found.'}</Text>
            </View>
        );
    };

    return (
        <LinearGradient
            colors={['#c1ab8eff', '#f2e07bff', '#915200']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }} style={styles.container}>
            {/* Hidden GoldTicker to fetch rates safely */}
            <View style={{ height: 0, opacity: 0 }}>
                <GoldTicker />
            </View>

            <FlatList
                data={displayedSubscribers}
                renderItem={renderSubscriber}
                keyExtractor={item => item._id || item.subscriberId}
                ListHeaderComponent={renderListHeader()}
                ListEmptyComponent={renderListEmpty()}
                ListFooterComponent={renderFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS?.primary]} />
                }
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            />

            {/* <LinearGradient
                colors={['rgba(248, 249, 250, 0)', '#f8f9fa']}
                style={styles.bottomFade}
                pointerEvents="none"
            /> */}

            {/* Custom Alert */}
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={hideAlert}
            />

            {/* Date Pickers (Moved here for stability on Android) */}
            {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={dateQuery ? new Date(dateQuery) : new Date()}
                    mode="date"
                    is24Hour={true}
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                />
            )}

            {Platform.OS === 'ios' && (
                <Modal
                    transparent={true}
                    animationType="slide"
                    visible={showDatePicker}
                    onRequestClose={() => setShowDatePicker(false)}
                >
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' }}>
                                <Text style={{ fontWeight: 'bold', fontSize: 16, color: COLORS?.textPrimary }}>Select Date</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ padding: 5 }}>
                                    <Text style={{ color: COLORS?.primary, fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                testID="dateTimePicker"
                                value={dateQuery ? new Date(dateQuery) : new Date()}
                                mode="date"
                                is24Hour={true}
                                display="spinner"
                                onChange={handleDateChange}
                                maximumDate={new Date()}
                                style={{ height: 120 }}
                                textColor={COLORS?.textPrimary}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {/* Processing Modal */}
            <Modal transparent={true} visible={!!actionLoading} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ backgroundColor: 'white', padding: 25, borderRadius: 15, alignItems: 'center', elevation: 5 }}>
                        <ActivityIndicator size="large" color="#915200" />
                        <Text style={{ marginTop: 15, fontWeight: 'bold', fontSize: 16, color: '#915200' }}>Processing Request...</Text>
                        <Text style={{ marginTop: 5, fontSize: 12, color: '#666' }}>Sending notifications...</Text>
                    </View>
                </View>
            </Modal>

            {/* Manual Payment Modal */}
            <Modal
                transparent={true}
                visible={showManualModal}
                animationType="slide"
                onRequestClose={() => setShowManualModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Record Manual Payment</Text>
                            <TouchableOpacity onPress={() => setShowManualModal(false)}>
                                <Icon name="times" size={20} color="#999" />
                            </TouchableOpacity>
                        </View>

                        {selectedSubscriber && (
                            <ScrollView>
                                <View style={styles.modalUserCard}>
                                    <View style={styles.modalAvatar}>
                                        <Text style={styles.modalAvatarText}>{selectedSubscriber.user.name?.charAt(0)}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.modalUserName}>{selectedSubscriber.user.name}</Text>
                                        <Text style={styles.modalUserPlan}>{selectedSubscriber.plan.planName}</Text>
                                    </View>
                                </View>

                                <Text style={styles.inputLabel}>Amount (₹)</Text>
                                <TextInput
                                    style={[
                                        styles.textInput,
                                        (selectedSubscriber?.plan?.monthlyAmount > 0 &&
                                            selectedSubscriber?.plan?.type !== 'unlimited' &&
                                            selectedSubscriber?.plan?.planType !== 'unlimited' &&
                                            selectedSubscriber?.plan?.durationMonths !== 0) && { backgroundColor: '#f0f0f0', color: '#666' }
                                    ]}
                                    value={manualForm.amount}
                                    onChangeText={t => setManualForm(prev => ({ ...prev, amount: t }))}
                                    keyboardType="numeric"
                                    editable={!(selectedSubscriber?.plan?.monthlyAmount > 0 &&
                                        selectedSubscriber?.plan?.type !== 'unlimited' &&
                                        selectedSubscriber?.plan?.planType !== 'unlimited' &&
                                        selectedSubscriber?.plan?.durationMonths !== 0)}
                                />
                                {selectedSubscriber?.plan?.monthlyAmount > 0 &&
                                    selectedSubscriber?.plan?.type !== 'unlimited' &&
                                    selectedSubscriber?.plan?.planType !== 'unlimited' &&
                                    selectedSubscriber?.plan?.durationMonths !== 0 && (
                                        <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Fixed monthly amount for this plan.</Text>
                                    )}

                                <Text style={[styles.inputLabel, { marginTop: 15 }]}>Payment Method</Text>
                                <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                                    <TouchableOpacity
                                        style={[styles.filterChip, manualForm.type === 'CASH' && styles.filterChipActive]}
                                        onPress={() => setManualForm(prev => ({ ...prev, type: 'CASH' }))}
                                    >
                                        <Text style={[styles.filterChipText, manualForm.type === 'CASH' && styles.filterChipTextActive]}>CASH</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.filterChip, manualForm.type === 'UPI' && styles.filterChipActive]}
                                        onPress={() => setManualForm(prev => ({ ...prev, type: 'UPI' }))}
                                    >
                                        <Text style={[styles.filterChipText, manualForm.type === 'UPI' && styles.filterChipTextActive]}>UPI</Text>
                                    </TouchableOpacity>
                                </View>

                                {((selectedSubscriber?.plan?.type === 'unlimited') || (selectedSubscriber?.plan?.planType === 'unlimited')) && (
                                    <View style={{ marginTop: 15, marginBottom: 15, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#FEF3C7' }}>
                                        <Text style={[styles.inputLabel, { color: '#92400E' }]}>Applied Gold Rate (₹/gm)</Text>
                                        <TextInput
                                            style={[styles.textInput, { backgroundColor: '#fff', borderColor: '#FCD34D', marginBottom: 10 }]}
                                            value={manualForm.customGoldRate}
                                            onChangeText={t => setManualForm(prev => ({ ...prev, customGoldRate: t }))}
                                            keyboardType="numeric"
                                            placeholder="Enter gold rate applied..."
                                        />
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 12, color: '#92400E', fontWeight: 'bold' }}>Calculated Gold Weight:</Text>
                                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS?.dark }}>
                                                {manualForm.customGoldRate && manualForm.amount ? (parseFloat(manualForm.amount) / parseFloat(manualForm.customGoldRate)).toFixed(3) : '0.000'}g
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <Text style={styles.inputLabel}>Payment Date</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 10, color: '#92400E', marginBottom: 2 }}>DD</Text>
                                        <TextInput
                                            style={[styles.textInput, { textAlign: 'center', paddingVertical: 8 }]}
                                            value={manualDateInput.day}
                                            onChangeText={(v) => handleManualDateChange('day', v.replace(/[^0-9]/g, '').slice(0, 2))}
                                            placeholder="DD"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 10, color: '#92400E', marginBottom: 2 }}>MM</Text>
                                        <TextInput
                                            style={[styles.textInput, { textAlign: 'center', paddingVertical: 8 }]}
                                            value={manualDateInput.month}
                                            onChangeText={(v) => handleManualDateChange('month', v.replace(/[^0-9]/g, '').slice(0, 2))}
                                            placeholder="MM"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 1.5 }}>
                                        <Text style={{ fontSize: 10, color: '#92400E', marginBottom: 2 }}>YYYY</Text>
                                        <TextInput
                                            style={[styles.textInput, { textAlign: 'center', paddingVertical: 8 }]}
                                            value={manualDateInput.year}
                                            onChangeText={(v) => handleManualDateChange('year', v.replace(/[^0-9]/g, '').slice(0, 4))}
                                            placeholder="YYYY"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <TouchableOpacity 
                                        style={{ justifyContent: 'flex-end', paddingBottom: 10 }}
                                        onPress={() => {
                                            const today = new Date();
                                            const todayParts = {
                                                day: today.getDate().toString().padStart(2, '0'),
                                                month: (today.getMonth() + 1).toString().padStart(2, '0'),
                                                year: today.getFullYear().toString()
                                            };
                                            setManualDateInput(todayParts);
                                            setSelectedPaymentDate(today);
                                        }}
                                    >
                                        <Text style={{ color: COLORS?.primary, fontSize: 12, fontWeight: 'bold' }}>Today</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.inputLabel}>Notes</Text>
                                <TextInput
                                    style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                                    value={manualForm.notes}
                                    onChangeText={t => setManualForm(prev => ({ ...prev, notes: t }))}
                                    multiline
                                    placeholder="Paid via Cash/UPI..."
                                />

                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={submitManualPayment}
                                    disabled={submittingManual}
                                >
                                    {submittingManual ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Record Payment</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* History Modal */}
            <Modal
                transparent={true}
                visible={showHistoryModal}
                animationType="slide"
                onRequestClose={() => setShowHistoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Subscription History</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => generateStatement(selectedSubscriber, paymentHistory)} style={{ marginRight: 15 }}>
                                    <Icon name="file-download" size={20} color={COLORS?.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                                    <Icon name="times" size={20} color="#999" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {selectedSubscriber && (
                            <FlatList
                                data={paymentHistory}
                                keyExtractor={item => item._id}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                ListHeaderComponent={
                                    <>
                                        {/* User Info */}
                                        <View style={styles.modalUserCard}>
                                            <View style={styles.modalAvatar}>
                                                <Text style={styles.modalAvatarText}>{selectedSubscriber.user.name?.charAt(0)}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.modalUserName}>{selectedSubscriber.user.name}</Text>
                                                <Text style={styles.modalUserPlan}>{selectedSubscriber.plan.planName}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                    <Icon name="phone-alt" size={10} color="#666" style={{ marginRight: 5 }} />
                                                    <Text style={{ fontSize: 11, color: '#666' }}>{selectedSubscriber.user.phone}</Text>
                                                    {selectedSubscriber.user.panCard && (
                                                        <>
                                                            <View style={{ width: 1, height: 10, backgroundColor: '#ddd', marginHorizontal: 8 }} />
                                                            <Icon name="id-card" size={10} color="#666" style={{ marginRight: 5 }} />
                                                            <Text style={{ fontSize: 11, color: '#666' }}>PAN: {selectedSubscriber.user.panCard}</Text>
                                                        </>
                                                    )}
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.statsRow}>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Total Paid</Text>
                                                <Text style={styles.statValue}>₹{selectedSubscriber.subscription.totalAmountPaid}</Text>
                                            </View>
                                            {selectedSubscriber.subscription.totalGoldWeight > 0 && (
                                                <View style={styles.statItem}>
                                                    <Text style={styles.statLabel}>Gold Saved</Text>
                                                    <Text style={[styles.statValue, { color: '#B45309' }]}>
                                                        {selectedSubscriber.subscription.totalGoldWeight.toFixed(3)}g
                                                    </Text>
                                                </View>
                                            )}
                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Progress</Text>
                                                <Text style={styles.statValue}>{selectedSubscriber.plan.type === 'unlimited' || selectedSubscriber.plan.planType === 'unlimited' ? 'N/A' : `${Math.min(Math.round((selectedSubscriber.subscription.totalAmountPaid / selectedSubscriber.plan.totalAmount) * 100), 100)}%`}</Text>
                                            </View>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statLabel}>Status</Text>
                                                <Text style={[styles.statValue, { color: (selectedSubscriber.subscription.status === 'delivered_gold') ? '#d4af37' : (selectedSubscriber.subscription.status === 'completed' || selectedSubscriber.subscription.status === 'settled') ? 'green' : 'orange' }]}>
                                                    {(selectedSubscriber.subscription.status === 'delivered_gold') ? 'DELIVERED GOLD' : (selectedSubscriber.subscription.status ? selectedSubscriber.subscription.status.toUpperCase() : 'Active')}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={[styles.sectionTitle, { fontSize: 16, marginTop: 20, marginBottom: 10 }]}>Payment History</Text>

                                        {loadingHistory && <ActivityIndicator color={COLORS?.primary} style={{ marginTop: 20 }} />}
                                    </>
                                }
                                ListEmptyComponent={
                                    !loadingHistory ? (
                                        <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>No payments found.</Text>
                                    ) : null
                                }
                                renderItem={({ item }) => (
                                    <View style={styles.historyItem}>
                                        <View style={styles.historyLeft}>
                                            <Text style={styles.historyDate}>{new Date(item.paymentDate || item.createdAt).toLocaleDateString()}</Text>
                                            <Text style={styles.historyType}>
                                                {item.type === 'online' ? 'Online' : item.type === 'offline' ? 'Offline' : item.type}
                                            </Text>
                                        </View>
                                        <View style={styles.historyRight}>
                                            <Text style={styles.historyAmount}>₹{item.amount}</Text>
                                            {item.lockedGoldRate > 0 && selectedSubscriber?.plan?.returnType?.toLowerCase() === 'gold' && (
                                                <Text style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                                                    Rate: ₹{item.lockedGoldRate.toFixed(2)}/g
                                                </Text>
                                            )}
                                            {item.goldWeight > 0 && (
                                                <Text style={{ fontSize: 10, color: '#B45309', fontWeight: 'bold' }}>
                                                    {item.goldWeight.toFixed(3)}g Gold
                                                </Text>
                                            )}
                                            <Text style={[styles.historyStatus, { color: item.status === 'Completed' ? 'green' : item.status === 'Rejected' ? 'red' : 'orange' }]}>{item.status}</Text>
                                            
                                            {item.isDelivered && (
                                                <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-end', marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                                                    <Icon name="check-circle" size={10} color="#059669" />
                                                    <Text style={{ fontSize: 10, color: '#059669', fontWeight: 'bold', marginLeft: 4 }}>DELIVERED</Text>
                                                </View>
                                            )}

                                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 5, alignItems: 'center' }}>
                                                {item.status === 'Completed' && item.proofImage && (
                                                    <TouchableOpacity onPress={() => viewProof(item.proofImage)} style={{ padding: 4 }}>
                                                        <Icon name="image" size={14} color={COLORS?.primary} />
                                                    </TouchableOpacity>
                                                )}
                                                {item.status === 'Completed' && (
                                                    <TouchableOpacity onPress={() => generateInvoice(item, selectedSubscriber)} style={{ padding: 4 }}>
                                                        <Icon name="file-invoice" size={14} color={COLORS?.primary} />
                                                    </TouchableOpacity>
                                                )}
                                                {/* Delete payment button */}
                                                <TouchableOpacity
                                                    onPress={() => handleDeletePayment(item._id)}
                                                    style={{ padding: 4 }}
                                                >
                                                    <Icon name="trash-alt" size={14} color="#DC2626" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Settlement Modal */}
            <Modal
                transparent={true}
                visible={settlementModalVisible}
                animationType="slide"
                onRequestClose={() => setSettlementModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Settle & Pay</Text>
                            <TouchableOpacity onPress={() => setSettlementModalVisible(false)}>
                                <Icon name="times" size={20} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <View style={styles.modalInfo}>
                                <Text style={{ color: COLORS?.secondary, fontSize: 13 }}>Plan: <Text style={{ fontWeight: 'bold', color: COLORS?.dark }}>{selectedWithdrawalRequest?.plan?.planName}</Text></Text>
                                <Text style={{ color: COLORS?.secondary, fontSize: 13, marginTop: 4 }}>Total Paid: <Text style={{ fontWeight: 'bold', color: COLORS?.primary }}>₹{selectedWithdrawalRequest?.subscription?.totalAmountPaid || 0}</Text></Text>
                            </View>

                            {/* Display Withdrawal Details for Merchant */}
                            {selectedWithdrawalRequest?.subscription?.withdrawalRequest && (
                                <View style={{ backgroundColor: '#f0f4f8', padding: 10, borderRadius: 8, marginBottom: 20 }}>
                                    <Text style={{ fontWeight: 'bold', color: COLORS?.dark, marginBottom: 5 }}>Bank Details:</Text>
                                    <Text style={{ fontSize: 13, color: '#333' }}>Name: {selectedWithdrawalRequest.user.name}</Text>
                                    <Text style={{ fontSize: 13, color: '#333' }}>Bank: {selectedWithdrawalRequest.subscription.withdrawalRequest.bankName || 'N/A'}</Text>
                                    <Text style={{ fontSize: 13, color: '#333' }}>A/C No: {selectedWithdrawalRequest.subscription.withdrawalRequest.accountNumber}</Text>
                                    <Text style={{ fontSize: 13, color: '#333' }}>IFSC: {selectedWithdrawalRequest.subscription.withdrawalRequest.ifsc}</Text>
                                </View>
                            )}

                            <Text style={styles.inputLabel}>Amount Settled (₹)</Text>
                            <TextInput
                                style={styles.textInput}
                                value={settlementForm.amount}
                                onChangeText={t => setSettlementForm({ ...settlementForm, amount: t })}
                                keyboardType="numeric"
                            />

                            <Text style={styles.inputLabel}>Settlement Type</Text>
                            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                                <TouchableOpacity
                                    style={[styles.filterChip, settlementForm.type === 'Cash' && styles.filterChipActive]}
                                    onPress={() => setSettlementForm({ ...settlementForm, type: 'Cash' })}
                                >
                                    <Text style={[styles.filterChipText, settlementForm.type === 'Cash' && styles.filterChipTextActive]}>Cash</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.filterChip, settlementForm.type === 'Gold' && styles.filterChipActive]}
                                    onPress={() => setSettlementForm({ ...settlementForm, type: 'Gold' })}
                                >
                                    <Text style={[styles.filterChipText, settlementForm.type === 'Gold' && styles.filterChipTextActive]}>Gold</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Transaction ID / Reference</Text>
                            <TextInput
                                style={styles.textInput}
                                value={settlementForm.transactionId}
                                onChangeText={t => setSettlementForm({ ...settlementForm, transactionId: t })}
                            />

                            <Text style={styles.inputLabel}>Notes</Text>
                            <TextInput
                                style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                                value={settlementForm.note}
                                onChangeText={t => setSettlementForm({ ...settlementForm, note: t })}
                                multiline
                                placeholder="Bank transfer details..."
                            />

                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={executeSettlement}
                                disabled={submittingSettlement}
                            >
                                {submittingSettlement ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Confirm Settlement</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Delivery Modal */}
            <Modal
                transparent={true}
                visible={deliveryModalVisible}
                animationType="slide"
                onRequestClose={() => setDeliveryModalVisible(false)}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { borderTopColor: '#d4af37', borderTopWidth: 4 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: '#d4af37' }]}>Deliver Gold</Text>
                            <TouchableOpacity onPress={() => setDeliveryModalVisible(false)}>
                                <Icon name="times" size={20} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff9db', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                                    <Icon name="gift" size={30} color="#d4af37" />
                                </View>
                                <Text style={{ fontSize: 16, textAlign: 'center', color: '#555' }}>
                                    Process <Text style={{ fontWeight: 'bold', color: '#B45309' }}>Delivery</Text> for {selectedForDelivery?.user.name}.
                                </Text>
                            </View>

                            <Text style={styles.inputLabel}>Delivery Mode</Text>
                            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                                <TouchableOpacity
                                    style={[styles.filterChip, !deliveryForm.isPartial && styles.filterChipActive]}
                                    onPress={() => setDeliveryForm({ ...deliveryForm, isPartial: false })}
                                >
                                    <Text style={[styles.filterChipText, !deliveryForm.isPartial && styles.filterChipTextActive]}>Full Delivery</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.filterChip, deliveryForm.isPartial && styles.filterChipActive]}
                                    onPress={() => setDeliveryForm({ ...deliveryForm, isPartial: true })}
                                >
                                    <Text style={[styles.filterChipText, deliveryForm.isPartial && styles.filterChipTextActive]}>Partial Release</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Deliver As</Text>
                            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                                <TouchableOpacity
                                    style={[styles.filterChip, deliveryForm.type === 'Gold' && styles.filterChipActive]}
                                    onPress={() => setDeliveryForm({ ...deliveryForm, type: 'Gold' })}
                                >
                                    <Text style={[styles.filterChipText, deliveryForm.type === 'Gold' && styles.filterChipTextActive]}>Gold</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.filterChip, deliveryForm.type === 'Cash' && styles.filterChipActive]}
                                    onPress={() => setDeliveryForm({ ...deliveryForm, type: 'Cash' })}
                                >
                                    <Text style={[styles.filterChipText, deliveryForm.type === 'Cash' && styles.filterChipTextActive]}>Cash</Text>
                                </TouchableOpacity>
                            </View>

                            {deliveryForm.isPartial && (
                                <View style={{ backgroundColor: '#fcf8e3', padding: 12, borderRadius: 8, marginBottom: 15 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#8a6d3b' }}>PARTIAL DELIVERY DETAILS</Text>
                                        <View style={{ backgroundColor: '#8a6d3b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Total Saved: {((selectedForDelivery?.subscription?.totalGoldWeight || 0) - (selectedForDelivery?.subscription?.deliveredGoldWeight || 0)).toFixed(3)}g</Text>
                                        </View>
                                    </View>
                                    
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.inputLabel}>Weight to Deliver (g)</Text>
                                            <TextInput
                                                style={[styles.textInput, { backgroundColor: '#f3f4f6', color: '#666' }]}
                                                value={deliveryForm.goldWeight}
                                                editable={false}
                                                keyboardType="numeric"
                                                placeholder="0.000"
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.inputLabel}>Remaining Gold</Text>
                                            <View style={[styles.textInput, { backgroundColor: '#f3f4f6', justifyContent: 'center' }]}>
                                                <Text style={{ fontWeight: 'bold', color: '#555' }}>
                                                    {((selectedForDelivery?.subscription?.totalGoldWeight || 0) - (selectedForDelivery?.subscription?.deliveredGoldWeight || 0) - (Number(deliveryForm.goldWeight) || 0)).toFixed(3)}g
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>Link Payments (Deliver through history)</Text>
                                    <Text style={{ fontSize: 10, color: '#8a6d3b', marginBottom: 5 }}>Selecting payments will auto-calculate delivery weight.</Text>
                                    
                                    {loadingPayments ? <ActivityIndicator size="small" color="#915200" /> : (
                                        undeliveredPayments.map((p) => (
                                            <TouchableOpacity 
                                                key={p._id}
                                                style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4, backgroundColor: '#fff', padding: 8, borderRadius: 4, borderLeftColor: deliveryForm.paymentIds.includes(p._id) ? '#915200' : '#ddd', borderLeftWidth: 3 }}
                                                onPress={() => {
                                                    const exists = deliveryForm.paymentIds.includes(p._id);
                                                    const newIds = exists 
                                                        ? deliveryForm.paymentIds.filter(id => id !== p._id) 
                                                        : [...deliveryForm.paymentIds, p._id];
                                                    
                                                    // Auto-calculate weight and amount
                                                    const selectedPayments = undeliveredPayments.filter(pay => newIds.includes(pay._id));
                                                    const totalWeight = selectedPayments.reduce((acc, pay) => acc + (pay.goldWeight || 0), 0);
                                                    const totalAmount = selectedPayments.reduce((acc, pay) => acc + (pay.amount || 0), 0);
                                                    
                                                    setDeliveryForm({
                                                        ...deliveryForm,
                                                        paymentIds: newIds,
                                                        goldWeight: totalWeight > 0 ? totalWeight.toFixed(3) : deliveryForm.goldWeight,
                                                        amount: totalAmount > 0 ? totalAmount.toString() : deliveryForm.amount
                                                    });
                                                }}
                                            >
                                                <Icon name={deliveryForm.paymentIds.includes(p._id) ? "check-square" : "square"} size={16} color="#915200" />
                                                <Text style={{ marginLeft: 8, fontSize: 13, flex: 1 }}>{new Date(p.paymentDate || p.createdAt).toLocaleDateString()} - ₹{p.amount}</Text>
                                                <Text style={{ fontSize: 11, color: '#B45309', fontWeight: 'bold' }}>{p.goldWeight.toFixed(3)}g</Text>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}

                            <Text style={styles.inputLabel}>Transaction/Ref ID (Optional)</Text>
                            <TextInput
                                style={styles.textInput}
                                value={deliveryForm.transactionId}
                                onChangeText={t => setDeliveryForm({ ...deliveryForm, transactionId: t })}
                                placeholder="Ref #"
                            />

                            <Text style={styles.inputLabel}>Delivery Notes</Text>
                            <TextInput
                                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                                value={deliveryForm.notes}
                                onChangeText={t => setDeliveryForm({ ...deliveryForm, notes: t })}
                                multiline
                                placeholder="E.g. Delivered 10g Gold Chain, Invoice #123..."
                            />

                            <TouchableOpacity
                                style={[styles.submitButton, { backgroundColor: '#d4af37' }]}
                                onPress={executeDelivery}
                                disabled={submittingDelivery}
                            >
                                {submittingDelivery ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>{deliveryForm.isPartial ? 'Confirm Partial Delivery' : 'Confirm Full Delivery'}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* User Details Modal */}
            <Modal
                transparent={true}
                visible={userDetailsModalVisible}
                animationType="fade"
                onRequestClose={() => setUserDetailsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>User Details</Text>
                            <TouchableOpacity onPress={() => setUserDetailsModalVisible(false)}>
                                <Icon name="times" size={20} color="#999" />
                            </TouchableOpacity>
                        </View>

                        {selectedUserForModal && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    {selectedUserForModal.profileImage ? (
                                        <Image
                                            source={{ uri: `${BASE_URL}${selectedUserForModal.profileImage}` }}
                                            style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#eee', marginBottom: 10 }}
                                        />
                                    ) : (
                                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS?.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                            <Text style={{ fontSize: 32, fontWeight: 'bold', color: COLORS?.primary }}>{selectedUserForModal.name?.charAt(0).toUpperCase()}</Text>
                                        </View>
                                    )}
                                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS?.dark }}>{selectedUserForModal.name}</Text>
                                </View>

                                <View style={{ backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16 }}>
                                    <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'center' }}>
                                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS?.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                            <Icon name="phone-alt" size={16} color={COLORS?.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 12, color: COLORS?.secondary, marginBottom: 2 }}>Phone Number</Text>
                                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${selectedUserForModal.phone}`)}>
                                                <Text style={{ fontSize: 16, color: COLORS?.dark, fontWeight: '600' }}>{selectedUserForModal.phone}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={{ height: 1, backgroundColor: '#eee', marginBottom: 16 }} />

                                    {selectedUserForModal.email && (
                                        <>
                                            <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'center' }}>
                                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS?.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                    <Icon name="envelope" size={16} color={COLORS?.primary} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 12, color: COLORS?.secondary, marginBottom: 2 }}>Email Address</Text>
                                                    <TouchableOpacity onPress={() => Linking.openURL(`mailto:${selectedUserForModal.email}`)}>
                                                        <Text style={{ fontSize: 15, color: COLORS?.dark, fontWeight: '500' }}>{selectedUserForModal.email}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View style={{ height: 1, backgroundColor: '#eee', marginBottom: 16 }} />
                                        </>
                                    )}

                                    {selectedUserForModal.address && (
                                        <>
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS?.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                    <Icon name="map-marker-alt" size={16} color={COLORS?.primary} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 12, color: COLORS?.secondary, marginBottom: 4 }}>Address</Text>
                                                    <Text style={{ fontSize: 14, color: COLORS?.dark, lineHeight: 20 }}>{typeof selectedUserForModal.address === 'string' ? selectedUserForModal.address : JSON.stringify(selectedUserForModal.address)}</Text>
                                                </View>
                                            </View>
                                            <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 16 }} />
                                        </>
                                    )}
                                    {selectedUserForModal.acc_no && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS?.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                <Icon name="university" size={16} color={COLORS?.primary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 12, color: COLORS?.secondary, marginBottom: 2 }}>Account Number</Text>
                                                <Text style={{ fontSize: 16, color: COLORS?.dark, fontWeight: '600' }}>{selectedUserForModal.acc_no}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Proof Modal */}
            <Modal
                transparent={true}
                visible={!!previewProofUrl}
                animationType="fade"
                onRequestClose={() => setPreviewProofUrl(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}
                        onPress={() => setPreviewProofUrl(null)}
                    >
                        <Icon name="times" size={20} color="#fff" />
                    </TouchableOpacity>

                    {previewProofUrl && (
                        <Image
                            source={{ uri: previewProofUrl }}
                            style={{ width: '90%', height: '70%', resizeMode: 'contain' }}
                        />
                    )}

                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: COLORS?.primary,
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderRadius: 8,
                            marginTop: 30,
                        }}
                        onPress={downloadProofImage}
                        disabled={downloadingProof}
                    >
                        {downloadingProof ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Icon name="download" size={16} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Download Proof</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </Modal>
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    bottomFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        zIndex: 100
    },
    section: {
        marginBottom: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginLeft: 8,
    },
    // Pending Card
    pendingCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: COLORS?.warning
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eee',
    },
    userName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.primary,
    },
    userPhone: {
        fontSize: 12,
        color: COLORS?.secondary,
    },
    amountBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    amountText: {
        color: '#2E7D32',
        fontWeight: 'bold',
        fontSize: 14,
    },
    cardBody: {
        backgroundColor: '#fafbfc',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        fontSize: 12,
        color: COLORS?.secondary,
        width: 50,
        fontWeight: '600',
    },
    value: {
        fontSize: 12,
        color: COLORS?.dark,
        flex: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    proofButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 6,
        backgroundColor: COLORS?.primary + '10',
        borderRadius: 6,
    },
    proofButtonText: {
        fontSize: 12,
        color: COLORS?.primary,
        marginLeft: 6,
        fontWeight: '600',
    },
    noProofText: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    approveButton: {
        backgroundColor: '#2E7D32',
    },
    rejectButton: {
        backgroundColor: '#D32F2F',
    },
    // Subscriber Card
    subscriberCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
    },
    initialAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS?.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    initialText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS?.primary,
    },
    planBadge: {
        backgroundColor: COLORS?.primary + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    planBadgeText: {
        fontSize: 11,
        color: COLORS?.primary,
        fontWeight: '600',
    },
    viewHistoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f5f5f5',
        borderRadius: 6,
        marginRight: 8,
    },
    viewHistoryText: {
        fontSize: 12,
        color: COLORS?.secondary,
        fontWeight: '600',
        marginLeft: 6,
    },
    subBody: {
        marginBottom: 12,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 12,
        color: COLORS?.secondary,
    },
    progressValue: {
        fontSize: 12,
        color: COLORS?.dark,
        fontWeight: 'bold',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#eee',
        borderRadius: 3,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS?.primary,
        borderRadius: 3,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fafbfc',
        padding: 10,
        borderRadius: 8,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS?.secondary,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    subFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
        flexWrap: 'wrap',
        gap: 8,
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusDue: {
        backgroundColor: '#FFEBEE',
    },
    statusOk: {
        backgroundColor: '#E8F5E9',
    },
    statusDueText: {
        fontSize: 11,
        color: '#D32F2F',
        marginLeft: 4,
        fontWeight: '600',
    },
    statusOkText: {
        fontSize: 11,
        color: '#2E7D32',
        marginLeft: 4,
        fontWeight: '600',
    },
    payOfflineButton: {
        borderWidth: 1,
        borderColor: COLORS?.primary,
        borderRadius: 6,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    payOfflineText: {
        fontSize: 12,
        color: COLORS?.primary,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 10,
        color: COLORS?.secondary,
    },
    // Modal
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
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS?.primary,
    },
    modalUserCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
    },
    modalAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    modalAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS?.primary,
    },
    modalUserName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    modalUserPlan: {
        fontSize: 12,
        color: COLORS?.secondary,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginBottom: 6,
        marginTop: 10,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: COLORS?.dark,
    },
    submitButton: {
        backgroundColor: COLORS?.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // History Styles
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    historyLeft: {
        flex: 1,
    },
    historyDate: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS?.dark,
    },
    historyType: {
        fontSize: 12,
        color: COLORS?.secondary,
        marginTop: 2,
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    historyAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    historyStatus: {
        fontSize: 12,
        marginTop: 2,
    },
    // Search Styles
    searchToggle: {
        padding: 5,
        backgroundColor: '#EDF2F7',
        borderRadius: 20,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center'
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 46,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 2 }
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS?.dark,
        height: '100%'
    },
    // Date Search Styles
    dateSearchContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15
    },
    dateInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 45,
        color: COLORS?.dark
    },
    dateSearchButton: {
        backgroundColor: COLORS?.primary,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderRadius: 8,
        height: 45
    },
    dateSearchButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14
    },
    dateClearButton: {
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    resultTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
        fontWeight: '600'
    },
    paymentResultCard: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: COLORS?.primary,
        elevation: 1
    },
    resultName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.dark
    },
    resultAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2E7D32'
    },
    resultPlan: {
        fontSize: 12,
        color: '#666'
    },
    resultBadge: {
        fontSize: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
        fontWeight: '600'
    },
    // New Withdrawal Card Styles
    withdrawalCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: COLORS?.primary, // Brand shadow
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(145, 82, 0, 0.1)', // Subtle brand border
    },
    withdrawalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    withdrawalUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    withdrawalAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#fff',
    },
    withdrawalUserName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginLeft: 10,
    },
    withdrawalUserPhone: {
        fontSize: 11,
        color: COLORS?.secondary,
        marginLeft: 10,
        marginTop: 2,
    },
    withdrawalAmountBadge: {
        alignItems: 'flex-end',
    },
    withdrawalAmountLabel: {
        fontSize: 10,
        color: COLORS?.secondary,
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 2,
    },
    withdrawalAmountValue: {
        fontSize: 16,
        fontWeight: '900',
        color: COLORS?.primary,
    },
    bankDetailsContainer: {
        backgroundColor: '#fafbfc',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    bankDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bankDetailText: {
        fontSize: 13,
        color: COLORS?.dark,
        marginLeft: 10,
        fontWeight: '500',
        flex: 1,
    },
    withdrawalMessageContainer: {
        flexDirection: 'row',
        marginTop: 10,
        padding: 10,
        backgroundColor: '#FFF3E0', // Light Orange
        borderRadius: 8,
    },
    withdrawalMessageText: {
        fontSize: 12,
        color: '#E65100', // Darker Orange
        fontStyle: 'italic',
        flex: 1,
        lineHeight: 16,
    },
    settleButton: {
        backgroundColor: COLORS?.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 16,
        shadowColor: COLORS?.primary,
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
    },
    settleButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
        marginRight: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    // New Filter Styles
    filterSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    filterLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS?.secondary,
        marginBottom: 10,
        textTransform: 'uppercase'
    },
    filterRow: {
        marginBottom: 15
    },
    filterGroup: {
        width: '100%'
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#eee'
    },
    filterChipActive: {
        backgroundColor: COLORS?.primary,
        borderColor: COLORS?.primary
    },
    filterChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#666'
    },
    filterChipTextActive: {
        color: '#fff'
    },
    resetButton: {
        marginTop: 5,
        paddingVertical: 10,
        alignItems: 'center'
    },
    resetButtonText: {
        fontSize: 13,
        color: COLORS?.primary,
        fontWeight: '600',
        textDecorationLine: 'underline'
    }
});

export default MerchantUsers;
