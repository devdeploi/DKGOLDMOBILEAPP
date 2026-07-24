import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Text,
    ScrollView,
    ActivityIndicator,
    ImageBackground,
    TouchableOpacity,
    TextInput,
    Modal
} from 'react-native';
import { useGoldRate } from '../../context/GoldRateContext';

const LivePriceText = ({ value, style, prefix = '', isInteger = false }) => {
    const prevValueRef = useRef(value);
    const [color, setColor] = useState('#000');

    useEffect(() => {
        if (value > prevValueRef.current) {
            setColor('#16a34a'); // green for up
        } else if (value < prevValueRef.current) {
            setColor('#dc2626'); // red for down
        }
        prevValueRef.current = value;
    }, [value]);

    const displayValue = isInteger ? Math.round(value) : (value || 0).toFixed(2);

    return (
        <Text style={[style, { color }]}>
            {prefix}{displayValue}
        </Text>
    );
};

const GoldTab = () => {
    const { goldRates } = useGoldRate();
    const [selectedCarat, setSelectedCarat] = useState('22k');
    const [weightGrams, setWeightGrams] = useState('');
    const [makingPct, setMakingPct] = useState('');
    const [calcResult, setCalcResult] = useState(null);
    const [calcModalVisible, setCalcModalVisible] = useState(false);

    if (goldRates.loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#D4A964" />
                <Text style={styles.loaderText}>CONNECTING TO BULLION FEED...</Text>
            </View>
        );
    }

    const goldUsd = goldRates.rows.find(r => r.id === '24k_usd') || {};
    const silverUsd = goldRates.rows.find(r => r.id === 'silver_usd') || {};
    const usdInr = goldRates.rows.find(r => r.id === 'usd_inr') || {};

    const goldInr = goldRates.rows.find(r => r.id === '24k_inr') || {};
    const silverInr = goldRates.rows.find(r => r.id === 'silver_inr') || {};

    const retail22 = goldRates.rows.find(r => r.id === '22k_inr') || {};
    const retail18 = goldRates.rows.find(r => r.id === '18k_inr') || {};
    const retail14 = goldRates.rows.find(r => r.id === '14k_inr') || {};
    const retail9 = goldRates.rows.find(r => r.id === '9k_inr') || {};

    const base24 = goldInr.sellRate || 0;
    const calc14 = Math.round(base24 * (14/24));
    const calc9 = Math.round(base24 * (9/24));
    
    const finalRate14 = retail14.sellRate || calc14;
    const finalRate9 = retail9.sellRate || calc9;

    const handleCalculate = () => {
        let rate = 0;
        if (selectedCarat === '22k') rate = retail22.sellRate || 0;
        if (selectedCarat === '18k') rate = retail18.sellRate || 0;
        if (selectedCarat === '14k') rate = finalRate14 || 0;
        if (selectedCarat === '9k') rate = finalRate9 || 0;

        const w = parseFloat(weightGrams) || 0;
        const mcPct = parseFloat(makingPct) || 0;
        
        const goldAmount = w * rate;
        const makingCharges = goldAmount * (mcPct / 100);
        const hallmarking = 55;
        const subtotal = goldAmount + makingCharges + hallmarking;
        const gstGold = goldAmount * 0.03;
        const gstMaking = makingCharges * 0.05;
        const finalAmount = subtotal + gstGold + gstMaking;
        
        setCalcResult({
            rate,
            goldWeight: w,
            makingPct: mcPct,
            goldAmount,
            makingCharges,
            hallmarking,
            gstGold,
            gstMaking,
            finalAmount
        });
    };

    const handleReset = () => {
        setSelectedCarat('22k');
        setWeightGrams('');
        setMakingPct('');
        setCalcResult(null);
    };

    return (
        <ImageBackground source={require('../../../public/assests/DKGOLDBG.png')} style={styles.container} resizeMode="cover">
            <View style={styles.topHeader}>
                <Text style={styles.topHeaderText}>GOLD & SILVER RATES</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* Top 3 Summary Boxes */}
                <View style={styles.topBoxesRow}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryBoxLabel}>GOLD($) 24K 999</Text>
                        <LivePriceText value={goldUsd.sellRate || 0} style={styles.summaryBoxValue} />
                        <View style={styles.summaryBoxHL}>
                            <Text style={[styles.hlText, { color: '#16a34a' }]}>H:{(goldUsd.high || 0).toFixed(2)}</Text>
                            <Text style={[styles.hlText, { color: '#dc2626' }]}>L:{(goldUsd.low || 0).toFixed(2)}</Text>
                        </View>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryBoxLabel}>SILVER($) 24K 999</Text>
                        <LivePriceText value={silverUsd.sellRate || 0} style={styles.summaryBoxValue} />
                        <View style={styles.summaryBoxHL}>
                            <Text style={[styles.hlText, { color: '#16a34a' }]}>H:{(silverUsd.high || 0).toFixed(2)}</Text>
                            <Text style={[styles.hlText, { color: '#dc2626' }]}>L:{(silverUsd.low || 0).toFixed(2)}</Text>
                        </View>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryBoxLabel}>INR (₹)</Text>
                        <LivePriceText value={usdInr.sellRate || 0} style={styles.summaryBoxValue} />
                        <View style={styles.summaryBoxHL}>
                            <Text style={[styles.hlText, { color: '#16a34a' }]}>H:{(usdInr.high || 0).toFixed(2)}</Text>
                            <Text style={[styles.hlText, { color: '#dc2626' }]}>L:{(usdInr.low || 0).toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Main Table */}
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thText, {flex: 2}]}>Description</Text>
                        <Text style={[styles.thText, {flex: 1, textAlign: 'center'}]}>SELL</Text>
                        <Text style={[styles.thText, {flex: 1, textAlign: 'right'}]}>H/L</Text>
                    </View>
                    
                    {/* Gold Row */}
                    <View style={[styles.tableRow, { backgroundColor: '#fff' }]}>
                        <Text style={[styles.tdDesc, {flex: 2}]}>GOLD(₹) 24K 999</Text>
                        <LivePriceText value={goldInr.sellRate || 0} style={[styles.tdValue, {flex: 1, textAlign: 'center'}]} />
                        <View style={{flex: 1, alignItems: 'flex-end'}}>
                            <Text style={[styles.tdHL, { color: '#16a34a' }]}>{(goldInr.high || 0).toFixed(2)}</Text>
                            <Text style={[styles.tdHL, { color: '#dc2626' }]}>{(goldInr.low || 0).toFixed(2)}</Text>
                        </View>
                    </View>

                    {/* Silver Row */}
                    <View style={[styles.tableRow, { backgroundColor: '#fcfcfc' }]}>
                        <Text style={[styles.tdDesc, {flex: 2}]}>SILVER(₹) 24K 999</Text>
                        <LivePriceText value={silverInr.sellRate || 0} style={[styles.tdValue, {flex: 1, textAlign: 'center'}]} />
                        <View style={{flex: 1, alignItems: 'flex-end'}}>
                            <Text style={[styles.tdHL, { color: '#16a34a' }]}>{(silverInr.high || 0).toFixed(2)}</Text>
                            <Text style={[styles.tdHL, { color: '#dc2626' }]}>{(silverInr.low || 0).toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* MJDTA RETAIL RATES */}
                <View style={styles.mjdtaContainer}>
                    <Text style={styles.mjdtaTitle}>RETAIL RATES</Text>
                    <View style={styles.mjdtaRow}>
                        <Text style={styles.mjdtaLabel}>GOLD 22K 916 - 1GM</Text>
                        <LivePriceText value={retail22.sellRate || 0} style={styles.mjdtaValue} prefix="(₹) " isInteger={true} />
                    </View>
                    <View style={styles.mjdtaRow}>
                        <Text style={styles.mjdtaLabel}>GOLD 18K 750 - 1GM</Text>
                        <LivePriceText value={retail18.sellRate || 0} style={styles.mjdtaValue} prefix="(₹) " isInteger={true} />
                    </View>
                    <View style={styles.mjdtaRow}>
                        <Text style={styles.mjdtaLabel}>SILVER - 1GM</Text>
                        <LivePriceText value={silverInr.sellRate || 0} style={styles.mjdtaValue} prefix="(₹) " isInteger={true} />
                    </View>
                    <Text style={styles.mjdtaFooter}>3% GST Applicable</Text>
                </View>

                {/* Calculator Button */}
                <TouchableOpacity 
                    style={styles.openCalcBtn} 
                    onPress={() => setCalcModalVisible(true)}
                >
                    <Text style={styles.openCalcBtnText}>Open Jewel Price Calculator</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Calculator Modal */}
            <Modal
                visible={calcModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCalcModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.calcContainer}>
                        <View style={styles.calcHeader}>
                            <Text style={styles.calcHeaderText}>Jewel Price Calculator</Text>
                            <TouchableOpacity onPress={() => setCalcModalVisible(false)}>
                                <Text style={{color: '#fef178', fontSize: 20, fontWeight: 'bold'}}>×</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.calcBody}>
                            
                            <View style={styles.calcBtnsRow}>
                                <TouchableOpacity style={[styles.calcCaratBtn, selectedCarat === '22k' && styles.calcCaratBtnActive]} onPress={() => setSelectedCarat('22k')}>
                                    <Text style={[styles.calcCaratBtnTitle, selectedCarat === '22k' && styles.calcCaratBtnTitleActive]}>22K916</Text>
                                    <Text style={[styles.calcCaratBtnVal, selectedCarat === '22k' && styles.calcCaratBtnValActive]}>{Math.round(retail22.sellRate || 0)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.calcCaratBtn, selectedCarat === '18k' && styles.calcCaratBtnActive]} onPress={() => setSelectedCarat('18k')}>
                                    <Text style={[styles.calcCaratBtnTitle, selectedCarat === '18k' && styles.calcCaratBtnTitleActive]}>18K750</Text>
                                    <Text style={[styles.calcCaratBtnVal, selectedCarat === '18k' && styles.calcCaratBtnValActive]}>{Math.round(retail18.sellRate || 0)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.calcCaratBtn, selectedCarat === '14k' && styles.calcCaratBtnActive]} onPress={() => setSelectedCarat('14k')}>
                                    <Text style={[styles.calcCaratBtnTitle, selectedCarat === '14k' && styles.calcCaratBtnTitleActive]}>14K585</Text>
                                    <Text style={[styles.calcCaratBtnVal, selectedCarat === '14k' && styles.calcCaratBtnValActive]}>{Math.round(finalRate14)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.calcCaratBtn, selectedCarat === '9k' && styles.calcCaratBtnActive]} onPress={() => setSelectedCarat('9k')}>
                                    <Text style={[styles.calcCaratBtnTitle, selectedCarat === '9k' && styles.calcCaratBtnTitleActive]}>9K375</Text>
                                    <Text style={[styles.calcCaratBtnVal, selectedCarat === '9k' && styles.calcCaratBtnValActive]}>{Math.round(finalRate9)}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.calcInputsRow}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.calcInputLabel}>Weight in grams</Text>
                                    <TextInput style={styles.calcInput} keyboardType="numeric" value={weightGrams} onChangeText={setWeightGrams} />
                                </View>
                                <View style={{flex: 1}}>
                                    <Text style={styles.calcInputLabel}>Making Charges (%)</Text>
                                    <TextInput style={styles.calcInput} keyboardType="numeric" value={makingPct} onChangeText={setMakingPct} />
                                </View>
                            </View>

                            <View style={styles.calcActionsRow}>
                                <TouchableOpacity style={styles.calcActionBtn} onPress={handleCalculate}>
                                    <Text style={styles.calcActionBtnText}>Calculate Price</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.calcActionBtn} onPress={handleReset}>
                                    <Text style={styles.calcActionBtnText}>Reset</Text>
                                </TouchableOpacity>
                            </View>

                            {calcResult !== null && (
                                <View style={styles.calcResultBox}>
                                    <Text style={styles.calcResultTitle}>COST ESTIMATE</Text>
                                    <View style={styles.calcResultRow}>
                                        <Text style={styles.calcResultKey}>Gold Weight</Text>
                                        <Text style={styles.calcResultVal}>{calcResult.goldWeight} g</Text>
                                    </View>
                                    <View style={styles.calcResultRow}>
                                        <Text style={styles.calcResultKey}>Gold Value</Text>
                                        <Text style={styles.calcResultVal}>₹{Math.round(calcResult.goldAmount).toLocaleString('en-IN')}</Text>
                                    </View>
                                    <View style={styles.calcResultRow}>
                                        <Text style={styles.calcResultKey}>Making ({calcResult.makingPct}%)</Text>
                                        <Text style={styles.calcResultVal}>₹{Math.round(calcResult.makingCharges).toLocaleString('en-IN')}</Text>
                                    </View>
                                    <View style={styles.calcResultRow}>
                                        <Text style={styles.calcResultKey}>Hallmarking</Text>
                                        <Text style={styles.calcResultVal}>₹{Math.round(calcResult.hallmarking).toLocaleString('en-IN')}</Text>
                                    </View>
                                    <View style={styles.calcResultRow}>
                                        <Text style={styles.calcResultKey}>GST on Gold (3%)</Text>
                                        <Text style={styles.calcResultVal}>₹{Math.round(calcResult.gstGold).toLocaleString('en-IN')}</Text>
                                    </View>
                                    <View style={styles.calcResultRow}>
                                        <Text style={styles.calcResultKey}>GST on Making (5%)</Text>
                                        <Text style={styles.calcResultVal}>₹{Math.round(calcResult.gstMaking).toLocaleString('en-IN')}</Text>
                                    </View>
                                    <View style={[styles.calcResultRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5, marginTop: 5 }]}>
                                        <Text style={[styles.calcResultKey, { fontWeight: 'bold' }]}>TOTAL PAYABLE</Text>
                                        <Text style={[styles.calcResultVal, { fontWeight: 'bold', fontSize: 16 }]}>₹{Math.round(calcResult.finalAmount).toLocaleString('en-IN')}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

        </ImageBackground>
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
        alignItems: 'center',
        backgroundColor: '#1C1917'
    },
    loaderText: {
        marginTop: 20,
        color: '#D4A964',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    scrollContent: {
        padding: 10,
        paddingBottom: 40
    },
    topHeader: {
        alignItems: 'center',
        marginVertical: 15,
    },
    topHeaderText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: 1, height: 1},
        textShadowRadius: 3
    },
    topBoxesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    summaryBox: {
        flex: 1,
        backgroundColor: '#fef178',
        borderRadius: 4,
        padding: 6,
        marginHorizontal: 4,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    summaryBoxLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
        textAlign: 'center'
    },
    summaryBoxValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 6
    },
    summaryBoxHL: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 2
    },
    hlText: {
        fontSize: 10,
        color: '#000',
        fontWeight: '600'
    },
    tableContainer: {
        backgroundColor: '#fff',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc'
    },
    thText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000'
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center'
    },
    tdDesc: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000'
    },
    tdValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000'
    },
    tdHL: {
        fontSize: 11,
        color: '#666'
    },
    mjdtaContainer: {
        backgroundColor: '#fef178',
        borderRadius: 4,
        padding: 12,
        marginBottom: 15,
    },
    mjdtaTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 10
    },
    mjdtaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    mjdtaLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000'
    },
    mjdtaValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000'
    },
    mjdtaFooter: {
        fontSize: 11,
        color: '#000',
        marginTop: 4
    },
    calcContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#592c14'
    },
    calcHeader: {
        backgroundColor: '#592c14',
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    calcHeaderText: {
        color: '#fef178',
        fontSize: 18,
        fontWeight: 'bold'
    },
    calcBody: {
        padding: 15,
    },
    calcBtnsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15
    },
    calcCaratBtn: {
        flex: 1,
        backgroundColor: '#e5e5e5',
        marginHorizontal: 3,
        paddingVertical: 8,
        borderRadius: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#666'
    },
    calcCaratBtnActive: {
        backgroundColor: '#1a1a1a',
        borderColor: '#1a1a1a'
    },
    calcCaratBtnTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#000'
    },
    calcCaratBtnTitleActive: {
        color: '#fef178'
    },
    calcCaratBtnVal: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#000'
    },
    calcCaratBtnValActive: {
        color: '#fef178'
    },
    calcInputsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15
    },
    calcInputLabel: {
        fontSize: 13,
        color: '#333',
        marginBottom: 4
    },
    calcInput: {
        backgroundColor: '#e5e5e5',
        padding: 8,
        borderRadius: 4,
        fontSize: 14,
        color: '#000'
    },
    calcActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    calcActionBtn: {
        backgroundColor: '#e5e5e5',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ccc'
    },
    calcActionBtnText: {
        fontSize: 12,
        color: '#000',
        fontWeight: 'bold'
    },
    calcResultBox: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#fef178',
        borderRadius: 4,
    },
    calcResultTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 10,
        textAlign: 'center'
    },
    calcResultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    calcResultKey: {
        fontSize: 13,
        color: '#333'
    },
    calcResultVal: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#000'
    },
    openCalcBtn: {
        backgroundColor: '#592c14',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20
    },
    openCalcBtnText: {
        color: '#fef178',
        fontWeight: 'bold',
        fontSize: 16
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    }
});

export default GoldTab;
