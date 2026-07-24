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
    Platform,
    ImageBackground,
    Linking
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import { APIURL } from '../constants/api';
import CustomAlert from './CustomAlert';
import { useGoldRate } from '../context/GoldRateContext';

const getTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) {
        const days = Math.floor(interval);
        if (days === 1) return "Yesterday";
        return days + " days ago";
    }
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return "Just now";
};

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
        paymentDate: new Date(),
        customGoldRate: '',
        name: '',
        email: '',
        address: ''
    });
    const [isRateEdited, setIsRateEdited] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const selectedPlan = plans.find(p => p._id === subscribeForm.planId);
    const isUnlimited = selectedPlan?.type === 'unlimited';
    const effectiveGoldRate = Number(subscribeForm.customGoldRate) || (isUnlimited ? (user.goldRate24k || goldRate) : goldRate);
    const calculatedWeight = (isUnlimited && subscribeForm.amount && effectiveGoldRate > 0)
        ? (Number(subscribeForm.amount) / effectiveGoldRate).toFixed(3)
        : '0.000';

    // acc_no preview state
    const [accNoPreview, setAccNoPreview] = useState(null); // { lastAccNo, nextAccNo }
    const [fetchingAccNo, setFetchingAccNo] = useState(false);

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

    // Fetch acc_no preview whenever a plan is selected and user has no acc_no
    useEffect(() => {
        const fetchAccNoPreview = async () => {
            if (!subscribeForm.planId || !selectedUser || selectedUser.acc_no) {
                setAccNoPreview(null);
                return;
            }
            try {
                setFetchingAccNo(true);
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const { data } = await axios.get(`${APIURL}/chit-plans/${subscribeForm.planId}/next-acc-no`, config);
                setAccNoPreview(data);
            } catch (e) {
                setAccNoPreview(null);
            } finally {
                setFetchingAccNo(false);
            }
        };
        fetchAccNoPreview();
    }, [subscribeForm.planId, selectedUser]);

    useEffect(() => {
        if (!isRateEdited || user?.isStaff) {
            const plan = plans.find(p => p._id === subscribeForm.planId);
            if (plan) {
                setSubscribeForm(prev => ({
                    ...prev,
                    customGoldRate: (plan.type === 'unlimited' ? (user.goldRate24k || goldRate || 0) : (goldRate || 0)).toFixed(2)
                }));
            }
        }
    }, [goldRate, user.goldRate24k, subscribeForm.planId, user?.isStaff]);

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
        setAccNoPreview(null); // Reset preview; will load via useEffect when planId is set
        setIsRateEdited(false);
        setSubscribeForm({
            planId: plans.length > 0 ? plans[0]._id : '',
            amount: '',
            paymentDate: new Date(),
            customGoldRate: (plans[0]?.type === 'unlimited' ? (user.goldRate24k || goldRate || 0) : (goldRate || 0)).toFixed(2),
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
                paymentDate: subscribeForm.paymentDate,
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

    const handleDeleteUser = (u) => {
        setAlertConfig({
            visible: true,
            title: 'Delete User?',
            message: `Are you sure you want to delete ${u.name}? This action cannot be undone.`,
            type: 'warning',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const config = { headers: { Authorization: `Bearer ${user.token}` } };
                            await axios.delete(`${APIURL}/users/${u._id}`, config);
                            setAlertConfig({
                                visible: true,
                                title: 'Deleted',
                                message: 'User has been removed successfully.',
                                type: 'success'
                            });
                            onRefresh();
                        } catch (error) {
                            console.error("Error deleting user", error);
                            setAlertConfig({
                                visible: true,
                                title: 'Error',
                                message: error.response?.data?.message || 'Failed to delete user',
                                type: 'error'
                            });
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        });
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
                    <View style={styles.userMetaRow}>
                        <Icon name="phone-alt" size={10} color="#999" />
                        <Text style={styles.userPhone}>{item.phone}</Text>
                    </View>
                    <View style={styles.userMetaRow}>
                        <Icon name="clock" size={10} color="#aaa" />
                        <Text style={styles.joinedText}>Joined {getTimeAgo(item.createdAt)}</Text>
                    </View>
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => Linking.openURL(`tel:${item.phone}`)}
                    >
                        <Icon name="phone-alt" size={12} color="#1890ff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteUser(item)}
                    >
                        <Icon name="trash-alt" size={12} color="#e74c3c" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.assignBtn}
                        onPress={() => handleOpenSubscribe(item)}
                    >
                        <View
                            style={styles.assignGradient}
                        >
                            <Icon name="user-plus" size={14} color="#915200" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
            {item.address && (
                <View style={styles.cardFooter}>
                    <Icon name="map-marker-alt" size={10} color="#ccc" />
                    <Text style={styles.userAddress} numberOfLines={1}>{item.address}</Text>
                </View>
            )}
        </View>
    );

    return (
        <ImageBackground source={require('../../public/assests/DKGOLDBG.png')} style={styles.container} resizeMode="cover">
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
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
                                    onChangeText={(text) => setSubscribeForm({ ...subscribeForm, name: text })}
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
                                        onChangeText={(text) => setSubscribeForm({ ...subscribeForm, email: text })}
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>ADDRESS</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="City / Area"
                                        value={subscribeForm.address}
                                        onChangeText={(text) => setSubscribeForm({ ...subscribeForm, address: text })}
                                    />
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>SELECT PLAN</Text>
                                <View style={styles.planCardGrid}>
                                    {plans.map(p => {
                                        const isSelected = subscribeForm.planId === p._id;
                                        const isUnlimitedPlan = p.type === 'unlimited';
                                        return (
                                            <TouchableOpacity
                                                key={p._id}
                                                style={[styles.planCard, isSelected && styles.planCardSelected]}
                                                onPress={() => setSubscribeForm({
                                                    ...subscribeForm,
                                                    planId: p._id,
                                                    customGoldRate: (p.type === 'unlimited' ? (user.goldRate24k || goldRate || 0) : (goldRate || 0)).toFixed(2)
                                                })}
                                                activeOpacity={0.75}
                                            >
                                                {/* Left accent bar */}
                                                <View style={[styles.planCardAccent, isSelected && styles.planCardAccentSelected]} />

                                                <View style={styles.planCardBody}>
                                                    {/* Top row: icon + badge */}
                                                    <View style={styles.planCardTop}>
                                                        <View style={[styles.planCardIcon, isSelected && styles.planCardIconSelected]}>
                                                            <Icon
                                                                name={isUnlimitedPlan ? 'infinity' : 'coins'}
                                                                size={13}
                                                                color={isSelected ? '#915200' : '#aaa'}
                                                            />
                                                        </View>
                                                        <View style={[styles.planAmountBadge, isSelected && styles.planAmountBadgeSelected]}>
                                                            <Text style={[styles.planAmountBadgeText, isSelected && styles.planAmountBadgeTextSelected]}>
                                                                {isUnlimitedPlan ? 'Flexible' : `₹${p.monthlyAmount}/mo`}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {/* Plan name */}
                                                    <Text style={[styles.planCardName, isSelected && styles.planCardNameSelected]} numberOfLines={1}>
                                                        {p.planName}
                                                    </Text>

                                                    {/* Bottom row: type label + radio */}
                                                    <View style={styles.planCardBottom}>
                                                        <Text style={[styles.planCardType, isSelected && styles.planCardTypeSelected]}>
                                                            {isUnlimitedPlan ? 'Unlimited Savings' : 'Fixed Plan'}
                                                        </Text>
                                                        <View style={[styles.planRadio, isSelected && styles.planRadioSelected]}>
                                                            {isSelected && <View style={styles.planRadioDot} />}
                                                        </View>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
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
                                            onChangeText={(text) => setSubscribeForm({ ...subscribeForm, amount: text })}
                                        />
                                    </View>
                                    <View style={[styles.formGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>GOLD RATE (₹/g)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Rate"
                                            keyboardType="numeric"
                                            value={subscribeForm.customGoldRate}
                                            editable={!user?.isStaff}
                                            onChangeText={(text) => {
                                                setIsRateEdited(true);
                                                setSubscribeForm({ ...subscribeForm, customGoldRate: text });
                                            }}
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
                                <Text style={styles.label}>ASSIGNMENT DATE</Text>
                                <TouchableOpacity
                                    style={styles.datePickerBtn}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Icon name="calendar-alt" size={16} color="#915200" style={{ marginRight: 10 }} />
                                    <Text style={styles.dateText}>
                                        {subscribeForm.paymentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <DateTimePickerModal
                                isVisible={showDatePicker}
                                mode="date"
                                date={subscribeForm.paymentDate}
                                onConfirm={(selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) {
                                        setSubscribeForm({ ...subscribeForm, paymentDate: selectedDate });
                                    }
                                }}
                                onCancel={() => {
                                    setShowDatePicker(false);
                                }}
                            />

                            <View style={{ marginBottom: 15, alignItems: 'center' }}>
                                {/* Live acc_no preview (only for users who have no acc_no) */}
                                {!selectedUser?.acc_no ? (
                                    <View style={{
                                        width: '100%',
                                        backgroundColor: '#FFFBEB',
                                        borderWidth: 1,
                                        borderColor: '#F59E0B',
                                        borderRadius: 14,
                                        padding: 14,
                                        flexDirection: 'row',
                                        alignItems: 'center'
                                    }}>
                                        <View style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 18,
                                            backgroundColor: '#FEF3C7',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 12
                                        }}>
                                            <Icon name="id-badge" size={15} color="#D97706" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 }}>ACCOUNT NUMBER PREVIEW</Text>
                                            {fetchingAccNo ? (
                                                <ActivityIndicator size="small" color="#D97706" />
                                            ) : accNoPreview ? (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                                    <View>
                                                        <Text style={{ fontSize: 10, color: '#B45309' }}>Last in this plan</Text>
                                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#78350F' }}>
                                                            {accNoPreview.lastAccNo ?? 'None yet'}
                                                        </Text>
                                                    </View>
                                                    <Icon name="arrow-right" size={10} color="#D97706" />
                                                    <View>
                                                        <Text style={{ fontSize: 10, color: '#B45309' }}>Will be assigned</Text>
                                                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#92400E' }}>
                                                            {accNoPreview.nextAccNo}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ) : (
                                                <Text style={{ fontSize: 12, color: '#B45309' }}>Select a plan to preview acc_no</Text>
                                            )}
                                        </View>
                                    </View>
                                ) : (
                                    <Text style={styles.autoGenText}>
                                        Acc No: <Text style={{ fontWeight: 'bold', color: '#915200' }}>{selectedUser?.acc_no}</Text>
                                    </Text>
                                )}
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
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
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
        padding: 15,
        backgroundColor: 'transparent',
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
        fontSize: 13,
        color: '#666',
        marginLeft: 6,
    },
    userMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
    joinedText: {
        fontSize: 11,
        color: '#aaa',
        marginLeft: 6,
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
    },
    userAddress: {
        fontSize: 11,
        color: '#999',
        marginLeft: 6,
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 10,
    },
    deleteBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    callBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e6f7ff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#91d5ff',
    },
    assignBtn: {
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 2,
        backgroundColor: '#ebdc87',
    },
    assignGradient: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    assignBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#915200',
        textTransform: 'uppercase',
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
    datePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#eee',
    },
    dateText: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    // ── Plan Card Grid ─────────────────────────────────────────
    planCardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    planCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#ebebeb',
        overflow: 'hidden',
        minWidth: '46%',
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
    },
    planCardSelected: {
        borderColor: '#915200',
        backgroundColor: '#fffcf5',
        shadowColor: '#915200',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    planCardAccent: {
        width: 4,
        backgroundColor: '#e8e8e8',
    },
    planCardAccentSelected: {
        backgroundColor: '#915200',
    },
    planCardBody: {
        flex: 1,
        padding: 11,
    },
    planCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    planCardIcon: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: '#f2f2f2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    planCardIconSelected: {
        backgroundColor: '#ebdc8730',
    },
    planAmountBadge: {
        backgroundColor: '#f2f2f2',
        borderRadius: 20,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    planAmountBadgeSelected: {
        backgroundColor: '#ebdc87',
    },
    planAmountBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#888',
        letterSpacing: 0.2,
    },
    planAmountBadgeTextSelected: {
        color: '#6b3c00',
    },
    planCardName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#333',
        marginBottom: 6,
    },
    planCardNameSelected: {
        color: '#915200',
    },
    planCardBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    planCardType: {
        fontSize: 10,
        color: '#bbb',
        fontWeight: '500',
    },
    planCardTypeSelected: {
        color: '#c4872a',
    },
    planRadio: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
    },
    planRadioSelected: {
        borderColor: '#915200',
    },
    planRadioDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#915200',
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
