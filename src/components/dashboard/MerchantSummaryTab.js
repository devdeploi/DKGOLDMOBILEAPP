import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Dimensions, ScrollView, Platform, ImageBackground
} from 'react-native';
import CustomAlert from '../CustomAlert';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { APIURL } from '../../constants/api';
import { COLORS } from '../../styles/theme';
import FCMService from '../../services/FCMService';

const { width } = Dimensions.get('window');

const MerchantSummaryTab = ({ user }) => {
    const [loading, setLoading] = useState(false);
    const [payments, setPayments] = useState([]);

    // Filters
    const [isAllData, setIsAllData] = useState(true);
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [paymentType, setPaymentType] = useState('all');

    // Modals
    const [isFromPickerVisible, setFromPickerVisible] = useState(false);
    const [isToPickerVisible, setToPickerVisible] = useState(false);

    // Summary Totals
    const [totals, setTotals] = useState({
        CASH: 0,
        UPI: 0,
        offline: 0,
        online: 0,
        totalAmount: 0
    });

    // Custom Alert
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

    const showAlert = (title, message, type = 'error') => {
        setAlertConfig({ visible: true, title, message, type });
    };

    const hideAlert = () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    };

    const fetchSummaryData = async () => {
        try {
            setLoading(true);
            const token = user.token;
            let url = `${APIURL}/payments/search/range?allData=${isAllData}&paymentType=${paymentType}`;

            if (!isAllData) {
                url += `&fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`;
            } else {
                url += `&fromDate=2000-01-01T00:00:00.000Z&toDate=2100-01-01T23:59:59.999Z`;
            }

            const { data } = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const fetchedPayments = data.payments || [];

            // Calculate totals
            let calcTotals = { CASH: 0, UPI: 0, offline: 0, online: 0, totalAmount: 0 };

            fetchedPayments.forEach(payment => {
                const amount = Number(payment.amount) || 0;
                calcTotals.totalAmount += amount;

                const type = payment.type || 'offline';
                if (type.toUpperCase() === 'CASH') calcTotals.CASH += amount;
                else if (type.toUpperCase() === 'UPI') calcTotals.UPI += amount;
                else if (type.toLowerCase() === 'online') calcTotals.online += amount;
                else calcTotals.offline += amount;
            });

            setPayments(fetchedPayments);
            setTotals(calcTotals);

        } catch (error) {
            console.error("Error fetching summary data:", error);
            showAlert("Error", "Could not fetch summary data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmFrom = (date) => {
        setFromDate(date);
        setFromPickerVisible(false);
    };

    const handleConfirmTo = (date) => {
        setToDate(date);
        setToPickerVisible(false);
    };

    const exportToPDF = async () => {
        if (payments.length === 0) {
            showAlert("No Data", "There is no data to export for the selected date range.", "warning");
            return;
        }

        try {
            setLoading(true);

            // Get FCM Token for background push notification
            const fcmToken = await FCMService.getFCMToken();

            const token = user.token;

            const fromDateStr = fromDate.toISOString();
            const toDateStr = toDate.toISOString();

            await axios.post(`${APIURL}/payments/export-pdf-background`, {
                fromDate: isAllData ? null : fromDateStr,
                toDate: isAllData ? null : toDateStr,
                allData: isAllData.toString(),
                fcmToken: fcmToken,
                reportType: 'summary',
                paymentType: paymentType
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            showAlert("Export Started", "Your Summary PDF is being generated in the background. You will receive a notification and it will be downloaded automatically when ready.", "success");

        } catch (error) {
            console.error("PDF export failed:", error);
            showAlert("Export Failed", "There was an issue starting the PDF export.", "error");
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <Text style={styles.title}>Summary Report</Text>

            <View style={styles.filterSection}>
                <View style={styles.switchRow}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, isAllData ? styles.toggleBtnActive : null]}
                        onPress={() => setIsAllData(true)}
                    >
                        <Text style={[styles.toggleBtnText, isAllData ? styles.toggleBtnTextActive : null]}>All Data</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, !isAllData ? styles.toggleBtnActive : null]}
                        onPress={() => setIsAllData(false)}
                    >
                        <Text style={[styles.toggleBtnText, !isAllData ? styles.toggleBtnTextActive : null]}>Date Range</Text>
                    </TouchableOpacity>
                </View>

                {!isAllData && (
                    <View style={styles.datePickerRow}>
                        <TouchableOpacity style={styles.dateInput} onPress={() => setFromPickerVisible(true)}>
                            <Text style={styles.dateText}>{fromDate.toLocaleDateString()}</Text>
                            <Icon name="calendar-alt" size={16} color="#666" />
                        </TouchableOpacity>
                        <Text style={{ marginHorizontal: 10, color: '#333' }}>to</Text>
                        <TouchableOpacity style={styles.dateInput} onPress={() => setToPickerVisible(true)}>
                            <Text style={styles.dateText}>{toDate.toLocaleDateString()}</Text>
                            <Icon name="calendar-alt" size={16} color="#666" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.typeFilterRow}>
                    {['all', 'CASH', 'UPI', 'OFFLINE', 'ONLINE'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.typeChip, paymentType === type && styles.typeChipActive]}
                            onPress={() => setPaymentType(type)}
                        >
                            <Text style={[styles.typeChipText, paymentType === type && styles.typeChipTextActive]}>
                                {type === 'all' ? 'All Types' : type}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.fetchBtn} onPress={fetchSummaryData}>
                        <Icon name="sync-alt" size={14} color="#fff" />
                        <Text style={styles.fetchBtnText}>Fetch Summary</Text>
                    </TouchableOpacity>
                    {payments.length > 0 && (
                        <TouchableOpacity style={styles.pdfBtn} onPress={exportToPDF}>
                            <Icon name="file-pdf" size={14} color="#fff" />
                            <Text style={styles.pdfBtnText}>Export PDF</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.cardsContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.cardLabel}>CASH</Text>
                    <Text style={styles.cardValue}>₹{totals.CASH}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.cardLabel}>UPI</Text>
                    <Text style={styles.cardValue}>₹{totals.UPI}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.cardLabel}>OFFLINE</Text>
                    <Text style={styles.cardValue}>₹{totals.offline}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.cardLabel}>ONLINE</Text>
                    <Text style={styles.cardValue}>₹{totals.online}</Text>
                </View>
            </View>

            <View style={styles.totalHeader}>
                <Text style={styles.totalHeaderText}>Total Collection: ₹{totals.totalAmount}</Text>
            </View>

            <Text style={styles.listTitle}>Transactions</Text>
        </View>
    );

    const renderPaymentItem = ({ item }) => (
        <View style={styles.paymentRow}>
            <View style={styles.paymentLeft}>
                <Text style={styles.paymentName}>{item.user?.name || 'Unknown'}</Text>
                <Text style={styles.paymentDate}>{new Date(item.paymentDate || item.createdAt).toLocaleDateString()}</Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Mobile: {item.user?.phone || 'N/A'}</Text>
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Acc No: {item.subAccNo || 'N/A'}</Text>
                <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{item.type || 'OFFLINE'}</Text>
                </View>
            </View>
            <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>+₹{item.amount}</Text>
                <Text style={styles.paymentPlan}>{item.chitPlan?.planName || 'N/A'}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={loading ? [] : payments}
                keyExtractor={(item, index) => item._id || index.toString()}
                renderItem={renderPaymentItem}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color="#D4AF37" />
                        </View>
                    ) : (
                        <Text style={styles.emptyText}>No payments found for this range.</Text>
                    )
                }
            />

            <DateTimePickerModal
                isVisible={isFromPickerVisible}
                mode="date"
                onConfirm={handleConfirmFrom}
                onCancel={() => setFromPickerVisible(false)}
            />
            <DateTimePickerModal
                isVisible={isToPickerVisible}
                mode="date"
                onConfirm={handleConfirmTo}
                onCancel={() => setToPickerVisible(false)}
            />

            <CustomAlert {...alertConfig} onClose={hideAlert} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent'
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerContainer: {
        marginBottom: 15
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
        textAlign: 'start'
    },
    filterSection: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: 20
    },
    switchRow: {
        flexDirection: 'row',
        marginBottom: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 4
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6
    },
    toggleBtnActive: {
        backgroundColor: '#D4AF37'
    },
    toggleBtnText: {
        color: '#666',
        fontWeight: 'bold'
    },
    toggleBtnTextActive: {
        color: '#fff'
    },
    datePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#fafafa',
        width: '40%',
        justifyContent: 'space-between'
    },
    dateText: {
        color: '#333',
        fontSize: 14
    },
    typeFilterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 15,
        gap: 8,
        justifyContent: 'center'
    },
    typeChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#eee',
        borderWidth: 1,
        borderColor: '#ddd'
    },
    typeChipActive: {
        backgroundColor: '#D4AF37',
        borderColor: '#915200'
    },
    typeChipText: {
        fontSize: 12,
        color: '#555',
        fontWeight: 'bold'
    },
    typeChipTextActive: {
        color: '#fff'
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    fetchBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#915200',
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    fetchBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8
    },
    pdfBtn: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#b91c1c',
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    pdfBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8
    },
    cardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 15
    },
    summaryCard: {
        width: '48%',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#D4AF37'
    },
    cardLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
        fontWeight: 'bold'
    },
    cardValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#915200'
    },
    totalHeader: {
        backgroundColor: '#D4AF37',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20
    },
    totalHeaderText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2
    },
    paymentLeft: {
        flex: 1
    },
    paymentName: {
        fontWeight: 'bold',
        color: '#333',
        fontSize: 15,
        marginBottom: 4
    },
    paymentDate: {
        color: '#888',
        fontSize: 12,
        marginBottom: 6
    },
    typeBadge: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start'
    },
    typeBadgeText: {
        fontSize: 10,
        color: '#666',
        fontWeight: 'bold'
    },
    paymentRight: {
        alignItems: 'flex-end'
    },
    paymentAmount: {
        fontWeight: 'bold',
        color: '#16a34a',
        fontSize: 16,
        marginBottom: 4
    },
    paymentPlan: {
        color: '#666',
        fontSize: 12
    },
    emptyText: {
        textAlign: 'center',
        color: '#888',
        marginTop: 20,
        fontStyle: 'italic'
    }
});

export default MerchantSummaryTab;
