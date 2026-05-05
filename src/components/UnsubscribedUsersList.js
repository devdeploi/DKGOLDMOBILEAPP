import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Modal,
    ScrollView,
    RefreshControl,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import { APIURL } from '../constants/api';
import CustomAlert from './CustomAlert';
import { useGoldRate } from '../context/GoldRateContext';

const UnsubscribedUsersList = ({ user }) => {
    const { goldRate } = useGoldRate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [plans, setPlans] = useState([]);

    // Subscription Modal
    const [subscribeForm, setSubscribeForm] = useState({
        planId: '',
        amount: '',
        note: '',
        customGoldRate: '',
        name: '',
        email: '',
        address: ''
    });

    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const selectedPlan = plans.find(p => p._id === subscribeForm.planId);
    const isUnlimited = selectedPlan?.type === 'unlimited';
    const effectiveGoldRate = Number(subscribeForm.customGoldRate) || goldRate;
    const calculatedWeight = (isUnlimited && subscribeForm.amount && effectiveGoldRate > 0) 
        ? (Number(subscribeForm.amount) / effectiveGoldRate).toFixed(3) 
        : '0.000';

    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

    const fetchUsers = useCallback(async (pageNum = 1, isRefreshing = false) => {
        if (!user.token) return;
        try {
            if (!isRefreshing && pageNum === 1) setLoading(true);
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${APIURL}/chit-plans/unsubscribed-users?page=${pageNum}&search=${searchQuery}`, config);
            
            if (pageNum === 1) {
                setUsers(data.users);
            } else {
                setUsers(prev => [...prev, ...data.users]);
            }
            setTotalPages(data.pages);
        } catch (error) {
            console.error("Error fetching unsubscribed users", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user.token, searchQuery]);

    const fetchPlans = useCallback(async () => {
        try {
            const id = user._id || user.id;
            const { data } = await axios.get(`${APIURL}/chit-plans/merchant/${id}?limit=100`);
            setPlans(data.plans || []);
        } catch (error) {
            console.error("Error fetching plans", error);
        }
    }, [user]);

    useEffect(() => {
        fetchUsers(1);
        fetchPlans();
    }, [fetchUsers, fetchPlans]);

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        fetchUsers(1, true);
    };

    const loadMore = () => {
        if (page < totalPages) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchUsers(nextPage);
        }
    };

    const handleOpenSubscribe = (u) => {
        setSelectedUser(u);
        setSubscribeForm({
            planId: plans.length > 0 ? plans[0]._id : '',
            amount: '',
            note: '',
            customGoldRate: (goldRate || 0).toFixed(2),
            name: u.name,
            email: u.email || '',
            address: u.address || ''
        });
        setShowSubscribeModal(true);
    };

    const handleOpenUserModal = (u) => {
        setSelectedUser(u);
        setShowUserModal(true);
    };

    const handleSubscribe = async () => {
        if (!subscribeForm.planId) return;

        setSubmitting(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            
            const payload = {
                userId: selectedUser._id,
                planId: subscribeForm.planId,
                amount: isUnlimited ? subscribeForm.amount : selectedPlan.monthlyAmount,
                goldRate: effectiveGoldRate,
                note: subscribeForm.note,
                name: subscribeForm.name,
                email: subscribeForm.email,
                address: subscribeForm.address
            };

            await axios.post(`${APIURL}/chit-plans/${subscribeForm.planId}/merchant-subscribe`, payload, config);
            setShowSubscribeModal(false);
            setAlertConfig({
                visible: true,
                title: 'Success',
                message: 'Subscription created successfully!',
                type: 'success'
            });
            onRefresh(); // Refresh list
        } catch (error) {
            console.error("Error creating subscription", error);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Failed to create subscription',
                type: 'error'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const renderUserItem = ({ item }) => (
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.userDetails}>
                    <TouchableOpacity onPress={() => handleOpenUserModal(item)}>
                        <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                    <Text style={styles.userPhone}>{item.phone}</Text>
                    {item.address && <Text style={styles.userAddress} numberOfLines={1}>{item.address}</Text>}
                </View>
                <TouchableOpacity 
                    style={styles.assignBtn}
                    onPress={() => handleOpenSubscribe(item)}
                >
                    <LinearGradient
                        colors={['#ebdc87', '#e2d183']}
                        style={styles.assignGradient}
                    >
                        <Text style={styles.assignBtnText}>Assign Plan</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <Icon name="search" size={16} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or phone..."
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            setPage(1);
                        }}
                    />
                </View>
            </View>

            {loading && page === 1 ? (
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color="#915200" />
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUserItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContainer}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#915200']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon name="users-slash" size={50} color="#ccc" />
                            <Text style={styles.emptyText}>No unsubscribed users found</Text>
                        </View>
                    }
                />
            )}

            {/* Subscribe Modal */}
            <Modal visible={showSubscribeModal} transparent animationType="fade">
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Subscribe {selectedUser?.name}</Text>
                            <TouchableOpacity onPress={() => setShowSubscribeModal(false)}>
                                <Icon name="times" size={20} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>USER NAME (REQUIRED)</Text>
                                <TextInput
                                    style={[styles.input, subscribeForm.name.toLowerCase() === 'new user' && styles.inputError]}
                                    placeholder="Enter full name"
                                    value={subscribeForm.name}
                                    onChangeText={(text) => setSubscribeForm({...subscribeForm, name: text})}
                                />
                                {subscribeForm.name.toLowerCase() === 'new user' && (
                                    <Text style={styles.errorText}>Please change the name from "New User"</Text>
                                )}
                            </View>

                            <View style={{ flexDirection: 'row', gap: 15 }}>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>EMAIL ADDRESS</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Email (optional)"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={subscribeForm.email}
                                        onChangeText={(text) => setSubscribeForm({...subscribeForm, email: text})}
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>ADDRESS</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="City / Area"
                                        value={subscribeForm.address}
                                        onChangeText={(text) => setSubscribeForm({...subscribeForm, address: text})}
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>SELECT PLAN</Text>
                                <View style={styles.pickerContainer}>
                                    <ScrollView>
                                        {plans.map(p => (
                                            <TouchableOpacity 
                                                key={p._id}
                                                style={[
                                                    styles.planOption,
                                                    subscribeForm.planId === p._id && styles.selectedPlanOption
                                                ]}
                                                onPress={() => setSubscribeForm({...subscribeForm, planId: p._id, customGoldRate: (goldRate || 0).toFixed(2)})}
                                            >
                                                <Text style={[
                                                    styles.planOptionText,
                                                    subscribeForm.planId === p._id && styles.selectedPlanOptionText
                                                ]}>
                                                    {p.planName} ({p.type === 'unlimited' ? 'Unlimited' : `₹${p.monthlyAmount}/mo`})
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            {isUnlimited && (
                                <View style={{ flexDirection: 'row', gap: 15 }}>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>AMOUNT (₹)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Min ₹100"
                                            keyboardType="numeric"
                                            value={subscribeForm.amount}
                                            onChangeText={(text) => setSubscribeForm({...subscribeForm, amount: text})}
                                        />
                                    </View>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>GOLD RATE (₹/g)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Rate"
                                            keyboardType="numeric"
                                            value={subscribeForm.customGoldRate}
                                            onChangeText={(text) => setSubscribeForm({...subscribeForm, customGoldRate: text})}
                                        />
                                    </View>
                                </View>
                            )}

                            {isUnlimited && subscribeForm.amount && (
                                <View style={styles.goldRateInfo}>
                                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ alignItems: 'center', flex: 1 }}>
                                            <Text style={styles.goldRateLabel}>GOLD WEIGHT</Text>
                                            <Text style={styles.goldWeightValue}>{calculatedWeight}g</Text>
                                        </View>
                                        <View style={{ width: 1, height: 40, backgroundColor: '#ebdc87' }} />
                                        <View style={{ alignItems: 'center', flex: 1 }}>
                                            <Text style={styles.goldRateLabel}>LOCKED RATE</Text>
                                            <Text style={[styles.goldWeightValue, { fontSize: 18 }]}>₹{Number(effectiveGoldRate).toFixed(2)}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>NOTES (OPTIONAL)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Add any internal notes..."
                                    multiline
                                    numberOfLines={3}
                                    value={subscribeForm.note}
                                    onChangeText={(text) => setSubscribeForm({...subscribeForm, note: text})}
                                />
                            </View>

                            <View style={{ marginBottom: 15, alignItems: 'center' }}>
                                <Text style={styles.autoGenText}>Account Number (ACC_NO) will be auto-generated</Text>
                            </View>

                            <TouchableOpacity 
                                style={[
                                    styles.submitBtn, 
                                    (!subscribeForm.planId || 
                                     submitting || 
                                     !subscribeForm.name || 
                                     subscribeForm.name.toLowerCase() === 'new user' ||
                                     (isUnlimited && !subscribeForm.amount)) && styles.disabledBtn
                                ]}
                                onPress={handleSubscribe}
                                disabled={
                                    !subscribeForm.planId || 
                                    submitting || 
                                    !subscribeForm.name || 
                                    subscribeForm.name.toLowerCase() === 'new user' ||
                                    (isUnlimited && !subscribeForm.amount)
                                }
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Icon name="check-circle" size={16} color="#fff" style={{ marginRight: 10 }} />
                                        <Text style={styles.submitBtnText}>Create Subscription</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* User Details Modal */}
            <Modal visible={showUserModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>User Details</Text>
                            <TouchableOpacity onPress={() => setShowUserModal(false)}>
                                <Icon name="times" size={20} color="#999" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <View style={[styles.avatar, { width: 70, height: 70, borderRadius: 35, marginRight: 0, marginBottom: 10 }]}>
                                    <Text style={[styles.avatarText, { fontSize: 24 }]}>{selectedUser?.name?.charAt(0).toUpperCase()}</Text>
                                </View>
                                <Text style={[styles.userName, { fontSize: 20 }]}>{selectedUser?.name}</Text>
                                <Text style={styles.userPhone}>Registered User</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>PHONE</Text>
                                <Text style={styles.detailValue}>{selectedUser?.phone}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>EMAIL</Text>
                                <Text style={styles.detailValue}>{selectedUser?.email || 'Not Provided'}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>ADDRESS</Text>
                                <Text style={styles.detailValue}>{selectedUser?.address || 'Not Provided'}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>JOINED ON</Text>
                                <Text style={styles.detailValue}>{selectedUser ? new Date(selectedUser.createdAt).toLocaleDateString() : ''}</Text>
                            </View>

                            <TouchableOpacity 
                                style={[styles.submitBtn, { marginTop: 20 }]}
                                onPress={() => {
                                    setShowUserModal(false);
                                    handleOpenSubscribe(selectedUser);
                                }}
                            >
                                <Text style={styles.submitBtnText}>Assign Plan</Text>
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
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fffbf0',
    },
    header: {
        padding: 15,
        backgroundColor: '#fffbf0',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: 45,
        color: '#333',
    },
    listContainer: {
        padding: 15,
        paddingBottom: 100,
    },
    userCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ebdc87',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#915200',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    userPhone: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    userAddress: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    assignBtn: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    assignGradient: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    assignBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#915200',
    },
    centerLoader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        marginTop: 10,
        color: '#999',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        maxHeight: '85%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
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
        color: '#915200',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: '#333',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        maxHeight: 150,
    },
    planOption: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedPlanOption: {
        backgroundColor: '#ebdc87',
    },
    planOptionText: {
        fontSize: 14,
        color: '#333',
    },
    selectedPlanOptionText: {
        fontWeight: 'bold',
        color: '#915200',
    },
    goldRateInfo: {
        backgroundColor: '#fffbf0',
        borderWidth: 1,
        borderColor: '#ebdc87',
        borderStyle: 'dashed',
        borderRadius: 15,
        padding: 15,
        alignItems: 'center',
        marginBottom: 25,
    },
    goldRateLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    goldRateValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#915200',
    },
    goldWeightValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#915200',
    },
    autoGenText: {
        fontSize: 11,
        color: '#999',
        marginTop: 5,
    },
    submitBtn: {
        backgroundColor: '#915200',
        borderRadius: 25,
        flexDirection: 'row',
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    disabledBtn: {
        opacity: 0.6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    detailRow: {
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
        paddingBottom: 8,
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#999',
        marginBottom: 3,
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    inputError: {
        borderWidth: 1,
        borderColor: '#ff4d4d',
        backgroundColor: '#fff5f5',
    },
    errorText: {
        color: '#ff4d4d',
        fontSize: 10,
        marginTop: 4,
        marginLeft: 5,
    },
});

export default UnsubscribedUsersList;
