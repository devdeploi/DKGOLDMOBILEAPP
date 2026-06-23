import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Modal,
    ScrollView,
    Alert,
    Platform,
    Image,
    ImageBackground
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import axios from 'axios';
import { APIURL } from '../constants/api';
import { COLORS } from '../styles/theme';
import CustomAlert from './CustomAlert';
import FCMService from '../services/FCMService';

const MerchantReports = ({ user, plans }) => {
    const formatIndianDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const [selectedPlanId, setSelectedPlanId] = useState('all');
    const [showPlanDropdown, setShowPlanDropdown] = useState(false);

    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
    const [endDate, setEndDate] = useState(new Date());
    const [isAllTime, setIsAllTime] = useState(true);

    const [isStartPickerVisible, setStartPickerVisible] = useState(false);
    const [isEndPickerVisible, setEndPickerVisible] = useState(false);

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [totalReceived, setTotalReceived] = useState(0);
    const [totalSettled, setTotalSettled] = useState(0);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    // Alert Config State
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        buttons: []
    });

    const showAlert = (title, message, type = 'info', buttons = []) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            type,
            buttons
        });
    };

    const hideAlert = () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            const token = user.token;

            const fromDateStr = startDate.toISOString().split('T')[0];
            const toDateStr = endDate.toISOString().split('T')[0];

            let url = `${APIURL}/payments/search/range?fromDate=${fromDateStr}&toDate=${toDateStr}`;
            if (isAllTime) {
                url = `${APIURL}/payments/search/range?allData=true`;
            }
            if (selectedPlanId !== 'all') {
                url += `&planId=${selectedPlanId}`;
            }

            const { data } = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // The backend returns { payments: [], settlements: [], totalPaymentsAmount, totalSettledAmount }
            const paymentsList = data.payments || [];
            const settlementsList = data.settlements || [];

            // Combine and sort by date descending
            const combinedResults = [
                ...paymentsList.map(p => ({ ...p, isSettlement: false })),
                ...settlementsList.map(s => ({ ...s, isSettlement: true }))
            ].sort((a, b) => {
                const dateA = new Date(a.paymentDate || a.createdAt || a.date);
                const dateB = new Date(b.paymentDate || b.createdAt || b.date);
                return dateB - dateA;
            });

            setPayments(combinedResults);
            setTotalReceived(data.totalPaymentsAmount || 0);
            setTotalSettled(data.totalSettledAmount || 0);
            setFiltersExpanded(false); // Collapse filters after search
        } catch (error) {
            console.error("Error fetching report:", error);
            showAlert("Error", "Failed to fetch report data.", "error");
        } finally {
            setLoading(false);
        }
    };

    const exportToPDF = async () => {
        if (payments.length === 0) {
            showAlert("Empty Data", "No payment records to export.", "warning");
            return;
        }

        try {
            setExporting(true);

            // Get FCM Token for background push notification
            const fcmToken = await FCMService.getFCMToken();

            const token = user.token;

            await axios.post(`${APIURL}/payments/export-pdf-background`, {
                fromDate: isAllTime ? null : startDate.toISOString(),
                toDate: isAllTime ? null : endDate.toISOString(),
                planId: selectedPlanId,
                allData: isAllTime.toString(),
                fcmToken: fcmToken
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            showAlert("Export Started", "Your PDF is being generated in the background. You will receive a notification and it will be downloaded automatically when ready.", "success");

        } catch (error) {
            console.error("Background PDF Export Error:", error);
            showAlert("Export Failed", "There was an issue starting the PDF export.", "error");
        } finally {
            setExporting(false);
        }
    };

    const selectedPlanName = selectedPlanId === 'all'
        ? 'All Plans'
        : (plans.find(p => p._id === selectedPlanId)?.planName || 'Select Plan');

    const renderPaymentItem = ({ item }) => (
        <View style={styles.paymentCard}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.userName}>{item.user?.name || 'Unknown'}</Text>
                    <Text style={[styles.typeText, { color: item.isSettlement ? '#e74c3c' : '#27ae60' }]}>
                        {item.isSettlement ? (item.isPartial ? 'Partial Settled' : 'Settled') : 'Received'}
                    </Text>
                </View>
                <Text style={[styles.amountText, { color: item.isSettlement ? '#e74c3c' : '#27ae60' }]}>₹{item.amount}</Text>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Icon name="phone" size={12} color="#666" style={{ width: 16 }} />
                    <Text style={styles.infoText}>{item.user?.phone || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Icon name="id-badge" size={12} color="#666" style={{ width: 16 }} />
                    <Text style={styles.infoText}>Sub Acc No: {item.subAccNo || item.user?.acc_no || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Icon name="clipboard-list" size={12} color="#666" style={{ width: 16 }} />
                    <Text style={styles.infoText}>{item.isSettlement ? item.planName : (item.chitPlan?.planName || 'N/A')}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Icon name="calendar-alt" size={12} color="#666" style={{ width: 16 }} />
                    <Text style={styles.infoText}>{formatIndianDate(item.paymentDate || item.createdAt || item.date)}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <ImageBackground source={require('../../public/assests/DKGOLDBG.png')} style={styles.container} resizeMode="cover">
            <View style={styles.header}>
                <Text style={styles.title}>Payment Reports</Text>
            </View>

            <View style={styles.filtersContainer}>
                <TouchableOpacity
                    style={styles.filtersHeader}
                    onPress={() => setFiltersExpanded(!filtersExpanded)}
                    activeOpacity={0.7}
                >
                    <View style={styles.filtersHeaderLeft}>
                        <Icon name="filter" size={14} color="#fff" />
                        <Text style={styles.filtersHeaderTitle}>Search & Filters</Text>
                    </View>
                    <View style={styles.filtersHeaderRight}>
                        {!filtersExpanded && (
                            <Text style={styles.filtersSummaryText} numberOfLines={1}>
                                {selectedPlanName} | {isAllTime ? 'All Time' : `${formatIndianDate(startDate)} - ${formatIndianDate(endDate)}`}
                            </Text>
                        )}
                        <Icon name={filtersExpanded ? "chevron-up" : "chevron-down"} size={14} color="#fff" style={{ marginLeft: 8 }} />
                    </View>
                </TouchableOpacity>

                {filtersExpanded && (
                    <View style={styles.filtersExpandedContent}>
                        {/* Plan Selector */}
                        <Text style={styles.label}>Select Plan</Text>
                        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowPlanDropdown(true)}>
                            <Text style={styles.dropdownText}>{selectedPlanName}</Text>
                            <Icon name="chevron-down" size={14} color="#666" />
                        </TouchableOpacity>

                        {/* Data Scope Selector */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <TouchableOpacity 
                                style={[styles.scopeBtn, !isAllTime && styles.scopeBtnActive]}
                                onPress={() => setIsAllTime(false)}
                            >
                                <Text style={[styles.scopeBtnText, !isAllTime && styles.scopeBtnTextActive]}>Date Range</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.scopeBtn, isAllTime && styles.scopeBtnActive]}
                                onPress={() => setIsAllTime(true)}
                            >
                                <Text style={[styles.scopeBtnText, isAllTime && styles.scopeBtnTextActive]}>All Data</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Date Selectors */}
                        {!isAllTime && (
                            <View style={styles.dateRow}>
                                <View style={styles.dateCol}>
                                    <Text style={styles.label}>Start Date</Text>
                                    <TouchableOpacity style={styles.dateBtn} onPress={() => setStartPickerVisible(true)}>
                                        <Icon name="calendar" size={14} color="#915200" />
                                        <Text style={styles.dateText}>{formatIndianDate(startDate)}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.dateCol}>
                                    <Text style={styles.label}>End Date</Text>
                                    <TouchableOpacity style={styles.dateBtn} onPress={() => setEndPickerVisible(true)}>
                                        <Icon name="calendar" size={14} color="#915200" />
                                        <Text style={styles.dateText}>{formatIndianDate(endDate)}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Search Button */}
                        <TouchableOpacity style={styles.searchBtn} onPress={fetchReport} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Icon name="search" size={16} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.searchBtnText}>Search</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Results List */}
            <View style={styles.resultsContainer}>
                <View style={styles.resultsHeader}>
                    <Text style={styles.resultsTitle}>Results ({payments.length})</Text>
                    {payments.length > 0 && (
                        <TouchableOpacity
                            style={styles.exportBtn}
                            onPress={exportToPDF}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Icon name="file-pdf" size={14} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.exportBtnText}>Export PDF</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Summary Section (Received vs Settled) */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIconContainer}>
                            <Icon name="arrow-down" size={12} color="#27ae60" />
                        </View>
                        <View>
                            <Text style={styles.summaryLabel}>Total Received</Text>
                            <Text style={[styles.summaryValue, { color: '#27ae60' }]}>₹{totalReceived}</Text>
                        </View>
                    </View>
                    <View style={styles.summaryCard}>
                        <View style={[styles.summaryIconContainer, { backgroundColor: '#fdf2f2' }]}>
                            <Icon name="hand-holding-usd" size={12} color="#e74c3c" />
                        </View>
                        <View>
                            <Text style={styles.summaryLabel}>Total Settled</Text>
                            <Text style={[styles.summaryValue, { color: '#e74c3c' }]}>₹{totalSettled}</Text>
                        </View>
                    </View>
                </View>

                <FlatList
                    data={loading ? [] : payments}
                    keyExtractor={(item) => item._id || Math.random().toString()}
                    renderItem={renderPaymentItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        loading ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#D4AF37" />
                                <Text style={{ marginTop: 10, color: '#666' }}>Fetching reports...</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Icon name="folder-open" size={40} color="#fff" style={{ marginBottom: 10 }} />
                                <Text style={styles.emptyStateText}>No payments found for the selected criteria.</Text>
                            </View>
                        )
                    }
                />
            </View>

            {/* Plan Selection Modal */}
            <Modal visible={showPlanDropdown} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPlanDropdown(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Plan</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            <TouchableOpacity
                                style={[styles.modalItem, selectedPlanId === 'all' && styles.modalItemSelected]}
                                onPress={() => { setSelectedPlanId('all'); setShowPlanDropdown(false); }}
                            >
                                <Text style={[styles.modalItemText, selectedPlanId === 'all' && styles.modalItemTextSelected]}>All Plans</Text>
                            </TouchableOpacity>
                            {plans.map(plan => (
                                <TouchableOpacity
                                    key={plan._id}
                                    style={[styles.modalItem, selectedPlanId === plan._id && styles.modalItemSelected]}
                                    onPress={() => { setSelectedPlanId(plan._id); setShowPlanDropdown(false); }}
                                >
                                    <Text style={[styles.modalItemText, selectedPlanId === plan._id && styles.modalItemTextSelected]}>{plan.planName}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Date Pickers */}
            <DateTimePickerModal
                isVisible={isStartPickerVisible}
                mode="date"
                onConfirm={(date) => { setStartDate(date); setStartPickerVisible(false); }}
                onCancel={() => setStartPickerVisible(false)}
            />
            <DateTimePickerModal
                isVisible={isEndPickerVisible}
                mode="date"
                onConfirm={(date) => { setEndDate(date); setEndPickerVisible(false); }}
                onCancel={() => setEndPickerVisible(false)}
            />

            {/* Custom Alert Modal */}
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
        backgroundColor: 'transparent',
    },
    header: {
        padding: 20,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    filtersContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    filtersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    filtersHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filtersHeaderTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 8,
    },
    filtersHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-end',
    },
    filtersSummaryText: {
        fontSize: 12,
        color: '#f0f0f0',
        marginRight: 4,
        maxWidth: '70%',
    },
    filtersExpandedContent: {
        marginTop: 12,
    },
    label: {
        fontSize: 13,
        color: '#f0f0f0',
        marginBottom: 4,
        fontWeight: '500',
    },
    scopeBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fafafa',
        marginHorizontal: 2,
        borderRadius: 8,
    },
    scopeBtnActive: {
        backgroundColor: COLORS?.primary || '#915200',
        borderColor: COLORS?.primary || '#915200',
    },
    scopeBtnText: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
    },
    scopeBtnTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    dropdownBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 12,
        backgroundColor: '#fafafa',
    },
    dropdownText: {
        fontSize: 14,
        color: '#333',
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    dateCol: {
        flex: 0.48,
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fafafa',
    },
    dateText: {
        fontSize: 13,
        color: '#333',
        marginLeft: 8,
    },
    searchBtn: {
        flexDirection: 'row',
        backgroundColor: COLORS?.primary || '#915200',
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    resultsContainer: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingHorizontal: 20,
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        marginBottom: 10,
    },
    resultsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e74c3c', // PDF Red
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    exportBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    paymentCard: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f8f8',
        paddingBottom: 8,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    amountText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    typeText: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    cardBody: {
        gap: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 13,
        color: '#555',
        marginLeft: 6,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
    },
    emptyStateText: {
        fontSize: 15,
        color: '#fff',
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
        borderRadius: 12,
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalItem: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalItemSelected: {
        backgroundColor: '#fffbf0',
    },
    modalItemText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    modalItemTextSelected: {
        color: '#915200',
        fontWeight: 'bold',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 12,
        padding: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    summaryIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#eafaf1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MerchantReports;
