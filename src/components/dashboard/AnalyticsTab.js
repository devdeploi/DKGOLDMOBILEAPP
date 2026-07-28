/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageBackground, View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Modal, TextInput, Image, Alert, Platform, ScrollView, Linking } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import RazorpayCheckout from 'react-native-razorpay';
import { launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '../../styles/theme';
import { APIURL, BASE_URL } from '../../constants/api';
import { RAZORPAY_KEY_ID } from '../../constants/razorpay';
import SkeletonLoader from '../SkeletonLoader';

import RNFS from 'react-native-fs';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';
import { WebView } from 'react-native-webview';
import dklogo from '../../assets/DK.png';
import logodk from '../../assets/logodk.png';
import safproLogo from '../../../public/assests/Safpro-logo.png';

import CustomAlert from '../CustomAlert';
import GoldTicker from '../GoldTicker';
import { useGoldRate } from '../../context/GoldRateContext';

const isPlanUnlimited = (plan) => {
    if (!plan) return false;
    const planNameStr = (plan.planName || '').toLowerCase();
    return plan.type === 'unlimited' || plan.durationMonths === 0 || planNameStr.includes('unlimited') || planNameStr.includes('infinity');
};

const hasPaidCurrentMonth = (plan) => {
    if (!plan || isPlanUnlimited(plan)) return false;
    const history = plan.history || plan.paymentHistory || [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return history.some(p => {
        const pDate = new Date(p.paymentDate || p.createdAt || p.date);
        return (p.status === 'Completed' || p.status === 'Paid' || p.status === 'Pending Approval') &&
               pDate >= startOfMonth && pDate <= endOfMonth;
    });
};

const ITEMS_PER_PAGE = 10;

const AnalyticsTab = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [allPlans, setAllPlans] = useState([]); // Stores all fetched plans
    const [displayedPlans, setDisplayedPlans] = useState([]); // Stores currently visible plans
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);


    const [expandedHistoryId, setExpandedHistoryId] = useState(null);
    const [expandedCardId, setExpandedCardId] = useState(null); // Track which card is expanded
    const [invoiceHtml, setInvoiceHtml] = useState(null);
    const [invoiceFileName, setInvoiceFileName] = useState('');
    const [webViewLoading, setWebViewLoading] = useState(true);
    const [generatingReceipt, setGeneratingReceipt] = useState(false);
    const viewShotRef = useRef(null);
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Offline Payment State
    const [offlineModalVisible, setOfflineModalVisible] = useState(false);
    const [selectedPlanForOffline, setSelectedPlanForOffline] = useState(null);
    const [offlineForm, setOfflineForm] = useState({
        notes: '',
        date: new Date(), // Store as Date object
    });
    const [customAmount, setCustomAmount] = useState(''); // For unlimited plans
    const [submittingOffline, setSubmittingOffline] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    // Withdrawal State
    const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
    const [selectedPlanForWithdrawal, setSelectedPlanForWithdrawal] = useState(null);
    const [withdrawalForm, setWithdrawalForm] = useState({
        accountNumber: '',
        ifsc: '',
        bankName: '',
        message: ''
    });
    const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

    // Use global synchronized gold rate and timer
    const { goldRate, refreshTimer: goldRefreshTimer } = useGoldRate();

    // Removed lockedGoldRate to ensure live rate updates

    // Receipt Image Viewer State
    const [receiptModalVisible, setReceiptModalVisible] = useState(false);
    const [receiptImageUri, setReceiptImageUri] = useState(null);

    const openReceipt = (uri) => {
        setReceiptImageUri(uri);
        setReceiptModalVisible(true);
    };

    const showAlert = (title, message, type = 'info') => {
        setAlertConfig({ visible: true, title, message, type });
    };

    const hideAlert = () => {
        setAlertConfig({ ...alertConfig, visible: false });
    };

    const fetchImageAsBase64 = async (url) => {
        try {
            if (!url) return null;
            if (url.startsWith('file://') || url.startsWith('/')) {
                const cleanPath = url.replace('file://', '');
                try {
                    const base64Data = await RNFS.readFile(cleanPath, 'base64');
                    return `data:image/png;base64,${base64Data}`;
                } catch (e) {
                    console.error("Local file read error:", e);
                    return null;
                }
            }

            const extMatch = url.match(/\\.(jpeg|jpg|png|gif|webp)/i);
            const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
            const mimeType = ext === 'jpg' ? 'jpeg' : ext;
            const tempFile = `${RNFS.CachesDirectoryPath}/temp_img_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;

            const result = await RNFS.downloadFile({
                fromUrl: url,
                toFile: tempFile,
            }).promise;

            if (result.statusCode === 200) {
                const base64Data = await RNFS.readFile(tempFile, 'base64');
                RNFS.unlink(tempFile).catch(() => { });
                return `data:image/${mimeType};base64,${base64Data}`;
            } else {
                return null;
            }
        } catch (error) {
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
        const cleanFileName = fileName.replace(/[^a-z0-9]/gi, '_');
        setInvoiceHtml(html);
        setInvoiceFileName(cleanFileName);
    };

    const downloadInvoiceAsJPG = async () => {
        if (!viewShotRef.current) return;
        try {
            const uri = await viewShotRef.current.capture();
            let downloadPath;
            const cleanFileName = invoiceFileName || `Invoice_${Date.now()}`;
            if (Platform.OS === 'android') {
                downloadPath = `${RNFS.DownloadDirectoryPath}/${cleanFileName}.jpg`;
            } else {
                downloadPath = `${RNFS.DocumentDirectoryPath}/${cleanFileName}.jpg`;
            }

            // Check if file exists and delete it before copying
            const exists = await RNFS.exists(downloadPath);
            if (exists) {
                await RNFS.unlink(downloadPath);
            }
            await RNFS.copyFile(uri, downloadPath);
            showAlert("Success", "Receipt saved successfully as JPG", "success", [
                {
                    text: "Share",
                    onPress: () => shareFile(downloadPath)
                },
                { text: "OK" }
            ]);
        } catch (error) {
            console.error("Invoice Capture Error:", error);
            showAlert("Error", "Failed to save receipt as JPG", "error");
        }
    };

    const generateInvoice = async (payment, plan) => {
        setGeneratingReceipt(true);
        try {
            let dkLogoImgTag = 'DK';
            let logodkImgTag = 'logodk';

            if (Platform.OS === 'android' && !__DEV__) {
                dkLogoImgTag = `<img src="file:///android_asset/DK.png" style="width: 250px; height: auto;" />`;
                logodkImgTag = `<img src="file:///android_asset/logodk.png" style="width: 70px; height: auto;" />`;
            } else {
                const dklogoUrl = Image.resolveAssetSource(dklogo).uri;
                const dklogoBase64 = await fetchImageAsBase64(dklogoUrl);
                if (dklogoBase64) dkLogoImgTag = `<img src="${dklogoBase64}" style="width: 250px; height: auto;" />`;

                const logodkUrl = Image.resolveAssetSource(logodk).uri;
                const logodkBase64 = await fetchImageAsBase64(logodkUrl);
                if (logodkBase64) logodkImgTag = `<img src="${logodkBase64}" style="width: 70px; height: auto;" />`;
            }

            const planName = plan.planName || 'Unknown Plan';
            const paymentDate = new Date(payment.paymentDate || payment.createdAt || new Date()).toLocaleDateString('en-IN');
            const merchantName = (plan.merchant?.name || 'Merchant').toUpperCase();
            const customerName = user.name.toUpperCase();
            const customerAddress = user.address || '';
            const customerMobile = user.phone || '';

            const isUnlimited = isPlanUnlimited(plan);
            const receiptNo = payment.receiptNumber || '-';
            const accNo = plan.acc_no || '-';
            const amountPaid = Number(payment.amount || 0).toFixed(2);
            const gramsSaved = Number(payment.goldWeight || 0).toFixed(3);
            const paymentMode = payment.type || 'Offline';
            let goldRate24k = payment.lockedGoldRate || payment.goldRate || '-';
            if (goldRate24k !== '-') goldRate24k = Number(goldRate24k).toFixed(2);

            // Cumulative logic
            let cumulativeAmount = 0;
            let cumulativeGrams = 0;
            let attemptNo = 0;
            const history = plan.paymentHistory || [];
            if (history.length > 0) {
                const sortedHistory = [...history].sort((a, b) => new Date(a.paymentDate || a.createdAt || a.date) - new Date(b.paymentDate || b.createdAt || b.date));
                const currentIndex = sortedHistory.findIndex(p => p._id === payment._id);

                if (currentIndex !== -1) {
                    for (let i = 0; i <= currentIndex; i++) {
                        const p = sortedHistory[i];
                        if ((p.status === 'Paid' || p.status === 'Completed') && !p.isDelivered) {
                            attemptNo += 1;
                            cumulativeAmount += Number(p.amount || 0);
                            cumulativeGrams += Number(p.goldWeight || 0);
                        }
                    }
                } else {
                    const currDate = new Date(payment.paymentDate || payment.createdAt || payment.date || new Date());
                    sortedHistory.forEach(p => {
                        const pDate = new Date(p.paymentDate || p.createdAt || p.date);
                        if (pDate <= currDate && (p.status === 'Paid' || p.status === 'Completed') && !p.isDelivered) {
                            attemptNo += 1;
                            cumulativeAmount += Number(p.amount || 0);
                            cumulativeGrams += Number(p.goldWeight || 0);
                        }
                    });
                }
            } else {
                cumulativeAmount = Number(plan.totalSaved || 0);
                cumulativeGrams = Number(plan.totalGoldWeight || 0);
                attemptNo = 1;
            }

            const dueNo = attemptNo || payment.installmentNumber || '-';

            const totalPaid = cumulativeAmount.toFixed(2);
            const totalGrams = cumulativeGrams.toFixed(3);
            const remainAmount = (Number(plan.totalAmount || 0) - cumulativeAmount).toFixed(2);

            const html = `
                <html>
                <head>
                    <meta name="viewport" content="width=700, user-scalable=yes" />
                </head>
                <body style="font-family: 'Helvetica', sans-serif; padding: 20px; color: #000; margin: 0; box-sizing: border-box;">
                    <div style="border: 2px solid #000; padding: 30px;">
                        <!-- HEADER -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                            <div style="width: 20%;">
                                ${logodkImgTag}
                            </div>
                            <div style="width: 50%; text-align: center;">
                                ${dkLogoImgTag}
                            </div>
                            <div style="width: 30%; text-align: right; font-weight: bold; font-size: 14px;">
                                &#128222; 8778841886
                            </div>
                        </div>
                        
                        <!-- TITLE BAND -->
                        <div style="background-color: #000; color: #fff; text-align: center; padding: 10px; font-weight: bold; font-size: 18px; letter-spacing: 2px; margin-bottom: 30px;">
                            ${isUnlimited ? 'GOLD SAVING PLAN RECEIPT' : 'MONTHLY SAVING PLAN RECEIPT'}
                        </div>

                        <!-- 2 COLUMNS OF DATA -->
                        <div style="display: flex; justify-content: space-between; font-size: 14px; line-height: 1.5;">
                            <!-- LEFT COLUMN -->
                            <div style="width: 48%;">
                                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                                    <span>RECEIPT NO. :</span>
                                    <strong>${receiptNo}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                                    <span>DATE :</span>
                                    <strong>${paymentDate}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                                    <span>NAME :</span>
                                    <strong>${customerName}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                                    <span>ADDRESS :</span>
                                    <strong style="text-align: right;">${customerAddress || 'N/A'}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                                    <span>MOBILE :</span>
                                    <strong>${customerMobile}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                                    <span>AMOUNT PAID :</span>
                                    <strong>Rs. ${amountPaid}</strong>
                                </div>
                                ${isUnlimited ? `
                                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                                    <span>GRAMS SAVED :</span>
                                    <strong>${gramsSaved}g</strong>
                                </div>
                                ` : ''}
                                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                                    <span>TOTAL PAID :</span>
                                    <strong>Rs. ${totalPaid}</strong>
                                </div>
                            </div>

                            <!-- RIGHT COLUMN -->
                            <div style="width: 48%;">
                                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                                    <span>A/C NO. :</span>
                                    <strong>${accNo}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                                    <span>PLAN TYPE :</span>
                                    <strong>${planName}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 40px;">
                                    <span>MODE :</span>
                                    <strong>${paymentMode}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                                    <span>DUE NO. :</span>
                                    <strong>${dueNo}</strong>
                                </div>
                                ${isUnlimited ? `
                                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                                    <span>24K GOLD RATE :</span>
                                    <strong>Rs. ${goldRate24k}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                                    <span>TOTAL GRAMS :</span>
                                    <strong>${totalGrams}g</strong>
                                </div>
                                ` : `
                                <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                                    <span>REMAIN :</span>
                                    <strong>Rs. ${remainAmount}</strong>
                                </div>
                                `}
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await createAndDownloadPDF(html, `Receipt_${user.name}_${Date.now()}`);

        } catch (error) {
            console.error("Invoice Gen Error", error);
            showAlert("Error", "Failed to generate invoice", "error");
        } finally {
            setGeneratingReceipt(false);
        }
    };

    const generateStatement = async (plan) => {
        setGeneratingReceipt(true);
        try {
            let dkLogoImgTag = 'DK';
            let safproLogoImgTag = 'Safpro';

            if (Platform.OS === 'android' && !__DEV__) {
                dkLogoImgTag = `<img src="file:///android_asset/logodk.png" style="width: 70px; height: auto;" />`;
                safproLogoImgTag = `<img src="file:///android_asset/Safpro-logo.png" style="width: 120px; height: auto;" />`;
            } else {
                const dklogoUrl = Image.resolveAssetSource(logodk).uri;
                const dklogoBase64 = await fetchImageAsBase64(dklogoUrl);
                if (dklogoBase64) dkLogoImgTag = `<img src="${dklogoBase64}" style="width: 70px; height: auto;" />`;

                const safproLogoUrl = Image.resolveAssetSource(safproLogo).uri;
                const safproLogoBase64 = await fetchImageAsBase64(safproLogoUrl);
                if (safproLogoBase64) safproLogoImgTag = `<img src="${safproLogoBase64}" style="width: 120px; height: auto;" />`;
            }

            let shopLogoImgTag = '';
            if (plan.merchant?.shopLogo) {
                const shopLogoUrl = `${BASE_URL}${plan.merchant.shopLogo}`;
                const shopLogoBase64 = await fetchImageAsBase64(shopLogoUrl);
                if (shopLogoBase64) {
                    shopLogoImgTag = `<img src="${shopLogoBase64}" style="width: 70px; height: 70px; border-radius: 35px; object-fit: cover;" />`;
                }
            }

            const merchantName = (plan.merchant?.name || 'Merchant').toUpperCase();
            const customerName = user.name.toUpperCase();
            const planName = plan.planName || 'Unknown Plan';
            const totalPlanAmount = plan.totalAmount || 0;

            let totalPaid = 0;
            const history = plan.history || [];
            const sortedHistory = [...history].sort((a, b) => new Date(a.paymentDate || a.createdAt) - new Date(b.paymentDate || b.createdAt));

            const rowsHtml = sortedHistory.map(pay => {
                if (pay.status === 'Completed' || pay.status === 'Paid') totalPaid += Number(pay.amount);
                return `
                    <tr>
                        <td>${new Date(pay.paymentDate || pay.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>${pay.notes || "Installment Payment"}</td>
                        <td>${pay.type === 'online' ? 'Online' : pay.type === 'offline' ? 'Offline' : (pay.type || 'Offline')}</td>
                        <td style="text-align: right;">Rs. ${Number(pay.amount).toFixed(2)}</td>
                    </tr>
                `;
            }).join('');

            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
                        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #000000; }
                        .logo-left, .logo-right { width: 100px; display: flex; align-items: center; justify-content: center; }
                        .header-center { text-align: center; flex: 1; margin: 0 10px; }
                        .header-center h2 { color: #000000; margin: 0; font-size: 18px; text-transform: uppercase; }
                        .header-center p { margin: 2px 0; font-size: 10px; color: #666; }
                        
                        .title-section { text-align: center; margin-bottom: 30px; }
                        .title-section h1 { color: #000000; margin: 0; font-size: 24px; letter-spacing: 2px; }
                        .title-section p { color: #666; margin: 5px 0 0; font-size: 12px; }

                        .grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
                        .col { width: 45%; }
                        .label { color: #000000; font-weight: bold; font-size: 12px; margin-bottom: 5px; }
                        .name { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
                        .info { font-size: 12px; color: #555; line-height: 1.4; }
                        .plan-info { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; font-size: 12px; border-left: 4px solid #000000; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th { background-color: #000000; color: white; padding: 8px; text-align: left; font-size: 11px; }
                        td { padding: 8px; border-bottom: 1px solid #eee; font-size: 11px; }
                        .total-row td { background-color: #f9f9f9; font-weight: bold; color: #000000; }
                        .footer { text-align: center; margin-top: 50px; color: #000000; font-size: 12px; border-top: 1px solid #eee; padding-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo-left">${dkLogoImgTag}</div>
                        <div class="header-center">
                            <h2>${merchantName}</h2>
                            <p>${plan.merchant?.address || ''}</p>
                            <p>Phone: ${plan.merchant?.phone || ''}${plan.merchant?.email ? ' | ' + plan.merchant.email : ''}</p>
                        </div>
                        <div class="logo-right">${shopLogoImgTag}</div>
                    </div>

                    <div class="title-section">
                        <h1>STATEMENT OF ACCOUNT</h1>
                        <p>Generated On: ${new Date().toLocaleDateString('en-IN')}</p>
                    </div>

                    <div class="grid">
                        <div class="col">
                            <div class="label">TO:</div>
                            <div class="name">${customerName}</div>
                            <div class="info">
                                Phone: ${user.phone}<br/>
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

            await createAndDownloadPDF(html, `Statement_${user.name}_${Date.now()}`);

        } catch (error) {
            console.error("Statement Gen Error", error);
            showAlert("Error", "Failed to generate statement", "error");
        } finally {
            setGeneratingReceipt(false);
        }
    };

    const fetchMyPlans = useCallback(async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };
            const { data } = await axios.get(`${APIURL}/chit-plans/my-plans`, config);

            // Initialize Pagination
            setAllPlans(data);
            setDisplayedPlans(data.slice(0, ITEMS_PER_PAGE));
            setPage(1);

        } catch (error) {
            console.error('Failed to fetch my plans', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && user.token) {
            fetchMyPlans();
        }
    }, [fetchMyPlans, user]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMyPlans();
    };

    const handleLoadMore = () => {
        if (loadingMore || displayedPlans.length >= allPlans.length) return;

        setLoadingMore(true);
        // Simulate network delay for "Instagram-like" feel
        setTimeout(() => {
            const nextPage = page + 1;
            const newPlans = allPlans.slice(0, nextPage * ITEMS_PER_PAGE);
            setDisplayedPlans(newPlans);
            setPage(nextPage);
            setLoadingMore(false);
        }, 1500);
    };

    // --- Offline Payment Handlers ---

    const openOfflineModal = (plan) => {
        setSelectedPlanForOffline(plan);
        setOfflineForm({
            notes: '',
            proofImage: null,
            date: new Date()
        });
        // For fixed plans, use the monthly amount. For unlimited, allow empty or monthly as default.
        const isUnlimited = isPlanUnlimited(plan);
        setCustomAmount(plan.monthlyAmount ? plan.monthlyAmount.toString() : '');

        // Calculate merchant-specific rate
        const manual24k = Number(plan.merchant?.goldRate24k);
        const currentRate = manual24k > 0 ? manual24k : goldRate;
        console.log("Gold Rate: ", plan.merchant);


        // Initial setup
        setOfflineModalVisible(true);
    };

    const pickImage = async () => {
        const options = {
            mediaType: 'photo',
            quality: 0.8,
            selectionLimit: 1,
        };

        const result = await launchImageLibrary(options);
        if (result.assets && result.assets.length > 0) {
            setOfflineForm({ ...offlineForm, proofImage: result.assets[0] });
        }
    };

    const submitOfflinePayment = async () => {
        if (!selectedPlanForOffline) return;

        // Always use the user-entered customAmount (editable for all plan types)
        const amountToPay = customAmount;

        if (isPlanUnlimited(selectedPlanForOffline)) {
            const numAmount = Number(amountToPay);
            if (!amountToPay || isNaN(amountToPay) || numAmount < 500 || numAmount > 100000) {
                showAlert('Error', 'Investment amount for unlimited plans must be between ₹500 and ₹1,00,000.', 'warning');
                return;
            }
        } else {
            if (!amountToPay || isNaN(amountToPay) || Number(amountToPay) <= 0) {
                showAlert('Invalid Amount', 'Please enter a valid payment amount.', 'warning');
                return;
            }
        }

        setSubmittingOffline(true);
        try {
            // 1. Create Razorpay Order
            const { data: order } = await axios.post(`${APIURL}/payments/create-order`, {
                amount: amountToPay,
                chitPlanId: selectedPlanForOffline.planId,
                subscriptionId: selectedPlanForOffline._id,
                type: 'installment',
                goldRate: selectedPlanForOffline?.merchant?.goldRate24k > 0 ? Number(selectedPlanForOffline.merchant.goldRate24k) : goldRate
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            // 2. Open Razorpay Checkout
            const options = {
                description: `Installment for ${selectedPlanForOffline.planName}`,
                image: `${BASE_URL}${selectedPlanForOffline.merchant?.shopLogo}`,
                currency: 'INR',
                key: RAZORPAY_KEY_ID,
                amount: order.amount,
                name: selectedPlanForOffline.merchant?.name || 'DK Gold',
                order_id: order.id,
                prefill: {
                    email: user.email || '',
                    contact: user.phone || '',
                    name: user.name || ''
                },
                notes: {
                    userId: user._id || '',
                    chitPlanId: selectedPlanForOffline.planId || '',
                    subscriptionId: selectedPlanForOffline._id || '',
                    type: 'installment',
                    goldRate: selectedPlanForOffline?.merchant?.goldRate24k > 0 ? Number(selectedPlanForOffline.merchant.goldRate24k).toString() : goldRate.toString()
                },
                theme: { color: COLORS?.primary }
            };

            const data = await RazorpayCheckout.open(options);

            // 3. Submit Request with signature
            const requestBody = {
                razorpay_order_id: data.razorpay_order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
                chitPlanId: selectedPlanForOffline.planId,
                subscriptionId: selectedPlanForOffline._id,
                amount: amountToPay,
                goldRate: selectedPlanForOffline?.merchant?.goldRate24k > 0 ? Number(selectedPlanForOffline.merchant.goldRate24k) : goldRate,
                notes: offlineForm.notes
            };

            const jsonConfig = {
                headers: { Authorization: `Bearer ${user.token}` }
            };

            await axios.post(`${APIURL}/payments/verify`, requestBody, jsonConfig);

            setOfflineModalVisible(false);
            showAlert('Success', 'Your payment was successful.', 'success');
            fetchMyPlans(); // Refresh to update status and total saved

        } catch (error) {
            console.error("Payment Error:", error);
            if (error.code === 0 || error.code === 2) {
                // Payment cancelled by user
                showAlert("Payment Cancelled", "You cancelled the payment process.", "warning");
            } else {
                const msg = error.response?.data?.message || 'Failed to submit payment';
                showAlert("Error", msg, "error");
            }
        } finally {
            setSubmittingOffline(false);
        }
    };

    const [closingModalVisible, setClosingModalVisible] = useState(false);
    const [selectedPlanForClosing, setSelectedPlanForClosing] = useState(null);
    const [submittingClose, setSubmittingClose] = useState(false);

    const openClosingModal = (plan) => {
        setSelectedPlanForClosing(plan);
        setClosingModalVisible(true);
    };

    const confirmCloseChit = async () => {
        if (!selectedPlanForClosing) return;
        setSubmittingClose(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };

            await axios.post(`${APIURL}/chit-plans/${selectedPlanForClosing.planId}/close`, {
                subscriptionId: selectedPlanForClosing._id
            }, config);

            setClosingModalVisible(false);
            showAlert('Success', 'Plan close requested successfully.', 'success');
            fetchMyPlans();
        } catch (error) {
            console.error("Close Plan Request Failed", error);
            const msg = error.response?.data?.message || "Failed to close plan.";
            showAlert('Error', msg, 'error');
        } finally {
            setSubmittingClose(false);
        }
    };

    // ... Withdrawal Handlers ...
    const openWithdrawalModal = (plan) => {
        setSelectedPlanForWithdrawal(plan);
        setWithdrawalForm({
            accountNumber: '',
            ifsc: '',
            bankName: '',
            message: ''
        });
        setWithdrawalModalVisible(true);
    };

    const submitWithdrawalRequest = async () => {
        if (!selectedPlanForWithdrawal) return;
        if (!withdrawalForm.accountNumber || !withdrawalForm.ifsc) {
            showAlert('Error', 'Please provide Account Number and IFSC Code.', 'error');
            return;
        }

        setSubmittingWithdrawal(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };

            await axios.post(`${APIURL}/chit-plans/${selectedPlanForWithdrawal.planId}/withdraw`, {
                ...withdrawalForm,
                subscriptionId: selectedPlanForWithdrawal._id
            }, config);

            setWithdrawalModalVisible(false);
            showAlert('Success', 'Withdrawal request sent to merchant successfully.', 'success');
            fetchMyPlans(); // Update status
        } catch (error) {
            console.error("Withdrawal Request Failed", error);
            const msg = error.response?.data?.message || "Failed to submit request.";
            showAlert('Error', msg, 'error');
        } finally {
            setSubmittingWithdrawal(false);
        }
    };

    const openUPIPayment = async (plan) => {
        const upiId = plan?.merchant?.upiId;
        if (!upiId) {
            showAlert('Error', 'UPI ID not available.', 'error');
            return;
        }

        const isUnlimited = isPlanUnlimited(plan);
        const merchantName = plan?.merchant?.name || 'Merchant';

        let params = `pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&cu=INR`;

        // Only add amount for fixed plans. Unlimited plans let user enter amount in their UPI app.
        if (!isUnlimited) {
            const amount = plan.monthlyAmount;
            if (amount && !isNaN(amount) && Number(amount) > 0) {
                params += `&am=${parseFloat(amount).toFixed(2)}`;
            }
        }

        params += `&tn=${encodeURIComponent('DKGold Plan Payment')}`;

        // Try schemes in order: GPay tez:// → generic upi://
        const schemesToTry = [
            `tez://upi/pay?${params}`,   // Google Pay
            `upi://pay?${params}`,        // Generic
        ];

        let opened = false;
        for (const url of schemesToTry) {
            try {
                await Linking.openURL(url);
                opened = true;
                break;
            } catch (err) {
                // Try next scheme
            }
        }

        if (!opened) {
            showAlert(
                'Pay via UPI',
                `No UPI app could be opened automatically.\n\nOpen GPay, PhonePe or any UPI app and pay to:\n\n📱 UPI ID: ${upiId}\n\nThen upload the payment screenshot.`,
                'info'
            );
        }
    };


    const renderPlanItem = ({ item: plan }) => {
        let dueDate = null;
        let isPayable = false;
        let diffDays = 100; // Default large
        const isUnlimited = isPlanUnlimited(plan);
        // Completion based on total saved, not months
        const isPlanFullyPaid = isUnlimited ? false : (plan.totalSaved >= plan.totalAmount);
        const effectiveStatus = (isUnlimited && plan.status === 'completed') ? 'active' : plan.status;

        // Parse Due Date
        const now = new Date();
        if (plan.nextDueDate) {
            dueDate = new Date(plan.nextDueDate);
            const timeDiff = dueDate.getTime() - now.getTime();
            diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        }

        // Determine if payable — always allow payment on active plans until target is reached.
        // No restriction on due month or installment count — user can pay any time.
        if (effectiveStatus === 'active' && !isPlanFullyPaid) {
            isPayable = true;
        }

        const isExpanded = expandedCardId === plan._id;
        const isGoldPlan = plan.returnType?.toLowerCase() === 'gold';
        const showGold = (isUnlimited || isGoldPlan) && goldRate > 0;

        // Calculate Remaining Balances
        const deliveredWeight = plan.deliveredGoldWeight || 0;
        const totalSavedAmount = plan.totalSaved || 0;
        const deliveredAmount = plan.deliveredAmount || 0;

        const remainingGold = Math.max(0, (plan.totalGoldWeight || 0) - deliveredWeight);
        const remainingSaved = Math.max(0, totalSavedAmount - deliveredAmount);

        const goldGrams = remainingGold.toFixed(3);

        return (
            <View
                style={styles.planCard}
            >
                {/* Always Visible Header */}
                <View style={styles.planHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.planName}>{plan.planName}</Text>
                        <View style={styles.merchantRow}>
                            <Icon name="store" size={10} color={COLORS?.secondary} />
                            <Text style={styles.merchantName}>{plan.merchant?.name}</Text>
                        </View>
                        {plan.acc_no ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <Icon name="id-badge" size={9} color="#915200" />
                                <Text style={{ fontSize: 10, color: '#915200', fontWeight: '700', marginLeft: 4 }}>
                                    Acc No: {plan.acc_no}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: effectiveStatus === 'active' ? '#E8F5E9' : (effectiveStatus === 'closed' || effectiveStatus === 'requested_closure') ? '#fff3e0' : '#eee' }]}>
                        <Text style={[styles.statusText, { color: effectiveStatus === 'active' ? '#2E7D32' : (effectiveStatus === 'closed' || effectiveStatus === 'requested_closure') ? '#ef6c00' : '#666' }]}>
                            {effectiveStatus ? effectiveStatus.toUpperCase().replace('_', ' ') : 'UNKNOWN'}
                        </Text>
                    </View>
                </View>

                {/* Compact Progress Bar - Always Visible */}
                <View style={styles.compactProgress}>
                    <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, width: '100%', marginBottom: 8 }}>
                        <View style={{ height: '100%', width: isUnlimited ? '100%' : `${Math.min((plan.totalSaved / plan.totalAmount) * 100, 100)}%`, backgroundColor: COLORS?.success, opacity: isUnlimited ? 0.3 : 1, borderRadius: 2 }} />
                    </View>
                    <View style={styles.compactStats}>
                        <View>
                            <Text style={styles.compactStatText}>
                                ₹{remainingSaved ? remainingSaved.toLocaleString() : 0} Saved
                            </Text>
                            {showGold && (
                                <Text style={[styles.compactStatText, { color: '#B45309', fontWeight: 'bold', fontSize: 10 }]}>
                                    {goldGrams}g Gold Saved
                                </Text>
                            )}
                        </View>
                        <Text style={styles.compactStatText}>
                            {isUnlimited ? 'No Limit' : `Target: ₹${plan.totalAmount?.toLocaleString()}`}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Saved</Text>
                        <Text style={styles.statValue}>₹{remainingSaved ? remainingSaved.toLocaleString() : 0}</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Attempts</Text>
                        <Text style={styles.statValue}>{plan.history ? plan.history.length : 0}</Text>
                    </View>

                    {showGold && (
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Gold Saved</Text>
                            <Text style={[styles.statValue, { color: '#B45309' }]}>{goldGrams}g</Text>
                        </View>
                    )}

                    {!['completed', 'settled', 'delivered_gold', 'closed'].includes(plan.status) && !isUnlimited && (
                        <>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Next Due</Text>
                                <Text style={[styles.statValue, diffDays <= 3 && { color: COLORS?.error }]}>
                                    {isPlanFullyPaid ? 'Completed' : (dueDate && !isNaN(dueDate.getTime())
                                        ? dueDate.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
                                        : 'Due Now')}
                                </Text>
                            </View>
                            {!isPlanFullyPaid && (
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Remaining</Text>
                                    <Text style={styles.statValue}>
                                        ₹{Math.max(plan.totalAmount - plan.totalSaved, 0).toLocaleString()}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Payment Buttons */}
                <View style={{ gap: 10 }}>
                    {/* Withdrawal / Settlement Actions */}
                    {(effectiveStatus === 'completed' || effectiveStatus === 'closed' || effectiveStatus === 'requested_withdrawal' || (effectiveStatus === 'active' && isPlanFullyPaid)) && (
                        <View>
                            {effectiveStatus === 'requested_withdrawal' ? (
                                <View style={[styles.payButton1, { backgroundColor: '#FF9800' }]}>
                                    <Text style={styles.payButtonText}>Withdrawal Requested - Pending</Text>
                                </View>
                            ) : (
                                plan.returnType === 'Cash' || effectiveStatus === 'closed' ? (
                                    <TouchableOpacity
                                        style={[styles.payButton1, { backgroundColor: COLORS?.success }]}
                                        onPress={() => openWithdrawalModal(plan)}
                                    >
                                        <Text style={styles.payButtonText}>Request Withdrawal / Settlement</Text>
                                    </TouchableOpacity>
                                ) : null
                            )}
                        </View>
                    )}

                    {plan.status === 'settled' && (
                        <View style={{ backgroundColor: '#F0FFF4', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#C6F6D5' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Icon name="check-circle" size={16} color="#38A169" />
                                <Text style={{ marginLeft: 6, fontWeight: 'bold', color: '#2F855A', fontSize: 14 }}>Plan Settled Successfully</Text>
                            </View>
                            {plan.settlementDetails && (
                                <>
                                    <Text style={{ fontSize: 12, color: '#2F855A', marginBottom: 2 }}>
                                        Amount: <Text style={{ fontWeight: 'bold' }}>₹{plan.settlementDetails.amount}</Text>
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#2F855A', marginBottom: 2 }}>
                                        Ref: {plan.settlementDetails.transactionId}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#2F855A', marginBottom: 2 }}>
                                        Date: {new Date(plan.settlementDetails.settledDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </Text>
                                    {plan.settlementDetails.note && (
                                        <Text style={{ fontSize: 12, color: '#2F855A', fontStyle: 'italic' }}>
                                            Note: {plan.settlementDetails.note}
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>
                    )}
                    
                    {plan.status === 'delivered_gold' && (
                        <View style={{ backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', marginTop: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <Icon name="gift" size={16} color="#B45309" />
                                <Text style={{ marginLeft: 6, fontWeight: 'bold', color: '#92400E', fontSize: 14 }}>Gold Delivered Successfully</Text>
                            </View>
                            {(() => {
                                const details = plan.deliveryDetails || (plan.deliveryHistory?.length > 0 ? plan.deliveryHistory[plan.deliveryHistory.length - 1] : null);
                                if (!details) return null;
                                return (
                                    <>
                                        <Text style={{ fontSize: 12, color: '#92400E', marginBottom: 2 }}>
                                            Delivered On: {new Date(details.deliveredDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </Text>
                                    </>
                                );
                            })()}
                        </View>
                    )}
                    {effectiveStatus === 'requested_closure' ? (
                        <View style={[styles.payButton, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', borderWidth: 1 }]}>
                            <Text style={[styles.payButtonText, { color: '#6B7280' }]}>
                                Closure Requested - Awaiting Merchant Approval
                            </Text>
                        </View>
                    ) : effectiveStatus === 'active' && (
                        <>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {isPayable && (
                                    <TouchableOpacity
                                        style={[
                                            styles.payButton,
                                            { flex: 1 },
                                            diffDays <= 3 ? styles.payButtonUrgent : styles.payButtonNormal,
                                            hasPaidCurrentMonth(plan) && { backgroundColor: '#E5E7EB', borderColor: '#D1D5DB' }
                                        ]}
                                        onPress={() => openOfflineModal(plan)}
                                        disabled={hasPaidCurrentMonth(plan)}
                                    >
                                        <Text style={[
                                            styles.payButtonText,
                                            diffDays <= 3 ? styles.payButtonTextUrgent : styles.payButtonTextNormal,
                                            hasPaidCurrentMonth(plan) && { color: '#9CA3AF' }
                                        ]}>
                                            {hasPaidCurrentMonth(plan) ? 'Paid This Month' : 'Pay / Add Money'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.payButton1, { flex: 1, backgroundColor: '#FFF3E0', borderColor: '#FFE0B2', borderWidth: 1 }]}
                                    onPress={() => openClosingModal(plan)}
                                >
                                    <Text style={[styles.payButtonText, { color: '#E65100' }]}>
                                        Close Plan
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>

                {/* Display all receipts directly on the card */}
                {((plan.settlementDetails?.receiptImage) || 
                  (plan.deliveryDetails?.receiptImage) || 
                  (plan.deliveryHistory?.some(d => d.receiptImage))) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 10, paddingBottom: 15, marginTop: 10 }}>
                        {plan.settlementDetails?.receiptImage && (
                            <TouchableOpacity
                                style={[styles.chipBtn, { margin: 4 }]}
                                onPress={() => openReceipt(`${BASE_URL}${plan.settlementDetails.receiptImage}`)}
                            >
                                <Icon name="receipt" size={12} color="#2E7D32" />
                                <Text style={[styles.chipBtnText, { fontSize: 12 }]}>Settlement Receipt</Text>
                            </TouchableOpacity>
                        )}
                        {plan.deliveryDetails?.receiptImage && (
                            <TouchableOpacity
                                style={[styles.chipBtn, { margin: 4, backgroundColor: '#FFF8E1', borderColor: '#FFD54F' }]}
                                onPress={() => openReceipt(`${BASE_URL}${plan.deliveryDetails.receiptImage}`)}
                            >
                                <Icon name="receipt" size={12} color="#B45309" />
                                <Text style={[styles.chipBtnText, { color: '#B45309', fontSize: 12 }]}>Delivery Receipt</Text>
                            </TouchableOpacity>
                        )}
                        {plan.deliveryHistory?.filter(d => d.receiptImage).map((delivery, index) => (
                            <TouchableOpacity
                                key={`delivery-receipt-${index}`}
                                style={[styles.chipBtn, { margin: 4, backgroundColor: '#FFF8E1', borderColor: '#FFD54F' }]}
                                onPress={() => openReceipt(`${BASE_URL}${delivery.receiptImage}`)}
                            >
                                <Icon name="receipt" size={12} color="#B45309" />
                                <Text style={[styles.chipBtnText, { color: '#B45309', fontSize: 12 }]}>Receipt {index + 1}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={[styles.footerRow, { backgroundColor: '#f8f9fa' }]}>
                    <Icon name="piggy-bank" size={12} color={COLORS?.primary} />
                    <Text style={styles.footerText}>
                        Target Goal: ₹{(plan.totalAmount || 0).toLocaleString()}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.historyToggleButton}
                    onPress={() => setExpandedHistoryId(expandedHistoryId === plan._id ? null : plan._id)}
                >
                    <Text style={styles.historyToggleText}>
                        {expandedHistoryId === plan._id ? 'Hide Payment History' : 'View Payment History'}
                    </Text>
                    <Icon name={expandedHistoryId === plan._id ? "chevron-up" : "chevron-down"} size={10} color={COLORS?.primary} />
                </TouchableOpacity>

                {expandedHistoryId === plan._id && (
                    <View style={styles.historyContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={styles.historyTitle}>Payment History</Text>
                            <TouchableOpacity onPress={() => generateStatement(plan)}>
                                <Icon name="file-download" size={16} color={COLORS?.primary} />
                            </TouchableOpacity>
                        </View>
                        {plan.history && plan.history.length > 0 ? (
                            plan.history.map((payment, index) => (
                                <View key={payment._id || index} style={styles.historyItem}>
                                    <View style={styles.historyLeft}>
                                        <Icon
                                            name={payment.isDelivered ? "gift" : "check-circle"}
                                            size={10}
                                            color={payment.isDelivered ? "#d4af37" : (payment.status === 'Pending Approval' ? 'orange' : payment.status === 'Rejected' ? 'red' : "#2E7D32")}
                                            style={{ marginTop: 2 }}
                                        />
                                        <View style={{ marginLeft: 8 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={styles.historyDate}>
                                                    {`${new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${new Date(payment.createdAt || payment.paymentDate || new Date()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                                                </Text>
                                                {payment.isDelivered && (
                                                    <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginLeft: 6 }}>
                                                        <Text style={{ fontSize: 8, color: '#92400e', fontWeight: '800' }}>DELIVERED</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[styles.historyStatus, { color: payment.isDelivered ? '#d4af37' : (payment.status === 'Pending Approval' ? 'orange' : payment.status === 'Rejected' ? 'red' : '#666') }]}>
                                                {payment.isDelivered ? 'Delivered' : (payment.status || 'Paid')}
                                            </Text>
                                            {payment.notes && payment.status === 'Rejected' && (
                                                <Text style={{ fontSize: 10, color: 'red', marginTop: 2 }}>{payment.notes}</Text>
                                            )}
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.historyAmount, payment.isDelivered && { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                                            + ₹{payment.amount}
                                        </Text>
                                        {payment.lockedGoldRate > 0 && plan.returnType?.toLowerCase() === 'gold' && (
                                            <Text style={{ fontSize: 9, color: '#666', marginTop: 2 }}>
                                                Rate: ₹{payment.lockedGoldRate.toFixed(2)}/g
                                            </Text>
                                        )}
                                        {payment.goldWeight > 0 && (
                                            <Text style={[{ fontSize: 10, color: '#B45309', fontWeight: 'bold' }, payment.isDelivered && { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                                                {payment.goldWeight.toFixed(3)}g Gold
                                            </Text>
                                        )}
                                        {(payment.status === 'Paid' || payment.status === 'Completed') && !payment.isDelivered && (
                                            <TouchableOpacity onPress={() => generateInvoice(payment, plan)} style={{ marginTop: 6, padding: 4 }}>
                                                <Icon name="file-invoice" size={14} color={COLORS?.primary} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noHistoryText}>No payments recorded yet.</Text>
                        )}

                        {plan.deliveryHistory && plan.deliveryHistory.length > 0 && (
                            <View style={{ marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' }}>
                                <Text style={[styles.historyTitle, { color: '#915200', marginBottom: 10 }]}>Delivery History</Text>
                                {plan.deliveryHistory.map((delivery, dIdx) => (
                                    <View key={dIdx} style={[styles.historyItem, { borderLeftWidth: 3, borderLeftColor: '#d4af37', paddingLeft: 10, backgroundColor: '#fffdf5' }]}>
                                        <View style={styles.historyLeft}>
                                            <Icon name="truck-loading" size={10} color="#d4af37" style={{ marginTop: 2 }} />
                                            <View style={{ marginLeft: 8 }}>
                                                <Text style={styles.historyDate}>
                                                    {new Date(delivery.deliveredDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </Text>
                                                <Text style={{ fontSize: 10, color: '#666' }}>{delivery.notes || 'Partial Delivery'}</Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            {delivery.goldWeight > 0 && (
                                                <Text style={{ fontSize: 11, color: '#92400e', fontWeight: 'bold' }}>
                                                    - {delivery.goldWeight.toFixed(3)}g Gold
                                                </Text>
                                            )}
                                            {delivery.amount > 0 && (
                                                <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 'bold' }}>
                                                    - ₹{delivery.amount.toLocaleString()}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text style={styles.sectionTitle}>My Subscriptions</Text>
                    <Text style={styles.sectionSubtitle}>Track your gold savings progress</Text>
                </View>
                {/* {user.acc_no && (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                        <Text style={{ fontSize: 10, color: COLORS?.dark, fontWeight: 'bold' }}>A/C NO</Text>
                        <Text style={{ fontSize: 12, color: COLORS?.primary, fontWeight: '800' }}>{user.acc_no}</Text>
                    </View>
                )} */}
            </View>
        </View>
    );

    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: 50 }} />;
        return (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS?.primary} />
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading) return <SkeletonLoader />;
        return (
            <View style={styles.emptyContainer}>
                <Icon name="box-open" size={40} color={COLORS?.secondary} />
                <Text style={styles.emptyText}>You haven't subscribed to any plans yet.</Text>
            </View>
        );
    };

    return (
        <ImageBackground source={require('../../../public/assests/DKGOLDBG.png')} style={styles.wrapper} resizeMode="cover">

            <FlatList
                data={displayedPlans}
                renderItem={renderPlanItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.content}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            />

            {/* <View
                style={styles.bottomFade}
                pointerEvents="none"
            /> */}

            {/* Blocking Payment Modal */}
            <Modal visible={submittingOffline} transparent={true} animationType="fade" onRequestClose={() => { }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <ActivityIndicator size="large" color="#d4af37" />
                    <Text style={{ color: '#fff', marginTop: 15, fontSize: 18, fontWeight: 'bold' }}>Processing Payment...</Text>
                    <Text style={{ color: '#e0e0e0', marginTop: 5, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }}>Please do not close the app, change tabs, or press back.</Text>
                </View>
            </Modal>

            {/* Generating Receipt Modal */}
            <Modal visible={generatingReceipt} transparent={true} animationType="fade" onRequestClose={() => { }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <ActivityIndicator size="large" color="#d4af37" />
                    <Text style={{ color: '#fff', marginTop: 15, fontSize: 18, fontWeight: 'bold' }}>Generating Receipt...</Text>
                    <Text style={{ color: '#e0e0e0', marginTop: 5, fontSize: 13, textAlign: 'center', paddingHorizontal: 20 }}>Please wait while we prepare your document.</Text>
                </View>
            </Modal>

            {/* Receipt Viewer Modal */}
            <Modal visible={receiptModalVisible} transparent={true} animationType="fade" onRequestClose={() => setReceiptModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }} onPress={() => setReceiptModalVisible(false)}>
                        <Icon name="times" size={20} color="#FFF" />
                    </TouchableOpacity>
                    {receiptImageUri && (
                        <Image source={{ uri: receiptImageUri }} style={{ width: '90%', height: '80%', resizeMode: 'contain' }} />
                    )}
                </View>
            </Modal>

            <CustomAlert {...alertConfig} onClose={hideAlert} />

            {/* Close Plan Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={closingModalVisible}
                onRequestClose={() => setClosingModalVisible(false)}
            >
                <View style={styles.centeredModalOverlay}>
                    <View style={styles.confirmModalContent}>
                        <View style={styles.confirmModalIconContainer}>
                            <Icon name="exclamation-triangle" size={32} color="#E65100" />
                        </View>

                        <Text style={styles.confirmModalTitle}>Close Plan?</Text>

                        <Text style={styles.confirmModalMessage}>
                            Are you sure you want to close <Text style={{ fontWeight: 'bold', color: COLORS?.dark }}>{selectedPlanForClosing?.planName}</Text>?
                            {"\n\n"}This will stop further payments and allow you to request settlement for your savings of <Text style={{ fontWeight: 'bold', color: COLORS?.primary }}>₹{(selectedPlanForClosing?.totalSaved || 0).toLocaleString()}</Text>.
                        </Text>

                        <View style={styles.confirmModalButtonContainer}>
                            <TouchableOpacity
                                style={styles.confirmModalCancelButton}
                                onPress={() => setClosingModalVisible(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.confirmModalCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmModalConfirmButton}
                                onPress={confirmCloseChit}
                                disabled={submittingClose}
                                activeOpacity={0.8}
                            >
                                {submittingClose ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.confirmModalConfirmText}>Confirm Close</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Offline Payment Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={offlineModalVisible}
                onRequestClose={() => setOfflineModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header with Title & Close Button */}
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Report Payment</Text>
                                <Text style={styles.modalSubtitle}>
                                    Plan: <Text style={{ fontWeight: 'bold', color: COLORS?.primary }}>{selectedPlanForOffline?.planName}</Text>
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setOfflineModalVisible(false)} style={styles.closeButton}>
                                <Icon name="times" size={16} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Payment Details Form */}
                            <View style={styles.formContainer}>
                                <View style={styles.formHeader}>
                                    <Text style={styles.formTitle}>Payment Details</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Enter Amount</Text>
                                    <View style={[styles.inputWrapper, !isPlanUnlimited(selectedPlanForOffline) && styles.inputWrapperDisabled]}>
                                        <Text style={styles.currencyPrefix}>₹</Text>
                                        <TextInput
                                            style={styles.flexInput}
                                            placeholder={isPlanUnlimited(selectedPlanForOffline) ? "Minimum 500" : "0.00"}
                                            value={customAmount}
                                            onChangeText={setCustomAmount}
                                            keyboardType="numeric"
                                            placeholderTextColor="#999"
                                            editable={isPlanUnlimited(selectedPlanForOffline)}
                                        />
                                        {!isPlanUnlimited(selectedPlanForOffline) && (
                                            <Icon name="lock" size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
                                        )}
                                    </View>
                                    <Text style={styles.inputHint}>
                                        {isPlanUnlimited(selectedPlanForOffline)
                                            ? 'Enter investment amount (₹500 - ₹1,00,000).'
                                            : 'This is a fixed installment amount for your plan.'}
                                    </Text>
                                    {isPlanUnlimited(selectedPlanForOffline) && (
                                        <Text style={{
                                            fontSize: 12,
                                            color: (customAmount && (Number(customAmount) < 500 || Number(customAmount) > 100000)) ? '#dc3545' : '#b45309',
                                            marginTop: 6,
                                            fontWeight: '600'
                                        }}>
                                            {(customAmount && (Number(customAmount) < 500 || Number(customAmount) > 100000))
                                                ? '⚠️ Amount must be between ₹500 and ₹1,00,000.'
                                                : 'Note: Amount must be between ₹500 and ₹1,00,000.'
                                            }
                                        </Text>
                                    )}

                                    {((selectedPlanForOffline?.returnType?.toLowerCase() === 'gold') || isPlanUnlimited(selectedPlanForOffline)) && goldRate > 0 && (
                                        <View style={{ marginTop: 15, marginBottom: 15, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#FEF3C7' }}>
                                            {(() => {
                                                const liveRate = selectedPlanForOffline?.merchant?.goldRate24k > 0 ? Number(selectedPlanForOffline.merchant.goldRate24k) : goldRate;
                                                return (
                                                    <>
                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                            <Text style={[styles.inputLabel, { color: '#92400E', marginBottom: 0 }]}>Applied Gold Rate (₹/gm)</Text>
                                                            <View style={{ backgroundColor: '#D97706', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>LIVE</Text>
                                                            </View>
                                                        </View>
                                                        <View style={[styles.inputWrapper, { backgroundColor: '#F3F4F6', borderColor: '#FCD34D', marginBottom: 12, height: 45 }]}>
                                                            <Text style={[styles.flexInput, { color: '#666', fontSize: 15, textAlignVertical: 'center', paddingTop: Platform.OS === 'ios' ? 12 : 0 }]}>
                                                                ₹{liveRate.toFixed(2)}
                                                            </Text>
                                                            <Icon name="bolt" size={12} color="#D97706" />
                                                        </View>

                                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#FEF3C7', marginBottom: 10 }}>
                                                            <Text style={{ fontSize: 12, color: '#92400E', fontWeight: 'bold' }}>Calculated Gold Weight:</Text>
                                                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS?.dark }}>
                                                                {(customAmount && liveRate) ? (parseFloat(customAmount) / liveRate).toFixed(3) : '0.000'}g
                                                            </Text>
                                                        </View>
                                                    </>
                                                );
                                            })()}
                                        </View>
                                    )}
                                </View>
                            </View>

                            {(() => {
                                const isPayDisabled = submittingOffline ||
                                    (isPlanUnlimited(selectedPlanForOffline)
                                        ? (!customAmount || isNaN(customAmount) || Number(customAmount) < 500 || Number(customAmount) > 100000)
                                        : (!customAmount || isNaN(customAmount) || Number(customAmount) <= 0));
                                return (
                                    <TouchableOpacity
                                        style={[styles.submitSolidButton, isPayDisabled && { opacity: 0.5 }]}
                                        onPress={submitOfflinePayment}
                                        disabled={isPayDisabled}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                            {submittingOffline ? (
                                                <ActivityIndicator color="#fff" size="small" />
                                            ) : (
                                                <>
                                                    <Text style={styles.submitButtonText}>Pay Securely via Razorpay</Text>
                                                    <Icon name="arrow-right" size={12} color="#fff" style={{ marginLeft: 8 }} />
                                                </>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Withdrawal Request Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={withdrawalModalVisible}
                onRequestClose={() => setWithdrawalModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Withdrawal</Text>
                            <TouchableOpacity onPress={() => setWithdrawalModalVisible(false)} style={styles.closeButton}>
                                <Icon name="times" size={16} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <Text style={styles.modalSubtitle}>
                                Plan: <Text style={{ fontWeight: 'bold', color: COLORS?.primary }}>{selectedPlanForWithdrawal?.planName}</Text>
                            </Text>
                            <View style={styles.modalInfo}>
                                <Text style={{ fontSize: 13, color: '#555' }}>
                                    Please provide your bank details to withdraw <Text style={{ fontWeight: 'bold', color: COLORS?.dark }}>₹{selectedPlanForWithdrawal?.totalSaved?.toLocaleString()}</Text>.
                                </Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Bank Account Number</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter Account Number"
                                    value={withdrawalForm.accountNumber}
                                    onChangeText={(t) => setWithdrawalForm({ ...withdrawalForm, accountNumber: t })}
                                    keyboardType="numeric"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>IFSC Code</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter IFSC Code"
                                    value={withdrawalForm.ifsc}
                                    onChangeText={(t) => setWithdrawalForm({ ...withdrawalForm, ifsc: t })}
                                    autoCapitalize="characters"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Bank Name (Optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter Bank Name"
                                    value={withdrawalForm.bankName}
                                    onChangeText={(t) => setWithdrawalForm({ ...withdrawalForm, bankName: t })}
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Message (Optional)</Text>
                                <TextInput
                                    style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
                                    placeholder="Any specific instructions..."
                                    value={withdrawalForm.message}
                                    onChangeText={(t) => setWithdrawalForm({ ...withdrawalForm, message: t })}
                                    multiline
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitSolidButton, submittingWithdrawal && { opacity: 0.7 }]}
                                onPress={submitWithdrawalRequest}
                                disabled={submittingWithdrawal}
                            >
                                {submittingWithdrawal ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit Withdrawal Request</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Invoice Popup Modal */}
            <Modal
                visible={!!invoiceHtml}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setInvoiceHtml(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { padding: 0, height: '80%', overflow: 'hidden' }]}>
                        <View style={[styles.modalHeader, { padding: 16, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderColor: '#eee', marginBottom: 0 }]}>
                            <Text style={styles.modalTitle}>Receipt</Text>
                            <TouchableOpacity onPress={() => setInvoiceHtml(null)}>
                                <Icon name="times" size={20} color={COLORS?.dark} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flex: 1, position: 'relative' }}>
                            <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={{ flex: 1 }}>
                                <WebView
                                    originWhitelist={['*']}
                                    source={{ html: invoiceHtml }}
                                    style={{ flex: 1 }}
                                    showsVerticalScrollIndicator={false}
                                    allowFileAccess={true}
                                    allowUniversalAccessFromFileURLs={true}
                                    allowFileAccessFromFileURLs={true}
                                    onLoadStart={() => setWebViewLoading(true)}
                                    onLoadEnd={() => setWebViewLoading(false)}
                                />
                            </ViewShot>
                            {webViewLoading && (
                                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color="#915200" />
                                </View>
                            )}
                        </View>

                        <View style={{ padding: 16, borderTopWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#f0f0f0', flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' }]}
                                onPress={() => setInvoiceHtml(null)}
                            >
                                <Text style={{ color: COLORS?.dark, fontWeight: 'bold' }}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: COLORS?.primary, flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }]}
                                onPress={downloadInvoiceAsJPG}
                            >
                                <Icon name="download" size={16} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save JPG</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#fffbf0' // Premium Gold Theme Background
    },
    content: {
        padding: 16,
        paddingTop: 20,
        paddingBottom: 100,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#e6ded4',
        marginBottom: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
    },
    emptyText: {
        marginTop: 15,
        color: COLORS?.secondary,
        fontSize: 14,
    },
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    planName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginBottom: 4,
    },
    merchantRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    merchantName: {
        fontSize: 12,
        color: COLORS?.secondary,
        marginLeft: 5,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
        backgroundColor: '#fafbfc',
        padding: 12,
        borderRadius: 10,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS?.secondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 11,
        color: COLORS?.secondary,
        fontWeight: '600',
    },
    progressValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS?.primary,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS?.primary,
        borderRadius: 3,
    },
    compactProgress: {
        marginTop: 10,
        marginBottom: 8,
    },
    compactStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    compactStatText: {
        fontSize: 10,
        color: COLORS?.secondary,
        fontWeight: '600',
    },
    expandIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
        paddingVertical: 4,
    },
    expandText: {
        fontSize: 9,
        color: COLORS?.primary,
        marginRight: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS?.primary + '08',
        padding: 8,
        borderRadius: 8,
        justifyContent: 'center',
    },
    footerText: {
        marginLeft: 6,
        color: COLORS?.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    payButton: {
        backgroundColor: COLORS?.primary,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    payButton1: {
        backgroundColor: COLORS?.primary,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
        paddingVertical: 5
    },
    payButtonUrgent: {
        padding: 14,
        shadowOpacity: 0.5,
        elevation: 8,
    },
    payButtonNormal: {
        padding: 7,
        shadowOpacity: 0.15,
        elevation: 2,
    },
    payButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    payButtonTextUrgent: {
        fontSize: 15,
    },
    payButtonTextNormal: {
        fontSize: 11,
    },
    historyToggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    historyToggleText: {
        color: COLORS?.primary,
        fontSize: 11,
        marginRight: 5,
        fontWeight: '700',
    },
    historyContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e8eaed',
        backgroundColor: '#fafbfc',
        borderRadius: 8,
        padding: 10,
    },
    historyTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e8eaed',
        backgroundColor: '#fff',
        borderRadius: 6,
        marginBottom: 6,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    historyDate: {
        fontSize: 12,
        color: COLORS?.dark,
        fontWeight: '600',
    },
    historyStatus: {
        fontSize: 9,
        color: COLORS?.secondary,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    historyAmount: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2E7D32',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    noHistoryText: {
        fontSize: 11,
        color: COLORS?.secondary,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 5,
        padding: 12,
    },
    // Offline Modal Styles
    outlineButton: {
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: COLORS?.primary,
        backgroundColor: 'transparent',
    },
    outlineButtonUrgent: {
        padding: 12,
        borderWidth: 2,
    },
    outlineButtonNormal: {
        padding: 6,
        borderWidth: 1,
    },
    outlineButtonText: {
        color: COLORS?.primary,
        fontWeight: 'bold',
    },
    outlineButtonTextUrgent: {
        fontSize: 13,
    },
    outlineButtonTextNormal: {
        fontSize: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)', // Slightly lighter for modern feel
        justifyContent: 'flex-end', // iOS-style bottom sheet feel for better usability
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '90%',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS?.dark,
        letterSpacing: -0.5,
    },
    modalSubtitle: {
        fontSize: 13,
        color: COLORS?.secondary,
        marginTop: 4,
    },
    closeButton: {
        backgroundColor: '#F3F4F6',
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    upiCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFF1B8',
    },
    upiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    upiHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    upiIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    upiLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#92400E',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    stepBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    stepBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#92400E',
    },
    upiBody: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    upiIdContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    upiIdText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.primary,
        flex: 1,
    },
    copyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS?.primary + '10',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    copyBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS?.primary,
    },
    amountAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 10,
        borderRadius: 10,
        marginTop: 12,
        gap: 8,
    },
    amountAlertText: {
        fontSize: 11,
        color: '#92400E',
        flex: 1,
    },
    formContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    formTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS?.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        height: 50,
        paddingHorizontal: 12,
    },
    inputWrapperDisabled: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    currencyPrefix: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginRight: 6,
    },
    flexInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS?.dark,
        height: '100%',
    },
    inputHint: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 6,
        fontStyle: 'italic',
    },
    textInput: {
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
        fontSize: 14,
        color: COLORS?.dark,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
        height: 50,
    },
    datePickerText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: COLORS?.dark,
        marginLeft: 10,
    },
    uploadButton: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS?.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    uploadButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    uploadHint: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4,
    },
    imagePreviewContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
    imagePreview: {
        width: '100%',
        height: 180,
        resizeMode: 'cover',
    },
    imageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#F9FAFB',
    },
    imageName: {
        fontSize: 11,
        color: '#4B5563',
        flex: 1,
    },
    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    submitButton: {
        marginTop: 24,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    submitSolidButton: {
        marginTop: 24,
        borderRadius: 16,
        backgroundColor: COLORS?.primary,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    bottomFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        zIndex: 10
    },
    modalInfo: {
        backgroundColor: '#EEF2FF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    // Centered Modal Styles (Quick Confirmations)
    centeredModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmModalContent: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    confirmModalIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    confirmModalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS?.dark,
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    confirmModalMessage: {
        fontSize: 15,
        color: COLORS?.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    confirmModalButtonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmModalCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmModalConfirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#E65100',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#E65100',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    confirmModalCancelText: {
        fontWeight: 'bold',
        color: '#6B7280',
        fontSize: 15,
    },
    confirmModalConfirmText: {
        fontWeight: 'bold',
        color: '#fff',
        fontSize: 15,
    },
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
    calcDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#FEF3C7',
    },
    goldRefreshHint: {
        fontSize: 10,
        color: '#92400E',
        fontStyle: 'italic',
        marginTop: 10,
        textAlign: 'center',
        opacity: 0.8,
    },
    chipBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#E8F5E9',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    chipBtnText: {
        fontSize: 11,
        color: '#2E7D32',
        fontWeight: '600',
        marginLeft: 4,
    },
});

export default AnalyticsTab;
