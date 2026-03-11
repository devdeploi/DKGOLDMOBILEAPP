/* eslint-disable react-native/no-inline-styles */
import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Modal,
    TextInput,
    RefreshControl,
    Switch,
    Animated
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../styles/theme';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Slider from '@react-native-community/slider';
import axios from 'axios';
import { APIURL } from '../constants/api';
import Toast from 'react-native-toast-message';
import CustomAlert from './CustomAlert';

const SkeletonPlanCard = () => {
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            })
        ).start();
    }, [animatedValue]);

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-300, 300],
    });

    return (
        <View style={styles.planCard}>
            <View style={styles.planHeader}>
                <View>
                    <View style={{ width: 140, height: 20, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
                        <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        </Animated.View>
                    </View>
                    <View style={{ width: 80, height: 16, backgroundColor: '#E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
                        <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        </Animated.View>
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ width: 70, height: 20, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 4, overflow: 'hidden' }}>
                        <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        </Animated.View>
                    </View>
                    <View style={{ width: 40, height: 12, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                        <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        </Animated.View>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.planDetails}>
                <View style={{ width: 70, height: 14, backgroundColor: '#E2E8F0', borderRadius: 4, marginRight: 15, overflow: 'hidden' }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                </View>
                <View style={{ width: 90, height: 14, backgroundColor: '#E2E8F0', borderRadius: 4, marginRight: 15, overflow: 'hidden' }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                </View>
                <View style={{ width: 50, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                </View>
            </View>

            <View style={styles.actionRow}>
                <View style={{ flex: 1, height: 32, backgroundColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                </View>
                <View style={{ flex: 2, height: 32, backgroundColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                </View>
                <View style={{ flex: 0.8, height: 32, backgroundColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
                        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                </View>
            </View>
        </View>
    );
};

const MerchantPlans = ({ user, loadingPlans, plans, onPlanCreated, onRefresh }) => {
    // ── Debug: log props on every render ──────────────────────────────────────
    console.log('[MerchantPlans] render → loadingPlans:', loadingPlans,
        '| plans type:', typeof plans,
        '| plans value:', plans,
        '| plans length:', plans?.length,
        '| user:', user?._id || user?.id);
    // ─────────────────────────────────────────────────────────────────────────

    // Pagination State
    const BATCH_SIZE = 5;
    const [displayedPlans, setDisplayedPlans] = useState([]);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        console.log('[MerchantPlans] useEffect plans changed →', plans);
        if (plans && Array.isArray(plans)) {
            console.log('[MerchantPlans] setting displayedPlans, count:', Math.min(plans.length, BATCH_SIZE));
            setDisplayedPlans(plans.slice(0, BATCH_SIZE));
        } else {
            console.warn('[MerchantPlans] plans is not an array or null in useEffect!', plans);
            setDisplayedPlans([]);
        }
    }, [plans]);

    const handleLoadMore = () => {
        // Guard: plans may be null
        if (!plans || !Array.isArray(plans)) { console.warn('[MerchantPlans] handleLoadMore: plans is not an array'); return; }
        if (loadingMore || displayedPlans.length >= plans.length) return;
        console.log('[MerchantPlans] loading more plans, current:', displayedPlans.length, '/', plans.length);
        setLoadingMore(true);
        setTimeout(() => {
            setDisplayedPlans(prev => {
                if (!plans || !Array.isArray(plans)) return prev;
                return [
                    ...prev,
                    ...plans.slice(prev.length, prev.length + BATCH_SIZE)
                ];
            });
            setLoadingMore(false);
        }, 1500);
    };

    // Create/Edit Plan State
    const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [newPlan, setNewPlan] = useState({ name: '', amount: '', duration: 11, description: '', returnType: 'Cash', isUnlimited: false });
    const [creatingPlan, setCreatingPlan] = useState(false);

    // View Details State
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

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

    // Derived State
    // Simplified Logic: No KYC or Plan Limits
    const canCreatePlan = true;
    const planLimit = Infinity;



    const handleCreateOrUpdatePlan = async () => {
        if (!newPlan.name || !newPlan.amount || !newPlan.duration) {
            setAlertConfig({
                visible: true,
                title: 'Validation Error',
                message: 'Please fill all required fields',
                type: 'error',
                buttons: [{ text: 'OK', onPress: hideAlert }]
            });
            return;
        }

        const totalAmount = parseFloat(newPlan.amount);
        const duration = parseInt(newPlan.duration, 10);
        const monthlyAmount = parseFloat((totalAmount / duration).toFixed(2));

        console.log('[MerchantPlans] handleCreateOrUpdatePlan →', { totalAmount, duration, monthlyAmount, isEditing });

        setCreatingPlan(true);
        try {
            const token = user.token;
            console.log('[MerchantPlans] token exists:', !!token);
            const payload = {
                planName: newPlan.name,
                totalAmount: totalAmount,
                monthlyAmount: monthlyAmount,
                durationMonths: newPlan.isUnlimited ? 0 : duration,
                description: newPlan.description,
                returnType: newPlan.isUnlimited ? 'Gold' : newPlan.returnType,
                type: newPlan.isUnlimited ? 'unlimited' : 'fixed',
                merchant: user._id || user.id
            };

            if (isEditing) {
                await axios.put(`${APIURL}/chit-plans/${editingPlanId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAlertConfig({
                    visible: true,
                    title: 'Success',
                    message: 'Plan updated successfully',
                    type: 'success',
                    buttons: [{ text: 'OK', onPress: hideAlert }]
                });
            } else {
                await axios.post(`${APIURL}/chit-plans`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAlertConfig({
                    visible: true,
                    title: 'Success',
                    message: 'Plan created successfully',
                    type: 'success',
                    buttons: [{ text: 'OK', onPress: hideAlert }]
                });
            }

            setShowCreatePlanModal(false);
            resetForm();
            if (onPlanCreated) {
                onPlanCreated();
            }
        } catch (error) {
            console.error(error);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: isEditing ? 'Failed to update plan' : 'Failed to create plan',
                type: 'error',
                buttons: [{ text: 'OK', onPress: hideAlert }]
            });
        } finally {
            setCreatingPlan(false);
        }
    };

    const resetForm = () => {
        setNewPlan({ name: '', amount: '', duration: 11, description: '', returnType: 'Cash', isUnlimited: false });
        setIsEditing(false);
        setEditingPlanId(null);
    };

    const openEditModal = (plan) => {
        console.log('[MerchantPlans] openEditModal → plan:', JSON.stringify(plan));
        console.log('[MerchantPlans] plan.totalAmount:', plan.totalAmount, typeof plan.totalAmount);
        console.log('[MerchantPlans] plan.durationMonths:', plan.durationMonths, typeof plan.durationMonths);
        setNewPlan({
            name: plan.planName,
            amount: (plan.totalAmount ?? '').toString(),
            duration: plan.durationMonths ?? 11,
            description: plan.description || '',
            returnType: plan.returnType || 'Cash',
            isUnlimited: plan.type === 'unlimited'
        });
        setIsEditing(true);
        setEditingPlanId(plan._id);
        setShowCreatePlanModal(true);
    };

    const openDetails = (plan) => {
        setSelectedPlan(plan);
        setShowDetailsModal(true);
    };



    const handleDeletePlan = (planId) => {
        setAlertConfig({
            visible: true,
            title: 'Delete Plan',
            message: 'Are you sure you want to delete this plan? This action cannot be undone.',
            type: 'warning',
            buttons: [
                { text: 'Cancel', style: 'cancel', onPress: () => { } },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => confirmDelete(planId)
                }
            ]
        });
    };

    const confirmDelete = async (planId) => {
        try {
            const token = user.token;
            await axios.delete(`${APIURL}/chit-plans/${planId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAlertConfig({
                visible: true,
                title: 'Success',
                message: 'Plan deleted successfully',
                type: 'success',
                buttons: [{ text: 'OK', onPress: hideAlert }]
            });
            if (onRefresh) {
                onRefresh();
            }
        } catch (error) {
            console.error(error);
            setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Failed to delete plan. Ensure it has no active subscriptions.',
                type: 'error',
                buttons: [{ text: 'OK', onPress: hideAlert }]
            });
        }
    };



    const isFormValid = newPlan.name.length > 0 && newPlan.amount.length > 0 && parseFloat(newPlan.amount) > 0;

    const showSkeletons = loadingPlans && displayedPlans.length === 0;

    return (
        <LinearGradient
            colors={['#c1ab8e', '#f2e07b', '#915200']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
            {showSkeletons ? (
                <View style={styles.contentContainer}>
                    <Text style={styles.sectionTitle}>My Chit Plans</Text>
                    {[1, 2, 3].map((item) => (
                        <SkeletonPlanCard key={item} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={displayedPlans}
                    keyExtractor={(item, index) => item?._id?.toString() || index.toString()} contentContainerStyle={styles.contentContainer}
                    refreshControl={
                        <RefreshControl refreshing={loadingPlans} onRefresh={onRefresh} tintColor={COLORS?.primary} />
                    }
                    extraData={plans}
                    ListHeaderComponent={() => {
                        console.log('[MerchantPlans] ListHeaderComponent → plans:', plans, 'length:', plans?.length);
                        return (
                            <>
                                <Text style={styles.sectionTitle}>My Chit Plans ({plans?.length ?? 0})</Text>
                            </>
                        );
                    }}
                    renderItem={({ item: plan, index }) => {
                        if (!plan) return null;
                        console.log('[MerchantPlans] renderItem index:', index, '→', JSON.stringify({
                            _id: plan._id,
                            planName: plan.planName,
                            totalAmount: plan.totalAmount,
                            monthlyAmount: plan.monthlyAmount,
                            durationMonths: plan.durationMonths,
                            returnType: plan.returnType,
                            type: plan.type,
                            subscribersCount: plan.subscribers?.length,
                        }));
                        return (
                            <View style={styles.planCard}>
                                <View style={styles.planHeader}>
                                    <View>
                                        <Text style={styles.planName}>{plan.planName || 'N/A'}</Text>
                                        <View style={styles.monthlyBadge}>
                                            <Text style={styles.monthlyBadgeText}>₹{plan.monthlyAmount || 0}/mo</Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.planAmount}>₹{plan.totalAmount || 0}</Text>
                                        <Text style={{ fontSize: 10, color: COLORS?.secondary }}>Total Value</Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.planDetails}>
                                    <View style={styles.detailItem}>
                                        <Icon name="calendar-alt" size={12} color={COLORS?.secondary} style={styles.iconStyle} />
                                        <Text style={styles.detailText}>{plan.durationMonths || 0} Months</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Icon name="users" size={12} color={COLORS?.secondary} style={styles.iconStyle} />
                                        <Text style={styles.detailText}>{plan.subscribers ? plan.subscribers.length : 0} Subscribers</Text>
                                    </View>
                                    <View style={[styles.detailItem, { marginLeft: 15 }]}>
                                        <View style={{
                                            backgroundColor: plan.returnType === 'Gold' ? '#FEFCBF' : '#C6F6D5',
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                            borderRadius: 4
                                        }}>
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: 'bold',
                                                color: plan.returnType === 'Gold' ? '#D69E2E' : '#38A169',
                                            }}>
                                                {plan.returnType || 'Cash'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.viewButton]}
                                        onPress={() => openDetails(plan)}
                                    >
                                        <Icon name="eye" size={12} color={COLORS?.primary} />
                                        <Text style={styles.viewButtonText}>View</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.editButton]}
                                        onPress={() => openEditModal(plan)}
                                    >
                                        <Icon name="edit" size={12} color="#fff" />
                                        <Text style={styles.editButtonText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.deleteButton]}
                                        onPress={() => handleDeletePlan(plan._id)}
                                    >
                                        <Icon name="trash" size={12} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyStateContainer}>
                            <Icon name="box-open" size={50} color={COLORS?.secondary} style={styles.emptyStateIcon} />
                            <Text style={styles.emptyStateText}>No plans found.</Text>
                            {canCreatePlan ? (
                                <Text style={styles.emptyStateSubtext}>Create your first plan now!</Text>
                            ) : null}
                        </View>
                    )}
                    ListFooterComponent={() => (
                        <View style={{ paddingBottom: 100 }}>
                            <TouchableOpacity
                                style={styles.addPlanButton}
                                onPress={() => {
                                    if (!user.upiId && !user.upiNumber) {
                                        setAlertConfig({
                                            visible: true,
                                            title: 'Action Required',
                                            message: 'Please add your UPI ID or UPI Number in your profile settings to create a chit plan.',
                                            type: 'warning',
                                            buttons: [{ text: 'OK', onPress: hideAlert }]
                                        });
                                        return;
                                    }
                                    resetForm();
                                    setShowCreatePlanModal(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Icon name="plus" size={16} color={COLORS?.primary} style={styles.planDetailIcon} />
                                <Text style={styles.addPlanText}>
                                    Create New Plan
                                </Text>
                            </TouchableOpacity>
                            {loadingMore && (
                                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color={COLORS?.primary} />
                                </View>
                            )}
                        </View>
                    )}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                />
            )}

            {/* Create/Edit Plan Modal */}
            <Modal visible={showCreatePlanModal} transparent animationType="slide" onRequestClose={() => setShowCreatePlanModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {creatingPlan ? (
                            <View style={{ alignItems: 'center', padding: 20, width: '100%' }}>
                                <ActivityIndicator size="large" color={COLORS?.primary} style={{ marginBottom: 20 }} />
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS?.primary, marginBottom: 8 }}>
                                    {isEditing ? 'Updating Chit Plan...' : 'Creating Chit Plan...'}
                                </Text>
                                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
                                    Please wait while we process your request.
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{isEditing ? 'Edit Plan' : 'Create New Plan'}</Text>
                                    <TouchableOpacity onPress={() => setShowCreatePlanModal(false)}>
                                        <Icon name="times" size={20} color={COLORS?.secondary} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.fullWidth} showsVerticalScrollIndicator={false}>
                                    <Text style={styles.label}>Plan Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Gold Saver"
                                        value={newPlan.name}
                                        onChangeText={(text) => setNewPlan({ ...newPlan, name: text })}
                                    />

                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, backgroundColor: '#f0f9ff', padding: 10, borderRadius: 8 }}>
                                        <Text style={{ fontWeight: 'bold', color: COLORS?.primary }}>Unlimited Savings Plan?</Text>
                                        <Switch
                                            value={newPlan.isUnlimited}
                                            onValueChange={(val) => setNewPlan({ ...newPlan, isUnlimited: val, returnType: val ? 'Gold' : newPlan.returnType })}
                                            trackColor={{ false: "#767577", true: COLORS?.primary }}
                                            thumbColor={newPlan.isUnlimited ? "#f4f3f4" : "#f4f3f4"}
                                        />
                                    </View>

                                    <Text style={styles.label}>{newPlan.isUnlimited ? 'Minimum Investment (₹)' : 'Total Amount (₹)'}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={newPlan.isUnlimited ? "100" : "5000"}
                                        keyboardType="numeric"
                                        value={newPlan.amount}
                                        onChangeText={(text) => setNewPlan({ ...newPlan, amount: text })}
                                    />

                                    {!newPlan.isUnlimited && (
                                        <>
                                            <Text style={styles.label}>Duration: {newPlan.duration} Months</Text>
                                            <View style={styles.sliderContainer}>
                                                <Slider
                                                    style={{ width: '100%', height: 40 }}
                                                    minimumValue={3}
                                                    maximumValue={60}
                                                    step={1}
                                                    value={newPlan.duration}
                                                    onValueChange={(val) => setNewPlan({ ...newPlan, duration: val })}
                                                    minimumTrackTintColor={COLORS?.primary}
                                                    maximumTrackTintColor="#d3d3d3"
                                                    thumbTintColor={COLORS?.primary}
                                                />
                                                <View style={styles.sliderLabels}>
                                                    <Text style={styles.sliderLabelText}>3m</Text>
                                                    <Text style={styles.sliderLabelText}>60m</Text>
                                                </View>
                                            </View>
                                        </>
                                    )}

                                    {newPlan.amount && !newPlan.isUnlimited ? (
                                        <View style={styles.calculatedInfo}>
                                            <Text style={styles.calculatedLabel}>Monthly Installment:</Text>
                                            <Text style={styles.calculatedValue}>
                                                ₹{Math.ceil(parseFloat(newPlan.amount) / newPlan.duration) || 0}
                                            </Text>
                                        </View>
                                    ) : null}

                                    <Text style={styles.label}>Return Type</Text>
                                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                                        {['Cash', 'Gold'].map((type) => (
                                            <TouchableOpacity
                                                key={type}
                                                disabled={newPlan.isUnlimited}
                                                onPress={() => setNewPlan({ ...newPlan, returnType: type })}
                                                style={{
                                                    flex: 1,
                                                    padding: 12,
                                                    borderRadius: 8,
                                                    borderWidth: 1,
                                                    borderColor: newPlan.returnType === type ? COLORS?.primary : '#e9ecef',
                                                    backgroundColor: newPlan.returnType === type ? COLORS?.glass : '#f8f9fa',
                                                    alignItems: 'center',
                                                    opacity: newPlan.isUnlimited && type !== 'Gold' ? 0.5 : 1
                                                }}
                                            >
                                                <Text style={{
                                                    color: newPlan.returnType === type ? COLORS?.primary : '#666',
                                                    fontWeight: '600'
                                                }}>
                                                    {type}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.label}>Description</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Plan benefits..."
                                        multiline
                                        numberOfLines={3}
                                        value={newPlan.description}
                                        onChangeText={(text) => setNewPlan({ ...newPlan, description: text })}
                                    />

                                    <TouchableOpacity
                                        style={[styles.saveButton, { marginTop: 10 }, !isFormValid && styles.disabledButton]}
                                        onPress={handleCreateOrUpdatePlan}
                                        disabled={!isFormValid}
                                    >
                                        <Text style={styles.saveButtonText}>{isEditing ? 'Update Plan' : 'Create Plan'}</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* View Details Modal */}
            <Modal visible={showDetailsModal} transparent animationType="fade" onRequestClose={() => setShowDetailsModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Plan Details</Text>
                            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                                <Icon name="times" size={20} color={COLORS?.secondary} />
                            </TouchableOpacity>
                        </View>

                        {selectedPlan && (
                            <View style={styles.fullWidth}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Plan Name:</Text>
                                    <Text style={styles.detailValue}>{selectedPlan.planName}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Total Amount:</Text>
                                    <Text style={styles.detailValue}>₹{selectedPlan.totalAmount}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Duration:</Text>
                                    <Text style={styles.detailValue}>{selectedPlan.durationMonths} Months</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Monthly Installment:</Text>
                                    <Text style={styles.detailValue}>₹{selectedPlan.monthlyAmount}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Subscribers:</Text>
                                    <Text style={styles.detailValue}>{selectedPlan.subscribers?.length || 0}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Return Type:</Text>
                                    <Text style={[styles.detailValue, { fontWeight: 'bold', color: selectedPlan.returnType === 'Gold' ? '#D69E2E' : '#38A169' }]}>
                                        {selectedPlan.returnType || 'Cash'}
                                    </Text>
                                </View>

                                <Text style={[styles.detailLabel, { marginTop: 15, marginBottom: 5 }]}>Description:</Text>
                                <View style={styles.descriptionBox}>
                                    <Text style={styles.descriptionText}>{selectedPlan.description || 'No description provided.'}</Text>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity style={[styles.saveButton, { marginTop: 20, backgroundColor: COLORS?.secondary }]} onPress={() => setShowDetailsModal(false)}>
                            <Text style={styles.saveButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Toast />
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
    contentContainer: {
        padding: 20,
        flexGrow: 1
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    warningBanner: {
        flexDirection: 'row',
        backgroundColor: '#FEEBC8',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        alignItems: 'center'
    },
    warningText: {
        color: '#C05621',
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '600'
    },
    planCard: {
        backgroundColor: COLORS?.glass,
        borderRadius: 16,
        padding: 16,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
        borderWidth: 1,
        borderColor: COLORS?.glassBorder
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
        color: '#1a202c',
        marginBottom: 4
    },
    monthlyBadge: {
        backgroundColor: 'rgba(145, 82, 0, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        alignSelf: 'flex-start'
    },
    monthlyBadgeText: {
        fontSize: 12,
        color: COLORS?.primary,
        fontWeight: '600'
    },
    planAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS?.primary,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginBottom: 12
    },
    planDetails: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15
    },
    iconStyle: {
        marginRight: 6
    },
    detailText: {
        fontSize: 13,
        color: '#718096',
        fontWeight: '500'
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    viewButton: {
        borderColor: COLORS?.primary,
        backgroundColor: COLORS?.glass
    },
    viewButtonText: {
        color: COLORS?.primary,
        fontWeight: '600',
        fontSize: 13,
        marginLeft: 6
    },
    editButton: {
        backgroundColor: COLORS?.primary,
        borderColor: COLORS?.primary,
        flex: 2
    },
    editButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
        marginLeft: 6
    },
    deleteButton: {
        backgroundColor: COLORS?.danger,
        borderColor: COLORS?.danger,
        flex: 0.8
    },
    addPlanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: COLORS?.glass,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS?.primary,
        marginBottom: 20
    },
    disabledButton: {
        borderColor: '#ccc',
        backgroundColor: '#f9f9f9',
        opacity: 0.7
    },
    addPlanText: {
        color: COLORS?.primary,
        fontWeight: 'bold',
        marginLeft: 8
    },
    paginationControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    pageInfo: {
        marginHorizontal: 15,
        color: '#666',
        fontWeight: '600'
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40
    },
    emptyStateIcon: {
        opacity: 0.3,
        marginBottom: 15
    },
    emptyStateText: {
        textAlign: 'center',
        color: '#4a5568',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5
    },
    emptyStateSubtext: {
        color: '#718096',
        fontSize: 14
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 15,
        alignItems: 'center'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    fullWidth: {
        width: '100%'
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
        fontWeight: '600',
        marginTop: 10
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        width: '100%'
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top'
    },
    saveButton: {
        backgroundColor: COLORS?.primary,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%'
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    sliderContainer: {
        marginBottom: 15,
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e9ecef'
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5
    },
    sliderLabelText: {
        fontSize: 10,
        color: '#999'
    },
    calculatedInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(145, 82, 0, 0.1)',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10
    },
    calculatedLabel: {
        fontSize: 14,
        color: COLORS?.primary,
        fontWeight: '600'
    },
    calculatedValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS?.primary
    },
    // Detail Modal Styles
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    detailLabel: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14
    },
    detailValue: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 14
    },
    descriptionBox: {
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 8,
        height: 80
    },
    descriptionText: {
        color: '#333',
        fontSize: 14
    },
    bottomFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 20
    }
});

export default MerchantPlans;
