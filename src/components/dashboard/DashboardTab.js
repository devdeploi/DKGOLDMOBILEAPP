/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl, Image, Linking, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../styles/theme';
import { LineChart, PieChart } from 'react-native-chart-kit'; // Ensure this is installed
import axios from 'axios';
import { APIURL, BASE_URL } from '../../constants/api';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Slider from '@react-native-community/slider';
import AdBanner from '../AdBanner';
import Calculator from '../Calculator';
import { useGoldRate } from '../../context/GoldRateContext';


const { width } = Dimensions.get('window');

const DashboardTab = ({ user, ads = [], onRefreshAds }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Use global synchronized gold rate
    const { goldRate } = useGoldRate();



    const [stats, setStats] = useState({
        totalSaved: 0,
        activeChits: 0,
        monthlyCommitment: 0,
        totalGoal: 0,
        hasUnlimitedPlan: false,
        totalActualGoldWeight: 0
    });
    const [monthlyData, setMonthlyData] = useState({ labels: [], data: [] });
    const [planDistribution, setPlanDistribution] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        // Only set main loading if not refreshing
        if (!refreshing) setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };

            // 1. Fetch My Plans (Subscriptions)
            const { data: plans } = await axios.get(`${APIURL}/chit-plans/my-plans`, config);



            // Calculate Stats
            let totalSaved = 0;
            let monthlyCommitment = 0;
            let totalGoal = 0;
            let hasUnlimitedPlan = false;
            let totalActualGoldWeight = 0;

            // Filter active plans only (exclude delivered and settled)
            const activePlans = plans.filter(p => !p.status || p.status === 'active' || p.status === 'pending');

            activePlans.forEach(plan => {
                totalSaved += plan.totalSaved || 0;
                totalGoal += plan.totalAmount || 0;
                monthlyCommitment += plan.monthlyAmount || 0;
                
                totalActualGoldWeight += plan.totalGoldWeight || 0;
                
                const planNameLower = plan.planName?.toLowerCase() || '';
                if (planNameLower.includes('unlimited') || planNameLower.includes('infinity') || plan.returnType === 'gold') {
                    hasUnlimitedPlan = true;
                }
            });

            setStats({
                totalSaved,
                activeChits: activePlans.length,
                monthlyCommitment,
                totalGoal,
                hasUnlimitedPlan,
                totalActualGoldWeight
            });

            // Prepare Pie Chart Data (Distribution by Plan Name)
            // Use totalSaved instead of monthlyAmount, truncate name
            const distribution = activePlans.map((plan, index) => ({
                name: plan.planName, // Full name, handled in scrollable legend
                population: plan.totalSaved || 0,
                color: [COLORS?.primary, COLORS?.secondary, COLORS?.success, COLORS?.warning, COLORS?.danger][index % 5],
                legendFontColor: "#7F7F7F",
                legendFontSize: 11
            }));
            setPlanDistribution(distribution);


            // Mock Monthly Growth (or fetch real history)
            // Real implementation would calculate sum of payments grouped by Month
            setMonthlyData({
                labels: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
                data: [
                    Math.max(0, totalSaved - (monthlyCommitment * 5)),
                    Math.max(0, totalSaved - (monthlyCommitment * 4)),
                    Math.max(0, totalSaved - (monthlyCommitment * 3)),
                    Math.max(0, totalSaved - (monthlyCommitment * 2)),
                    Math.max(0, totalSaved - monthlyCommitment),
                    totalSaved
                ]
            });


            setRecentActivity(activePlans.slice(0, 5));
        } catch (error) {
            console.error("Dashboard Fetch Error", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
        if (onRefreshAds) {
            onRefreshAds();
        }
    };


    const chartConfig = {
        backgroundGradientFrom: "#ffffff",
        backgroundGradientTo: "#ffffff",
        color: (opacity = 1) => `rgba(212, 169, 100, ${opacity})`,
        strokeWidth: 2, // optional, default 3
        barPercentage: 0.5,
        useShadowColorFromDataset: false,
        labelColor: (opacity = 1) => `rgba(0,0,0, ${opacity})`,
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS?.primary} />
            </View>
        );
    }

    const handleAdPress = (link) => {
        if (link) {
            Linking.openURL(link).catch(err => console.error("Couldn't load page", err));
        }
    };

    return (
        <LinearGradient
            colors={['#c1ab8eff', '#f2e07bff', '#915200']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }} style={styles.wrapper}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS?.primary]} />
                }
            >
                <AdBanner ads={ads} />
                <View style={styles.headerSection}>
                    <Text style={styles.welcomeText}>Hello, {user.name}</Text>
                    <Text style={styles.subText}>Here is your financial overview</Text>
                </View>

                {/* Ads Component - Removed, now global */}




                {/* Key Stats Cards */}
                <View style={styles.statGrid}>
                    <View style={[styles.statCard, { backgroundColor: COLORS?.primary }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Icon name="piggy-bank" size={20} color="#fff" style={{ opacity: 0.8 }} />
                            <Text style={[styles.statLabel, { color: '#fff' }]}>Total Saved</Text>
                        </View>
                        <Text style={[styles.statValue, { color: '#fff' }]}>₹ {stats.totalSaved.toLocaleString()}</Text>
                        <Text style={{ color: '#fff', fontSize: 10, opacity: 0.8 }}>Output: ~₹{stats.totalGoal.toLocaleString()}</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Icon name="calendar-check" size={20} color={COLORS?.primary} />
                            <Text style={styles.statLabel}>Monthly Due</Text>
                        </View>
                        <Text style={[styles.statValue, { color: COLORS?.dark }]}>₹ {stats.monthlyCommitment.toLocaleString()}</Text>
                        <Text style={{ color: COLORS?.secondary, fontSize: 10 }}>Across {stats.activeChits} Plans</Text>
                    </View>
                </View>
                {/* SIP Calculator - Interactive Card */}
                <Calculator />

                {/* Gold Equivalence / Locked Gold Value */}
                {stats.hasUnlimitedPlan ? (
                    <View style={styles.goldVaultCard}>
                        <View style={styles.vaultHeader}>
                            <View style={styles.vaultTitleCol}>
                                <Text style={styles.vaultLabel}>Gold Accumulated</Text>
                                <View style={[styles.purityBadge, { backgroundColor: COLORS?.primary + '15' }]}>
                                    <Text style={[styles.purityText, { color: COLORS?.primary }]}>Locked Weight (24K)</Text>
                                </View>
                            </View>
                            <Icon name="medal" size={24} color={COLORS?.primary} />
                        </View>

                        <View style={styles.vaultBody}>
                            <View style={styles.weightDisplay}>
                                <Text style={[styles.goldWeight, { color: COLORS?.primary }]}>
                                    {stats.totalActualGoldWeight.toFixed(3)}
                                </Text>
                                <Text style={styles.weightUnit}>GRAMS</Text>
                            </View>

                            <View style={styles.vaultDivider} />

                            <View style={styles.vaultFooter}>
                                <View style={{ width: '48%', alignItems: 'center' }}>
                                    <Text style={styles.footerMinLabel}>Amount Paid</Text>
                                    <Text style={styles.footerMinVal}>₹{stats.totalSaved.toLocaleString()}</Text>
                                </View>
                                <View style={{ width: 1, backgroundColor: '#F1F5F9', height: '100%' }} />
                                <View style={{ width: '48%', alignItems: 'center' }}>
                                    <Text style={styles.footerMinLabel}>Live Rate Equiv.</Text>
                                    <Text style={[styles.footerMinVal, { color: COLORS?.secondary }]}>
                                        {goldRate > 0 ? (stats.totalSaved / goldRate).toFixed(3) : '0.000'} g
                                    </Text>
                                </View>
                            </View>

                            {(() => {
                                if (goldRate > 0) {
                                    const liveRateWeight = stats.totalSaved / goldRate;
                                    const difference = stats.totalActualGoldWeight - liveRateWeight;
                                    
                                    if (difference > 0.0009) {
                                        return (
                                            <Text style={[styles.disclaimerText, { color: COLORS?.secondary }]}>
                                                * Profit: You accumulated <Text style={{ color: '#10b926ff', fontWeight: 'bold' }}>+{difference.toFixed(3)}g</Text> more than live rate!
                                            </Text>
                                        );
                                    } else if (difference < -0.0009) {
                                        return (
                                            <Text style={[styles.disclaimerText, { color: COLORS?.secondary }]}>
                                                * Loss: You accumulated <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>-{Math.abs(difference).toFixed(3)}g</Text> less than live rate!
                                            </Text>
                                        );
                                    }
                                }
                                return (
                                    <Text style={[styles.disclaimerText, { color: COLORS?.primary, fontWeight: 'bold' }]}>
                                        * Gold weight locked securely on each payment date.
                                    </Text>
                                );
                            })()}
                        </View>
                    </View>
                ) : (
                    <View style={[styles.goldVaultCard, { justifyContent: 'center', alignItems: 'center', paddingVertical: 35 }]}>
                        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS?.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                            <Icon name="medal" size={28} color={COLORS?.primary} />
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS?.dark, marginBottom: 8 }}>Unlock Gold Savings</Text>
                        <Text style={{ fontSize: 13, color: COLORS?.secondary, textAlign: 'center', paddingHorizontal: 10, lineHeight: 20 }}>
                            Join our Unlimited or Gold Return plans to secure digital gold at daily locked rates directly in your vault.
                        </Text>
                    </View>
                )}

                {/* Plan Distribution (Pie) */}
                {planDistribution.length > 0 && (
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>Investment Distribution</Text>
                        <View style={{ alignItems: 'center', marginBottom: 10 }}>
                            <PieChart
                                data={planDistribution}
                                width={width - 60}
                                height={200}
                                chartConfig={chartConfig}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"0"}
                                center={[(width - 60) / 4, 0]}
                                absolute
                                hasLegend={false}
                            />
                        </View>

                        <ScrollView
                            style={styles.legendContainer}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                        >
                            {planDistribution.map((item, index) => (
                                <View key={index} style={styles.legendItem}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                        <Text style={styles.legendText} numberOfLines={1} ellipsizeMode="tail">
                                            {item.name}
                                        </Text>
                                    </View>
                                    <Text style={styles.legendValue}>₹{item.population.toLocaleString()}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}



                {/* Recent Activity List - Horizontal Scroll */}
                <Text style={styles.sectionTitle}>Your Active Chits</Text>
                {recentActivity.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 20 }}
                    >
                        {recentActivity.map((plan, index) => (
                            <View key={index} style={styles.activityCardCompact}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.activityIconSmall}>
                                        <Icon name="gem" size={14} color={COLORS?.primary} />
                                    </View>
                                    <Text style={styles.activityStatusSmall}>{plan.status || 'Active'}</Text>
                                </View>

                                <Text style={styles.activityTitleCompact}>{plan.planName}</Text>

                                <View style={styles.cardFooter}>
                                    <View>
                                        <Text style={styles.labelSmall}>Saved</Text>
                                        <Text style={styles.amountSmall}>₹{plan.totalSaved?.toLocaleString()}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.labelSmall}>Joined</Text>
                                        <Text style={styles.dateSmall}>{new Date(plan.joinedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.activityCard}>
                        <Text style={{ color: COLORS?.secondary }}>No active plans yet.</Text>
                    </View>
                )}

            </ScrollView>
            {/* <LinearGradient
                colors={['rgba(248, 250, 252, 0)', '#F8FAFC']}
                style={styles.bottomFade}
                pointerEvents="none"
            /> */}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    content: {
        padding: 20,
        paddingBottom: 100, // Increased padding
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerSection: {
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    subText: {
        fontSize: 14,
        color: COLORS?.secondary,
        marginTop: 4
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 15,
        textAlign: 'center',
        color: COLORS?.dark,
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 15,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: 20,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginBottom: 10,
        marginLeft: 10
    },
    // Legend Styles
    legendContainer: {
        maxHeight: 120, // Limit height
        marginTop: 10,
        paddingHorizontal: 10
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        justifyContent: 'space-between',
        width: '100%'
    },
    legendColor: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10
    },
    legendText: {
        fontSize: 12,
        color: COLORS?.secondary,
        flex: 1,
        marginRight: 10
    },
    legendValue: {
        fontSize: 12,
        color: COLORS?.dark,
        fontWeight: '600'
    },
    statGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        width: '48%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        justifyContent: 'space-between',
        minHeight: 120
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginVertical: 10
    },
    statLabel: {
        fontSize: 12,
        color: COLORS?.secondary,
        textTransform: 'uppercase',
        fontWeight: '600'
    },
    // Compact Horizontal Card Styles
    activityCardCompact: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 16,
        elevation: 3,
        marginBottom: 10,
        marginRight: 20,
        marginLeft: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        width: 160, // Fixed width for compact look
        minHeight: 130,
        justifyContent: 'space-between'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    activityIconSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS?.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityStatusSmall: {
        fontSize: 10,
        color: COLORS?.success,
        fontWeight: '700',
        textTransform: 'uppercase',
        backgroundColor: COLORS?.success + '15',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    activityTitleCompact: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginBottom: 12,
        lineHeight: 20
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    labelSmall: {
        fontSize: 10,
        color: COLORS?.secondary,
        marginBottom: 2
    },
    amountSmall: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLORS?.primary
    },
    dateSmall: {
        fontSize: 11,
        color: COLORS?.dark,
        fontWeight: '500'
    },
    // Fallback
    activityCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    bottomFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 20
    },
    // Calculator Styles
    calculatorCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    calcHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    calcTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    calcTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginLeft: 8
    },
    headerSubtitle: {
        fontSize: 10,
        color: COLORS?.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600'
    },
    maturityShowcase: {
        marginTop: 15,
        alignItems: 'center',
        paddingVertical: 10,
        position: 'relative'
    },
    glowRef: {
        position: 'absolute',
        top: '20%',
        width: '60%',
        height: 40,
        backgroundColor: COLORS?.primary + '10',
        borderRadius: 30,
        filter: 'blur(20px)', // Note: standard RN doesn't support filter, we'll use a themed circle
        opacity: 0.5
    },
    maturityContent: {
        alignItems: 'center',
    },
    maturityLabel: {
        fontSize: 10,
        color: COLORS?.secondary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 5,
    },
    amountWrap: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    currencySymbol: {
        fontSize: 20,
        color: COLORS?.primary,
        fontWeight: 'bold',
        marginTop: 5,
        marginRight: 2,
    },
    mainAmount: {
        fontSize: 38,
        fontWeight: '900',
        color: COLORS?.dark,
        letterSpacing: -1,
    },
    targetIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    targetText: {
        fontSize: 10,
        color: COLORS?.secondary,
        fontWeight: '600',
        marginLeft: 4,
    },
    calcBody: {
        gap: 5
    },
    inputGroup: {
        marginBottom: 10
    },
    inputLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    inputLabel: {
        fontSize: 12,
        color: COLORS?.secondary,
        fontWeight: '500'
    },
    inputValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS?.primary
    },
    slider: {
        width: '100%',
        height: 30
    },
    // Gold Vault Styles
    goldVaultCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        elevation: 4,
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(212, 169, 100, 0.1)'
    },
    vaultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15
    },
    vaultTitleCol: {
        gap: 4
    },
    vaultLabel: {
        fontSize: 14,
        color: COLORS?.secondary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    purityBadge: {
        backgroundColor: COLORS?.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    purityText: {
        fontSize: 10,
        color: COLORS?.primary,
        fontWeight: 'bold'
    },
    vaultBody: {
        alignItems: 'center'
    },
    weightDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginVertical: 10
    },
    goldWeight: {
        fontSize: 48,
        fontWeight: '900',
        color: COLORS?.dark,
        letterSpacing: -1
    },
    weightUnit: {
        fontSize: 14,
        color: COLORS?.secondary,
        fontWeight: '700',
        marginLeft: 8,
        letterSpacing: 1
    },
    vaultDivider: {
        width: '100%',
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 15
    },
    vaultFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%'
    },
    footerMinLabel: {
        fontSize: 10,
        color: COLORS?.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4
    },
    footerMinVal: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS?.dark
    },
    disclaimerText: {
        fontSize: 9,
        color: COLORS?.secondary,
        fontStyle: 'italic',
        marginTop: 12,
        textAlign: 'center',
        opacity: 0.8
    },
    // Ads Styles
    adsContainer: {
        height: 180,
        marginBottom: 25,
    },
    adCard: {
        width: width - 40,
        height: 180,
        marginRight: 10,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        backgroundColor: '#fff',
    },
    adImage: {
        width: '100%',
        height: '100%',
    },
});

export default DashboardTab;
