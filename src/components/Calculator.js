import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Slider from '@react-native-community/slider';
import { COLORS } from '../styles/theme';
import { useGoldRate } from '../context/GoldRateContext';

const Calculator = ({ liveGoldRate }) => {
    const { goldRate } = useGoldRate();
    const [activeTab, setActiveTab] = useState('forecast'); // 'calculator' | 'forecast'

    // --- Calculator State ---
    const [input, setInput] = useState('0');
    const [previousValue, setPreviousValue] = useState(null);
    const [operator, setOperator] = useState(null);
    const [newNumberStarted, setNewNumberStarted] = useState(true);

    // --- Forecast State ---
    const [forecastMode, setForecastMode] = useState('weight'); // 'weight' | 'amount'
    const [grams, setGrams] = useState('10');
    const [amountInput, setAmountInput] = useState('100000');

    // Use goldRate from context as priority, then prop, then fallback
    const initialRate = goldRate || liveGoldRate || 15600;
    const [currentRate, setCurrentRate] = useState(parseFloat(initialRate).toFixed(0));

    useEffect(() => {
        const rateToUse = goldRate || liveGoldRate;
        if (rateToUse) {
            setCurrentRate(parseFloat(rateToUse).toFixed(0));
        }
    }, [goldRate, liveGoldRate]);

    // --- Calculator Logic ---
    const handleNumber = (num) => {
        if (newNumberStarted) {
            setInput(num.toString());
            setNewNumberStarted(false);
        } else {
            setInput(input === '0' ? num.toString() : input + num);
        }
    };

    const handleOperator = (op) => {
        if (!newNumberStarted && previousValue !== null && operator) {
            // Chained calculation: Execute pending operation before setting new one
            const current = parseFloat(input);
            const previous = parseFloat(previousValue);
            let result = 0;
            switch (operator) {
                case '+': result = previous + current; break;
                case '-': result = previous - current; break;
                case '*': result = previous * current; break;
                case '/': result = previous / current; break;
            }
            setInput(result.toString());
            setPreviousValue(result.toString());
        } else if (!newNumberStarted) {
            // First operation in chain
            setPreviousValue(input);
        }

        setOperator(op);
        setNewNumberStarted(true);
    };

    const calculate = () => {
        if (!operator || !previousValue) return;
        const current = parseFloat(input);
        const previous = parseFloat(previousValue);
        let result = 0;
        switch (operator) {
            case '+': result = previous + current; break;
            case '-': result = previous - current; break;
            case '*': result = previous * current; break;
            case '/': result = previous / current; break;
        }
        setInput(result.toString());
        setOperator(null);
        setPreviousValue(null);
        setNewNumberStarted(true);
    };

    const clear = () => {
        setInput('0');
        setOperator(null);
        setPreviousValue(null);
        setNewNumberStarted(true);
    };

    const handlePercent = () => setInput((parseFloat(input) / 100).toString());
    const toggleSign = () => setInput((parseFloat(input) * -1).toString());

    // --- Components ---
    const CalcButton = ({ label, type = 'number', onPress, flex = 1 }) => {
        const getBgColor = () => {
            if (type === 'operator') return COLORS?.primary; // Gold
            if (type === 'secondary') return '#CBD5E1';     // Light Grey
            return '#334155';                               // Dark Slate
        };

        const getTextColor = () => {
            if (type === 'secondary') return '#1E293B';
            return '#fff';
        };

        return (
            <TouchableOpacity
                style={[styles.button, { backgroundColor: getBgColor(), flex: flex }]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <Text style={[styles.buttonText, { color: getTextColor() }]}>
                    {label === 'backspace' ? <Icon name="backspace" size={22} /> : label}
                </Text>
            </TouchableOpacity>
        );
    };

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
            {/* Header Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'calculator' && styles.activeTab]}
                    onPress={() => setActiveTab('calculator')}
                >
                    <Icon name="calculator" size={14} color={activeTab === 'calculator' ? COLORS?.primary : COLORS?.secondary} solid />
                    <Text style={[styles.tabText, activeTab === 'calculator' && styles.activeTabText]}>Calculator</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'forecast' && styles.activeTab]}
                    onPress={() => setActiveTab('forecast')}
                >
                    <Icon name="chart-line" size={14} color={activeTab === 'forecast' ? COLORS?.primary : COLORS?.secondary} solid />
                    <Text style={[styles.tabText, activeTab === 'forecast' && styles.activeTabText]}>Gold Forecast</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'calculator' ? (
                <View style={styles.calculatorBody}>
                    <View style={styles.displayContainer}>
                        <Text style={styles.previousText}>{previousValue} {operator}</Text>
                        <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
                            {parseFloat(input).toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <CalcButton label="AC" type="secondary" onPress={clear} />
                        <CalcButton label="+/-" type="secondary" onPress={toggleSign} />
                        <CalcButton label="%" type="secondary" onPress={handlePercent} />
                        <CalcButton label="÷" type="operator" onPress={() => handleOperator('/')} />
                    </View>
                    <View style={styles.row}>
                        <CalcButton label="7" onPress={() => handleNumber(7)} />
                        <CalcButton label="8" onPress={() => handleNumber(8)} />
                        <CalcButton label="9" onPress={() => handleNumber(9)} />
                        <CalcButton label="×" type="operator" onPress={() => handleOperator('*')} />
                    </View>
                    <View style={styles.row}>
                        <CalcButton label="4" onPress={() => handleNumber(4)} />
                        <CalcButton label="5" onPress={() => handleNumber(5)} />
                        <CalcButton label="6" onPress={() => handleNumber(6)} />
                        <CalcButton label="-" type="operator" onPress={() => handleOperator('-')} />
                    </View>
                    <View style={styles.row}>
                        <CalcButton label="1" onPress={() => handleNumber(1)} />
                        <CalcButton label="2" onPress={() => handleNumber(2)} />
                        <CalcButton label="3" onPress={() => handleNumber(3)} />
                        <CalcButton label="+" type="operator" onPress={() => handleOperator('+')} />
                    </View>
                    <View style={styles.row}>
                        <CalcButton label="0" flex={2.1} onPress={() => handleNumber(0)} />
                        <CalcButton label="." onPress={() => !input.includes('.') && handleNumber('.')} />
                        <CalcButton label="=" type="operator" onPress={calculate} />
                    </View>
                </View>
            ) : (
                <View style={styles.forecastBody}>
                    {/* Live Rate Display */}
                    <View style={styles.rateCard}>
                        <View>
                            <Text style={styles.rateLabel}>Live Gold Rate (24K)</Text>
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
            )}
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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 4,
        marginBottom: 15
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6
    },
    activeTab: {
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS?.secondary
    },
    activeTabText: {
        color: COLORS?.primary,
        fontWeight: 'bold'
    },
    // Calculator
    calculatorBody: {
        backgroundColor: '#0F172A',
        borderRadius: 24,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    displayContainer: {
        paddingHorizontal: 10,
        marginBottom: 20,
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        height: 100,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    previousText: { color: '#94A3B8', fontSize: 18, marginBottom: 8, fontWeight: '500' },
    displayText: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 14 },
    button: {
        height: 65,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2
    },
    buttonText: { fontSize: 26, fontWeight: '600' },

    // Forecast
    forecastBody: { paddingHorizontal: 5 },
    rateCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
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

    sliderSection: { marginBottom: 15 },
    sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    sliderValue: { fontSize: 14, fontWeight: 'bold', color: COLORS?.primary },

    resultCard: {
        backgroundColor: '#1E293B',
        borderRadius: 15,
        padding: 15,
        marginTop: 5
    },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
    resultMain: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    resultSub: { fontSize: 16, fontWeight: 'bold' },
    dividerSub: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
    goldWeightText: { color: '#E2E8F0', fontSize: 11, lineHeight: 16 },
    // Mode Toggle
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
});

export default Calculator;
