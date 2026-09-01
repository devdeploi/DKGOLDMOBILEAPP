/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { ImageBackground, View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl, Image, Linking, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { COLORS } from '../../styles/theme';
import { LineChart, PieChart } from 'react-native-chart-kit'; // Ensure this is installed
import axios from 'axios';
import { APIURL, BASE_URL } from '../../constants/api';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Slider from '@react-native-community/slider';
import AdBanner from '../AdBanner';
import Calculator from '../Calculator';
import { useGoldRate } from '../../context/GoldRateContext';
import CustomAlert from '../CustomAlert';


const { width } = Dimensions.get('window');

const DashboardTab = ({ user, ads = [], onRefreshAds }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Use global synchronized gold rate
    const { goldRate } = useGoldRate();
    const [isDataVisible, setIsDataVisible] = useState(false);
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [verifyingPassword, setVerifyingPassword] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info' });

    const showAlert = (title, message, type = 'info') => {
        setAlertConfig({ visible: true, title, message, type });
    };

    const handleVerifyPassword = async () => {
        if (!passwordInput) return;
        setVerifyingPassword(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.post(`${APIURL}/users/verify-password`, { password: passwordInput }, config);
            if (data.success) {
                setIsDataVisible(true);
                setIsPasswordModalVisible(false);
                setPasswordInput('');
            }
        } catch (error) {
            showAlert('Error', 'Incorrect password. Please try again.', 'error');
        } finally {
            setVerifyingPassword(false);
        }
    };

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
    const [activeCardIndex, setActiveCardIndex] = useState(0);

    const handleScroll = (event) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        if (slideSize > 0) {
            const index = event.nativeEvent.contentOffset.x / slideSize;
            const roundIndex = Math.round(index);
            if (activeCardIndex !== roundIndex) {
                setActiveCardIndex(roundIndex);
            }
        }
    };

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

            // Filter active and completed plans only (exclude delivered, settled, closed)
            const activePlans = plans.filter(p => !p.status || p.status === 'active' || p.status === 'completed');

            activePlans.forEach(plan => {
                totalSaved += (plan.totalSaved || 0) - (plan.deliveredAmount || 0);
                totalGoal += plan.totalAmount || 0;
                monthlyCommitment += plan.monthlyAmount || 0;
                
                totalActualGoldWeight += (plan.totalGoldWeight || 0) - (plan.deliveredGoldWeight || 0);
                
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
                population: (plan.totalSaved || 0) - (plan.deliveredAmount || 0),
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


            setRecentActivity(activePlans);
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
        <ImageBackground source={require('../../../public/assests/DKGOLDBG.png')} style={styles.wrapper} resizeMode="cover">
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <AdBanner ads={ads} />
                <View style={styles.headerSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={styles.welcomeText}>Hello, {user.name}</Text>
                            <Text style={styles.subText}>Here is your financial overview</Text>
                        </View>
                        <TouchableOpacity onPress={() => {
                            if (isDataVisible) {
                                setIsDataVisible(false);
                            } else {
                                setIsPasswordModalVisible(true);
                            }
                        }} style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}>
                            <Icon name={isDataVisible ? "eye-slash" : "eye"} size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Activity List - Horizontal Scroll */}
                {/* <Text style={styles.sectionTitle}>Your Active Chits</Text> */}
                {recentActivity.length > 0 ? (
                    <View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingVertical: 10 }}
                            snapToInterval={width - 40}
                            decelerationRate="fast"
                            pagingEnabled
                            onScroll={handleScroll}
                            scrollEventThrottle={16}
                        >
                            {recentActivity.map((plan, index) => {
                                const lastPaymentDate = plan.history?.length > 0 ? new Date(plan.history[0].paymentDate).toLocaleDateString() : 'N/A';
                                const isUnlimited = plan.durationMonths === 0 || plan.returnType === 'gold' || (plan.planName && plan.planName.toLowerCase().includes('unlimited'));

                                return (
                                    <View key={index} style={{ marginBottom: 5, width: width - 40 }}>
                                    <View style={styles.newPlanCard}>
                                        <View style={styles.newPlanCardContent}>
                                            <View style={styles.newPlanCardLeft}>
                                                {/* <Text style={styles.newPlanWelcomeText}>Welcome, {user.name}</Text> */}
                                                <Text style={styles.newPlanWelcomeText}>{user.phone}</Text>

                                                <View style={styles.newPlanDetailRow}>
                                                    <Text style={styles.newPlanLabel}>My Plan</Text>
                                                    <Text style={styles.newPlanValue}>: {plan.planName}</Text>
                                                </View>
                                                <View style={styles.newPlanDetailRow}>
                                                    <Text style={styles.newPlanLabel}>Type</Text>
                                                    <Text style={styles.newPlanValue}>: {isUnlimited ? 'Unlimited' : 'Monthly'}</Text>
                                                </View>
                                                <View style={styles.newPlanDetailRow}>
                                                    <Text style={styles.newPlanLabel}>Monthly Pay</Text>
                                                    <Text style={styles.newPlanValue}>: Rs. {plan.monthlyAmount}</Text>
                                                </View>
                                                <View style={styles.newPlanDetailRow}>
                                                    <Text style={styles.newPlanLabel}>Account No.</Text>
                                                    <Text style={styles.newPlanValue}>: {plan.acc_no || 'N/A'}</Text>
                                                </View>
                                                <View style={styles.newPlanDetailRow}>
                                                    <Text style={styles.newPlanLabel}>No. of Installment</Text>
                                                    <Text style={styles.newPlanValue}>: {isUnlimited ? 'N/A' : plan.durationMonths}</Text>
                                                </View>
                                                <View style={styles.newPlanDetailRow}>
                                                    <Text style={styles.newPlanLabel}>Total Amount</Text>
                                                    <Text style={styles.newPlanValue}>: {isUnlimited ? 'N/A' : plan.totalAmount}</Text>
                                                </View>
                                                <View style={styles.newPlanDetailRow}>
                                                    <Text style={styles.newPlanLabel}>Status</Text>
                                                    <Text style={styles.newPlanValue}>: <Text style={{textTransform: 'capitalize'}}>{plan.status || 'Active'}</Text></Text>
                                                </View>
                                            </View>
                                            <View style={styles.newPlanCardRight}>
                                                <Icon name="chart-line" size={34} color="#6B8E23" style={{marginBottom: 5}} />
                                                <Icon name="coins" size={28} color="#EBCB28" style={{opacity: 0.9}} />
                                                <Icon name="seedling" size={16} color="#6B8E23" style={{marginTop: -10}} />
                                            </View>
                                        </View>
                                        
                                        <View style={[styles.newPlanCardFooter, { flexWrap: 'wrap', gap: 5, paddingVertical: 10 }]}>
                                            <Text style={styles.newPlanFooterText}>Last Payment : {lastPaymentDate}</Text>
                                            <Text style={styles.newPlanFooterText}>Paid : {isDataVisible ? `₹${(plan.totalSaved || 0)}` : '****'} ({plan.installmentsPaid})</Text>
                                            {!isUnlimited && (
                                                <Text style={styles.newPlanFooterText}>Remaining Due: {isDataVisible ? `₹${(plan.totalAmount - (plan.totalSaved || 0))}` : '****'} ({Math.max(0, plan.durationMonths - plan.installmentsPaid)})</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                        </ScrollView>
                        {recentActivity.length > 1 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 15 }}>
                                {recentActivity.map((_, i) => (
                                    <View key={i} style={{
                                        width: i === activeCardIndex ? 8 : 6,
                                        height: i === activeCardIndex ? 8 : 6,
                                        borderRadius: 4,
                                        backgroundColor: i === activeCardIndex ? '#EBCB28' : 'rgba(255,255,255,0.4)',
                                        marginHorizontal: 4
                                    }} />
                                ))}
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.activityCard}>
                        <Text style={{ color: COLORS?.secondary }}>No active plans yet.</Text>
                    </View>
                )}

                {/* Key Stats Cards */}
                <View style={styles.statGrid}>
                    <View style={[styles.statCard, { backgroundColor: COLORS?.primary }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={[styles.statLabel, { color: '#fff', textAlign: 'center' }]}>Total Saved</Text>
                        </View>
                        <View style={{ gap: 8 }}>
                            {recentActivity.map((plan, idx) => {
                                const isUnlimited = plan.durationMonths === 0 || plan.returnType === 'gold' || (plan.planName && plan.planName.toLowerCase().includes('unlimited'));
                                const savedAmount = (plan.totalSaved || 0) - (plan.deliveredAmount || 0);
                                const savedGold = (plan.totalGoldWeight || 0) - (plan.deliveredGoldWeight || 0);

                                return (
                                    <View key={`saved-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: idx === recentActivity.length - 1 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingVertical: 8 }}>
                                        <View style={{ flex: 1, paddingRight: 5 }}>
                                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '400' }} numberOfLines={2}>{plan.planName}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{isDataVisible ? `₹ ${savedAmount.toLocaleString()}` : '****'}</Text>
                                            {isUnlimited && (
                                                <Text style={{ color: '#ffe066', fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>{isDataVisible ? `${savedGold.toFixed(3)}g` : '****'}</Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                            {recentActivity.length === 0 && (
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontStyle: 'italic' }}>No active plans</Text>
                            )}
                        </View>
                    </View>
 
                    <View style={styles.statCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={[styles.statLabel, { textAlign: 'center' }]}>Monthly Due</Text>
                        </View>
                        <View style={{ gap: 8 }}>
                            {recentActivity.map((plan, idx) => {
                                const isUnlimited = plan.durationMonths === 0 || plan.returnType === 'gold' || (plan.planName && plan.planName.toLowerCase().includes('unlimited'));
                                const monthlyDue = plan.monthlyAmount || 0;
 
                                return (
                                    <View key={`due-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: idx === recentActivity.length - 1 ? 0 : 1, borderBottomColor: '#eee', paddingVertical: 8 }}>
                                        <View style={{ flex: 1, paddingRight: 5 }}>
                                            <Text style={{ color: COLORS?.dark, fontSize: 9, fontWeight: 'bold' }} numberOfLines={1}>{plan.planName}</Text>
                                            <Text style={{ color: COLORS?.secondary, fontSize: 9 }}>A/c: {plan.acc_no || 'N/A'}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ color: COLORS?.primary, fontSize: 12, fontWeight: 'bold' }}>
                                                {isUnlimited ? 'Flexible' : (isDataVisible ? `₹ ${monthlyDue.toLocaleString()}` : '****')}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}     
                            {recentActivity.length === 0 && (
                                <Text style={{ color: COLORS?.secondary, fontSize: 11, fontStyle: 'italic' }}>No active plans</Text>
                            )}
                        </View>
                    </View>
                </View>
                {/* SIP Calculator - Interactive Card */}
                <Calculator />

                {/* Gold Equivalence / Locked Gold Value */}
                {/* {stats.hasUnlimitedPlan ? (
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
                                    {isDataVisible ? stats.totalActualGoldWeight.toFixed(3) : '****'}
                                </Text>
                                <Text style={styles.weightUnit}>GRAMS</Text>
                            </View>

                            <View style={styles.vaultDivider} />

                            <View style={styles.vaultFooter}>
                                <View style={{ width: '48%', alignItems: 'center' }}>
                                    <Text style={styles.footerMinLabel}>Amount Paid</Text>
                                    <Text style={styles.footerMinVal}>{isDataVisible ? `₹${stats.totalSaved.toLocaleString()}` : '****'}</Text>
                                </View>
                                <View style={{ width: 1, backgroundColor: '#F1F5F9', height: '100%' }} />
                                <View style={{ width: '48%', alignItems: 'center' }}>
                                    <Text style={styles.footerMinLabel}>Live Rate Equiv.</Text>
                                    <Text style={[styles.footerMinVal, { color: COLORS?.secondary }]}>
                                        {isDataVisible ? (goldRate > 0 ? (stats.totalSaved / goldRate).toFixed(3) : '0.000') : '****'} {isDataVisible ? 'g' : ''}
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
                )} */}

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

                        <View style={styles.legendContainer}>
                            {planDistribution.map((item, index) => (
                                <View key={index} style={styles.legendItem}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                        <Text style={styles.legendText} numberOfLines={1} ellipsizeMode="tail">
                                            {item.name}
                                        </Text>
                                    </View>
                                    <Text style={styles.legendValue}>{isDataVisible ? `₹${item.population.toLocaleString()}` : '****'}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}





            </ScrollView>
            {/* <View
                style={styles.bottomFade}
                pointerEvents="none"
            /> */}
            {/* Password Modal */}
            <Modal
                visible={isPasswordModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsPasswordModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enter Password</Text>
                        <Text style={styles.modalSubTitle}>Please verify your password to view sensitive financial data.</Text>
                        
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Your Login Password"
                            placeholderTextColor="#999"
                            secureTextEntry={true}
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                            autoCapitalize="none"
                        />

                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => {
                                setIsPasswordModalVisible(false);
                                setPasswordInput('');
                            }}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalVerifyBtn, verifyingPassword && { opacity: 0.7 }]} 
                                onPress={handleVerifyPassword}
                                disabled={verifyingPassword}
                            >
                                {verifyingPassword ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.modalVerifyText}>Verify</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
        </ImageBackground>
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
        color: '#ffffff',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    subText: {
        fontSize: 14,
        color: '#fff8e7',
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 15,
        textAlign: 'center',
        color: '#ffffff',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
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
        alignItems: 'flex-start',
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
    newPlanCard: {
        backgroundColor: '#FFF9C4',
        borderRadius: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#EBCB28'
    },
    newPlanCardContent: {
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    newPlanCardLeft: {
        flex: 1
    },
    newPlanWelcomeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#793D22'
    },
    newPlanPhoneText: {
        fontSize: 12,
        color: '#793D22',
        marginBottom: 6
    },
    newPlanDetailRow: {
        flexDirection: 'row',
        marginBottom: 2
    },
    newPlanLabel: {
        width: 100,
        fontSize: 10,
        color: '#793D22'
    },
    newPlanValue: {
        fontSize: 10,
        color: '#793D22',
        fontWeight: '600',
        flex: 1
    },
    newPlanCardRight: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 6
    },
    newPlanCardFooter: {
        backgroundColor: '#EBCB28',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 12
    },
    newPlanFooterText: {
        fontSize: 8,
        color: '#553106',
        fontWeight: '600'
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginBottom: 8
    },
    modalSubTitle: {
        fontSize: 13,
        color: COLORS?.secondary,
        textAlign: 'center',
        marginBottom: 20
    },
    passwordInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS?.dark,
        marginBottom: 24,
        backgroundColor: '#F8FAFC'
    },
    modalActionRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        gap: 12
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center'
    },
    modalCancelText: {
        color: COLORS?.secondary,
        fontWeight: 'bold',
        fontSize: 15
    },
    modalVerifyBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: COLORS?.primary,
        alignItems: 'center'
    },
    modalVerifyText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15
    }
});

export default DashboardTab;
