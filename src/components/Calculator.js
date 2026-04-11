import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { COLORS } from '../styles/theme';
import { useGoldRate } from '../context/GoldRateContext';

const Calculator = ({ liveGoldRate }) => {
    const { goldRates } = useGoldRate();
    
    // Get 22K Selling price from context
    const getInitialRate = () => {
        const rate22k = goldRates.rows.find(r => r.id === '22k_inr')?.sellRate;
        return rate22k || liveGoldRate || 6500;
    };

    // --- Forecast State ---
    const [forecastMode, setForecastMode] = useState('weight'); // 'weight' | 'amount'
    const [grams, setGrams] = useState('10');
    const [amountInput, setAmountInput] = useState('100000');

    const [currentRate, setCurrentRate] = useState(getInitialRate().toFixed(0));

    useEffect(() => {
        const rate22k = goldRates.rows.find(r => r.id === '22k_inr')?.sellRate;
        const rateToUse = rate22k || liveGoldRate;
        if (rateToUse) {
            setCurrentRate(parseFloat(rateToUse).toFixed(0));
        }
    }, [goldRates, liveGoldRate]);

    // --- Forecast Logic ---
    const calculateForecast = () => {
        const rate = parseFloat(currentRate || 1);
        if (forecastMode === 'weight') {
            const g = parseFloat(grams) || 0;
            return {
                totalValue: Math.round(g * rate),
                goldWeight: g
            };
        } else {
            const amt = parseFloat(amountInput) || 0;
            return {
                totalValue: amt,
                goldWeight: (amt / rate).toFixed(3)
            };
        }
    };

    const forecast = calculateForecast();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Icon name="chart-line" size={16} color={COLORS?.primary} solid />
                <Text style={styles.headerTitle}>Gold Forecast</Text>
            </View>

            {/* Live Rate Display */}
            <View style={styles.rateCard}>
                <View>
                    <Text style={styles.rateLabel}>Live Gold Rate (22K)</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.currency}>₹</Text>
                        <Text style={styles.rateInput}>{currentRate}</Text>
                        <Text style={styles.perGram}>/gm</Text>
                    </View>
                </View>
                <View style={styles.liveBadge}>
                    <View style={styles.greenDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </View>

            {/* Mode Toggle */}
            <View style={styles.modeToggleContainer}>
                <TouchableOpacity
                    style={[styles.modeBtn, forecastMode === 'weight' && styles.activeModeBtn]}
                    onPress={() => setForecastMode('weight')}
                >
                    <Icon name="balance-scale" size={12} color={forecastMode === 'weight' ? '#fff' : '#64748b'} />
                    <Text style={[styles.modeBtnText, forecastMode === 'weight' && styles.activeModeBtnText]}>By Weight</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeBtn, forecastMode === 'amount' && styles.activeModeBtn]}
                    onPress={() => setForecastMode('amount')}
                >
                    <Icon name="money-bill-wave" size={12} color={forecastMode === 'amount' ? '#fff' : '#64748b'} />
                    <Text style={[styles.modeBtnText, forecastMode === 'amount' && styles.activeModeBtnText]}>By Amount</Text>
                </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>
                    {forecastMode === 'weight' ? 'Enter Gold Weight' : 'Enter Investment Amount'}
                </Text>
                <View style={styles.inputBox}>
                    {forecastMode === 'amount' && <Text style={styles.prefix}>₹</Text>}
                    <TextInput
                        style={styles.textInput}
                        value={forecastMode === 'weight' ? grams : amountInput}
                        onChangeText={forecastMode === 'weight' ? setGrams : setAmountInput}
                        keyboardType="numeric"
                        placeholder="0"
                    />
                    {forecastMode === 'weight' && <Text style={styles.prefix}>g</Text>}
                </View>
            </View>

            {/* Result Card */}
            <View style={styles.resultCard}>
                <View style={styles.resultRow}>
                    <View>
                        <Text style={styles.resultLabel}>
                            {forecastMode === 'weight' ? 'Equivalent Amount' : 'Equivalent Gold Weight'}
                        </Text>
                        <Text style={styles.resultMain}>
                            {forecastMode === 'weight'
                                ? `₹${forecast.totalValue.toLocaleString()}`
                                : `${forecast.goldWeight}g`}
                        </Text>
                    </View>
                    <Icon name={forecastMode === 'weight' ? "money-bill-alt" : "coins"} size={32} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={styles.dividerSub} />
                <View style={styles.resultRow}>
                    <Text style={styles.goldWeightText}>
                        <Icon name="info-circle" size={10} color={COLORS?.primary} />
                        {forecastMode === 'weight'
                            ? ` Value of ${forecast.goldWeight}g at current market rate.`
                            : ` You can accumulate ${forecast.goldWeight}g with ₹${forecast.totalValue.toLocaleString()}.`}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 15,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 15,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    rateCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#FEF3C7'
    },
    rateLabel: { fontSize: 12, color: '#B45309', fontWeight: '600', marginBottom: 2 },
    currency: { fontSize: 18, fontWeight: 'bold', color: COLORS?.dark, marginRight: 2 },
    rateInput: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS?.dark,
        minWidth: 60,
        padding: 0
    },
    perGram: { fontSize: 12, color: COLORS?.secondary, marginTop: 4 },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20
    },
    greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A', marginRight: 4 },
    liveText: { fontSize: 10, fontWeight: 'bold', color: '#16A34A' },

    modeToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        padding: 4,
        marginBottom: 15,
        gap: 4
    },
    modeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8
    },
    activeModeBtn: {
        backgroundColor: '#1e293b',
        elevation: 2
    },
    modeBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748b'
    },
    activeModeBtnText: {
        color: '#fff'
    },

    inputSection: { marginBottom: 15 },
    inputLabel: { fontSize: 12, color: COLORS?.secondary, fontWeight: '600', marginBottom: 6 },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F8FAFC'
    },
    prefix: { fontSize: 16, color: COLORS?.dark, fontWeight: 'bold', marginRight: 5 },
    textInput: { flex: 1, fontSize: 16, fontWeight: 'bold', color: COLORS?.dark, paddingVertical: 10 },

    resultCard: {
        backgroundColor: '#1E293B',
        borderRadius: 15,
        padding: 15,
        marginTop: 5
    },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
    resultMain: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    dividerSub: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
    goldWeightText: { color: '#E2E8F0', fontSize: 11, lineHeight: 16 },
});

export default Calculator;
