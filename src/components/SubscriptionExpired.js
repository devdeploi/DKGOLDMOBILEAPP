/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { COLORS } from '../styles/theme';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import { APIURL } from '../constants/api';
import CustomAlert from './CustomAlert';

const SubscriptionExpired = ({ user, onRenew, existingPlanCount, plans, onRefreshPlans }) => {
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [deletingPlanId, setDeletingPlanId] = useState(null);

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

    // Calculate Expiry Details
    const expiryDate = user.subscriptionExpiryDate ? new Date(user.subscriptionExpiryDate) : new Date();
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExpired = diffDays <= 0;

    // Downgrade Management
    const basicLimit = 3;
    const standardLimit = 6;

    const isBasicRestricted = existingPlanCount > basicLimit;
    const isStandardRestricted = existingPlanCount > standardLimit;

    const handleRenew = async () => {
        if (!selectedPlan) return;

        let restricted = false;
        let limit = 0;

        if (selectedPlan === 'Basic' && isBasicRestricted) {
            restricted = true;
            limit = basicLimit;
        } else if (selectedPlan === 'Standard' && isStandardRestricted) {
            restricted = true;
            limit = standardLimit;
        }

        if (restricted) {
            setAlertConfig({
                visible: true,
                title: "Limit Exceeded",
                message: `Please delete ${existingPlanCount - limit} plan(s) below to proceed with ${selectedPlan} Plan.`,
                type: 'warning'
            });
            return;
        }

        setAlertConfig({
            visible: true,
            title: "Contact Support",
            message: "Please contact support to renew your subscription manually.",
            type: 'info'
        });
    };

    if (showSuccess) {
        return (
            <View style={styles.centerContainer}>
                <View style={[styles.iconCircle, { backgroundColor: '#d1fae5' }]}>
                    <Icon name="check-circle" size={50} color={COLORS?.success} />
                </View>
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successText}>Your {selectedPlan} plan has been renewed.</Text>
                <ActivityIndicator size="small" color={COLORS?.primary} style={{ marginTop: 20 }} />
                <Text style={styles.redirectText}>Redirecting...</Text>
            </View>
        );
    }

    // Helper to get price display
    const getPrice = (plan) => {
        let basePrice = 0;
        if (plan === 'Basic') basePrice = 1500; // Base Price
        else if (plan === 'Standard') basePrice = 2500; // Base Price
        else if (plan === 'Premium') basePrice = 3500; // Base Price

        if (billingCycle === 'yearly') {
            return `₹${(basePrice * 10).toLocaleString()}`;
        }
        return `₹${basePrice.toLocaleString()}`;
    };

    const getPeriod = () => billingCycle === 'yearly' ? '/yr (+ 18% GST)' : '/mo (+ 18% GST)';

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerCard}>
                    <Text style={styles.headerTitle}>
                        {isExpired ? 'Subscription Expired' : 'Renew Subscription'}
                    </Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusLabel}>STATUS</Text>
                        <Text style={styles.statusValue}>
                            {isExpired
                                ? `Expired on ${expiryDate.toLocaleDateString()}`
                                : `${diffDays} Days Remaining`
                            }
                        </Text>
                    </View>
                </View>

                {/* Billing Cycle Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, billingCycle === 'monthly' && styles.toggleButtonActive]}
                        onPress={() => setBillingCycle('monthly')}
                    >
                        <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>Monthly</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, billingCycle === 'yearly' && styles.toggleButtonActive]}
                        onPress={() => setBillingCycle('yearly')}
                    >
                        <Text style={[styles.toggleText, billingCycle === 'yearly' && styles.toggleTextActive]}>
                            Yearly <Text style={{ fontSize: 10 }}>(Save 17%)</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.usageText}>
                    You have used <Text style={{ fontWeight: 'bold', color: COLORS?.primary }}>{existingPlanCount}</Text> of your chit slots.
                </Text>

                <View style={styles.plansContainer}>

                    {/* Basic Plan */}
                    <TouchableOpacity
                        style={[
                            styles.planCard,
                            selectedPlan === 'Basic' && styles.selectedPlanCard
                        ]}
                        onPress={() => setSelectedPlan('Basic')}
                    >
                        <View style={styles.planHeader}>
                            <Text style={styles.planName}>Basic</Text>
                            <Text style={styles.planPrice}>{getPrice('Basic')}<Text style={styles.planPeriod}>{getPeriod()}</Text></Text>
                        </View>
                        <View style={styles.featureList}>
                            <View style={styles.featureItem}><Icon name="check" size={12} color={COLORS?.success} /><Text style={styles.featureText}>3 Chits Only</Text></View>
                            <View style={styles.featureItem}><Icon name="check" size={12} color={COLORS?.success} /><Text style={styles.featureText}>Normal Dashboard</Text></View>
                            <View style={styles.featureItem}><Icon name="times" size={12} color={COLORS?.danger} /><Text style={styles.featureText}>No Shop Images</Text></View>
                        </View>
                        {isBasicRestricted && (
                            <View style={styles.warningContainer}>
                                <Icon name="exclamation-triangle" size={12} color={COLORS?.warning} />
                                <Text style={styles.warningText}>Limit Exceeded: Delete {existingPlanCount - basicLimit} plans</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Standard Plan */}
                    <TouchableOpacity
                        style={[
                            styles.planCard,
                            selectedPlan === 'Standard' && styles.selectedPlanCard
                        ]}
                        onPress={() => setSelectedPlan('Standard')}
                    >
                        <View style={styles.planHeader}>

                            <Text style={styles.planName}>Standard</Text>
                            <Text style={styles.planPrice}>{getPrice('Standard')}<Text style={styles.planPeriod}>{getPeriod()}</Text></Text>
                        </View>
                        <View style={styles.featureList}>
                            <View style={styles.featureItem}><Icon name="check" size={12} color={COLORS?.success} /><Text style={styles.featureText}>Up to 6 Chits</Text></View>
                            <View style={styles.featureItem}><Icon name="check" size={12} color={COLORS?.success} /><Text style={styles.featureText}>Advanced Dashboard</Text></View>
                            <View style={styles.featureItem}><Icon name="check" size={12} color={COLORS?.success} /><Text style={styles.featureText}>Unlimited Shop Images</Text></View>
                        </View>
                        {isStandardRestricted && (
                            <View style={styles.warningContainer}>
                                <Icon name="exclamation-triangle" size={12} color={COLORS?.warning} />
                                <Text style={styles.warningText}>Limit Exceeded: Delete {existingPlanCount - standardLimit} plans</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Premium Plan */}
                    <TouchableOpacity
                        style={[
                            styles.planCard,
                            selectedPlan === 'Premium' && styles.selectedPlanCard
                        ]}
                        onPress={() => setSelectedPlan('Premium')}
                    >
                        <View style={[styles.planHeader, { borderBottomColor: '#f1f1f1' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                <Text style={styles.planName}>Premium</Text>
                                <View style={styles.recommendBadge}><Text style={styles.recommendText}>Best</Text></View>
                            </View>
                            <Text style={[styles.planPrice, { color: COLORS?.warning }]}>{getPrice('Premium')}<Text style={styles.planPeriod}>{getPeriod()}</Text></Text>
                        </View>
                        <View style={styles.featureList}>
                            <View style={styles.featureItem}><Icon name="check" size={12} color={COLORS?.success} /><Text style={styles.featureText}>iOS App Access</Text></View>
                            <View style={styles.featureItem}><Icon name="check" size={12} color={COLORS?.success} /><Text style={styles.featureText}>9 Chit Plan</Text></View>
                            <View style={styles.featureItem}><Icon name="check" size={12} color={COLORS?.success} /><Text style={styles.featureText}>Custom Ads</Text></View>
                            <View style={styles.featureItem}><Icon name="check" size={12} color={COLORS?.success} /><Text style={styles.featureText}>Priority Support</Text></View>
                        </View>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.renewButton, (!selectedPlan || loading) && styles.renewButtonDisabled]}
                    onPress={handleRenew}
                    disabled={!selectedPlan || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.renewButtonText}>Contact Support</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={hideAlert}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 50,
        backgroundColor: '#f8f9fa',
        flexGrow: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
    },
    headerCard: {
        backgroundColor: COLORS?.primary,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
    },
    statusBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
        alignItems: 'center',
    },
    statusLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 2,
    },
    statusValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Toggle Styles
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#e9ecef',
        borderRadius: 25,
        padding: 4,
        marginBottom: 20,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 20,
    },
    toggleButtonActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.secondary,
    },
    toggleTextActive: {
        color: COLORS?.primary,
    },
    usageText: {
        textAlign: 'center',
        color: COLORS?.secondary,
        marginBottom: 20,
        fontSize: 14,
    },
    plansContainer: {
        gap: 15,
        marginBottom: 30,
    },
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    selectedPlanCard: {
        borderColor: COLORS?.primary,
        backgroundColor: '#fffcf5', // Very light orange/cream
    },
    planHeader: {
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 15,
        marginBottom: 15,
    },
    planName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    planPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS?.primary,
        marginTop: 5,
    },
    planPeriod: {
        fontSize: 14,
        color: COLORS?.secondary,
        fontWeight: 'normal',
    },
    featureList: {
        gap: 8,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureText: {
        marginLeft: 10,
        color: COLORS?.secondary,
        fontSize: 14,
    },
    recommendBadge: {
        backgroundColor: COLORS?.warning,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    recommendText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3cd',
        padding: 8,
        borderRadius: 8,
        marginTop: 15,
    },
    warningText: {
        color: '#856404',
        fontSize: 12,
        marginLeft: 8,
        flex: 1,
    },
    renewButton: {
        backgroundColor: COLORS?.primary,
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    renewButtonDisabled: {
        backgroundColor: '#ccc',
        shadowOpacity: 0,
        elevation: 0,
    },
    renewButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Success View Styles
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS?.primary,
        marginBottom: 10,
    },
    successText: {
        color: COLORS?.secondary,
        fontSize: 16,
        textAlign: 'center',
    },
    redirectText: {
        marginTop: 10,
        color: COLORS?.secondary,
        fontSize: 12,
    },
    deletionList: {
        marginTop: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#eee',
    },
    deletionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginBottom: 10,
    },
    planItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    planItemName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.textPrimary,
    },
    planItemDetails: {
        fontSize: 12,
        color: COLORS?.secondary,
    },
    deleteButton: {
        padding: 8,
    }
});

export default SubscriptionExpired;
