import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    ScrollView,
    Animated,
    Dimensions,
    Platform,
    ActivityIndicator,
    StatusBar,
    useWindowDimensions,
    PixelRatio,
    TouchableOpacity,
    TextInput
} from 'react-native';
import { useGoldRate } from '../../context/GoldRateContext';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enhanced Responsive sizing utility
const scale = SCREEN_WIDTH / 375;
const normalize = (size) => {
    const newSize = size * scale;
    if (Platform.OS === 'ios') {
        return Math.round(PixelRatio.roundToNearestPixel(newSize));
    } else {
        return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
    }
};

const AnimatedPriceCell = ({ value, prevValue, rowId, flex }) => {
    const isUp = value > prevValue;
    const isDown = value < prevValue;
    const animValue = useRef(new Animated.Value(0)).current;
    const scaleValue = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isUp || isDown) {
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(animValue, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: false
                    }),
                    Animated.timing(animValue, {
                        toValue: 0,
                        duration: 700,
                        useNativeDriver: false
                    })
                ]),
                Animated.sequence([
                    Animated.timing(scaleValue, {
                        toValue: 1.05,
                        duration: 150,
                        useNativeDriver: false
                    }),
                    Animated.timing(scaleValue, {
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: false
                    })
                ])
            ]).start();
        }
    }, [value]);

    const highlightColor = isUp ? '#22c55e' : '#ef4444';
    const textColor = isUp ? '#22c55e' : (isDown ? '#ef4444' : '#1a1a1a');

    const bgInterpolate = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0)', highlightColor + '20'] // 20% opacity hex
    });

    const isPound = rowId?.includes('pound');

    return (
        <Animated.View style={[styles.cell, {
            backgroundColor: bgInterpolate,
            transform: [{ scale: scaleValue }],
            flex: flex || 1.2,
            borderRadius: 8,
            paddingHorizontal: 4,
            minWidth: normalize(70)
        }]}>
            <View style={styles.priceContainer}>
                {isUp && <Icon name="caret-up" size={normalize(10)} color="#22c55e" style={{ marginRight: 2 }} />}
                {isDown && <Icon name="caret-down" size={normalize(10)} color="#ef4444" style={{ marginRight: 2 }} />}
                <Text style={[styles.priceText, { color: textColor }]}>
                    {value.toLocaleString(undefined, {
                        minimumFractionDigits: isPound ? 0 : 2,
                        maximumFractionDigits: isPound ? 0 : 2
                    })}
                </Text>
            </View>
        </Animated.View>
    );
};

const GoldTab = () => {
    const { goldRates, refreshTimer } = useGoldRate();
    const [currentTime, setCurrentTime] = useState(new Date());
    const { width, height } = useWindowDimensions();

    const isLandscape = width > height;
    const isSmallDevice = width < 375;
    const isTablet = width >= 768;

    // --- Gold Price Calculator State ---
    const [selectedCarat, setSelectedCarat] = useState('22k');
    const [weightGrams, setWeightGrams] = useState('');
    const [makingPct, setMakingPct] = useState('');
    const [calcResult, setCalcResult] = useState(null);

    // --- Market Status Logic (MCX Standards) ---
    const getMarketStatus = () => {
        const now = currentTime;
        const day = now.getDay();
        const hour = now.getHours();
        const min = now.getMinutes();
        const timeVal = hour * 100 + min;

        // Indian Market Holidays 2026 (Common)
        const dateStr = `${now.getMonth() + 1}-${now.getDate()}`;
        const holidays = [
            '1-26', // Republic Day
            '3-19', // Holi (Approx)
            '4-2',  // Good Friday
            '4-14', // Ambedkar Jayanti
            '5-1',  // Maharashtra Day
            '8-15', // Independence Day
            '10-2', // Gandhi Jayanti
            '11-8', // Diwali (Approx)
            '12-25' // Christmas
        ];

        const isHoliday = holidays.includes(dateStr);
        const isWeekend = day === 0 || day === 6;

        // MCX Standard: 10:00 AM - 11:30 PM IST
        const openTime = 1000;
        const closeTime = 2330; 
        const isOpenTime = timeVal >= openTime && timeVal <= closeTime;

        if (isHoliday) return { isOpen: false, label: 'MARKET CLOSED (PUBLIC HOLIDAY)', color: '#ef4444' };
        if (isWeekend) return { isOpen: false, label: 'MARKET CLOSED (WEEKEND)', color: '#ef4444' };
        if (!isOpenTime) return { isOpen: false, label: `MARKET CLOSED (OPENS AT 10:00 AM)`, color: '#ef4444' };
        
        return { isOpen: true, label: 'MARKET IS OPEN (MCX)', color: '#22c55e' };
    };

    const marketStatus = getMarketStatus();

    // --- Calculator Logic ---
    const getCaratRate = () => {
        const rate22 = goldRates.rows.find(r => r.id === '22k_inr')?.sellRate || 0;
        const rate18 = goldRates.rows.find(r => r.id === '18k_inr')?.sellRate || (rate22 * 18 / 22);
        if (selectedCarat === '22k') return rate22;
        if (selectedCarat === '18k') return rate18;
        return rate22;
    };

    const handleCalculate = () => {
        const rate = getCaratRate();
        const w = parseFloat(weightGrams) || 0;
        const mp = parseFloat(makingPct) || 0;
        const goldAmount = w * rate;
        const makingCharges = (mp / 100) * goldAmount;
        const hallmarking = 40;
        const packing = 100;
        // Calculate GST on the total of gold + making + fees
        const subtotal = goldAmount + makingCharges + hallmarking + packing;
        const gst = subtotal * 0.03;
        const finalAmount = subtotal + gst;
        setCalcResult({ goldAmount, makingCharges, hallmarking, packing, gst, finalAmount, goldWeight: w, rate });
    };

    const handleReset = () => {
        setSelectedCarat('22k');
        setWeightGrams('');
        setMakingPct('');
        setCalcResult(null);
    };

    const formatINR = (val) => `₹${Math.round(val).toLocaleString('en-IN')}`;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (goldRates.loading) {
        return (
            <View style={styles.loader}>
                <LinearGradient
                    colors={['#1a1a1a', '#2a2a2a']}
                    style={StyleSheet.absoluteFill}
                />
                <ActivityIndicator size="large" color="#D4A964" />
                <Text style={styles.loaderText}>CONNECTING TO BULLION FEED...</Text>
            </View>
        );
    }

    // Separate rows into groups
    const usdInrRate = goldRates.rows.find(r => r.id === 'usd_inr');
    const usdRows = goldRates.rows.filter(r => ['24k_usd', 'silver_usd'].includes(r.id));
    const inrRows = goldRates.rows.filter(r => ['24k_inr', 'silver_inr'].includes(r.id));
    const retailNoGstRows = goldRates.rows.filter(r => ['22k_inr', '18k_inr'].includes(r.id));
    const retailGstRows = goldRates.rows.filter(r => ['22k_gst', '18k_gst'].includes(r.id));

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.tableBody}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: isLandscape ? 80 : 140, paddingTop: 10 }
                ]}
            >
                {/* --- Top Exchange Rate Bar --- */}
                {usdInrRate && (
                    <View style={styles.topExchangeBar}>
                        <LinearGradient colors={['#ebdc87', '#fffbf0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topExGradient}>
                            <View style={styles.exInfo}>
                                <Icon name="chart-line" size={14} color="#915200" />
                                <Text style={styles.exLabelTop}>LIVE USD / INR RATE</Text>
                            </View>
                                <View style={styles.exBadge}>
                                    <Text style={styles.exValueTop}>{usdInrRate.sellRate.toFixed(2)}</Text>
                                    <Text style={styles.exInrSymbol}>₹</Text>
                                </View>
                        </LinearGradient>
                    </View>
                )}

                {/* --- Table 1: International Market (USD) --- */}
                <View style={styles.tableWrapper}>
                    <View style={styles.sectionHeaderBanner}>
                        <LinearGradient colors={['#1a1a1a', '#4a4a4a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.jewelleryHeaderGradient}>
                            <Icon name="globe-americas" size={14} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.jewelleryHeaderTitle}>INTERNATIONAL MARKET ($)</Text>
                        </LinearGradient>
                    </View>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerColText, { flex: 2 }]}>DESC</Text>
                        <Text style={[styles.headerColText, { flex: 1.1, textAlign: 'center' }]}>SELL</Text>
                        <Text style={[styles.headerColText, { flex: 1.0, textAlign: 'right' }]}>H / L</Text>
                    </View>
                    {usdRows.map((row, idx) => (
                        <View key={row.id} style={[styles.tableRow, idx % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                            <View style={[styles.cell, { flex: 2, alignItems: 'flex-start' }]}>
                                <Text style={styles.descriptionText}>{row.label}</Text>
                                <View style={styles.unitBadge}><Text style={styles.unitBadgeText}>{row.unit.toUpperCase()}</Text></View>
                            </View>
                            <AnimatedPriceCell value={row.sellRate} prevValue={row.prevSell} rowId={row.id} flex={1.1} />
                            <View style={[styles.cell, { flex: 1.0, alignItems: 'flex-end' }]}>
                                <View style={styles.rangeCol}>
                                    <View style={styles.rangeItem}><Icon name="arrow-up" size={8} color="#22c55e" /><Text style={styles.highText}>{Math.round(row.high)}</Text></View>
                                    <View style={styles.rangeItem}><Icon name="arrow-down" size={8} color="#ef4444" /><Text style={styles.lowText}>{Math.round(row.low)}</Text></View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* --- Table 2: Indian Market (INR) --- */}
                <View style={styles.tableWrapper}>
                    <View style={styles.sectionHeaderBanner}>
                        <LinearGradient colors={['#1e3a8a', '#3b82f6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.jewelleryHeaderGradient}>
                            <Icon name="map-marker-alt" size={14} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.jewelleryHeaderTitle}>INDIAN MARKET (₹)</Text>
                        </LinearGradient>
                    </View>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerColText, { flex: 2 }]}>DESC</Text>
                        <Text style={[styles.headerColText, { flex: 1.1, textAlign: 'center' }]}>SELL</Text>
                        <Text style={[styles.headerColText, { flex: 1.0, textAlign: 'right' }]}>H / L</Text>
                    </View>
                    {inrRows.map((row, idx) => (
                        <View key={row.id} style={[styles.tableRow, idx % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                            <View style={[styles.cell, { flex: 2, alignItems: 'flex-start' }]}>
                                <Text style={styles.descriptionText}>{row.label}</Text>
                                <View style={styles.unitBadge}><Text style={styles.unitBadgeText}>{row.unit.toUpperCase()}</Text></View>
                            </View>
                            <AnimatedPriceCell value={row.sellRate} prevValue={row.prevSell} rowId={row.id} flex={1.1} />
                            <View style={[styles.cell, { flex: 1.0, alignItems: 'flex-end' }]}>
                                <View style={styles.rangeCol}>
                                    <View style={styles.rangeItem}><Icon name="arrow-up" size={8} color="#22c55e" /><Text style={styles.highText}>{Math.round(row.high)}</Text></View>
                                    <View style={styles.rangeItem}><Icon name="arrow-down" size={8} color="#ef4444" /><Text style={styles.lowText}>{Math.round(row.low)}</Text></View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* --- Table 3: Retail Jewellery Rates (No GST) --- */}
                <View style={styles.tableWrapper}>
                    <View style={styles.sectionHeaderBanner}>
                        <LinearGradient colors={['#915200', '#D4A964']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.jewelleryHeaderGradient}>
                            <Icon name="gem" size={14} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.jewelleryHeaderTitle}>RETAIL JEWELLERY RATES (NO GST)</Text>
                        </LinearGradient>
                    </View>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerColText, { flex: 2 }]}>DESC</Text>
                        <Text style={[styles.headerColText, { flex: 1.1, textAlign: 'center' }]}>SELL</Text>
                        <Text style={[styles.headerColText, { flex: 1.0, textAlign: 'right' }]}>H / L</Text>
                    </View>
                    {retailNoGstRows.map((row, idx) => (
                        <View key={row.id} style={[styles.tableRow, idx % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                            <View style={[styles.cell, { flex: 2, alignItems: 'flex-start' }]}>
                                <Text style={[styles.descriptionText, { color: '#915200' }]}>{row.label}</Text>
                                <View style={[styles.unitBadge, { backgroundColor: '#f3e9bd' }]}><Text style={[styles.unitBadgeText, { color: '#915200' }]}>{row.unit.toUpperCase()}</Text></View>
                            </View>
                            <AnimatedPriceCell value={row.sellRate} prevValue={row.prevSell} rowId={row.id} flex={1.1} />
                            <View style={[styles.cell, { flex: 1.0, alignItems: 'flex-end' }]}>
                                <View style={styles.rangeCol}>
                                    <View style={styles.rangeItem}><Text style={styles.highText}>H:{Math.round(row.high)}</Text></View>
                                    <View style={styles.rangeItem}><Text style={styles.lowText}>L:{Math.round(row.low)}</Text></View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* --- Table 4: Jewellery Rates (With GST) --- */}
                <View style={styles.tableWrapper}>
                    <View style={styles.sectionHeaderBanner}>
                        <LinearGradient colors={['#064e3b', '#10b981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.jewelleryHeaderGradient}>
                            <Icon name="file-invoice-dollar" size={14} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.jewelleryHeaderTitle}>RETAIL RATES (WITH 3% GST)</Text>
                        </LinearGradient>
                    </View>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerColText, { flex: 2 }]}>DESC</Text>
                        <Text style={[styles.headerColText, { flex: 1.1, textAlign: 'center' }]}>SELL</Text>
                        <Text style={[styles.headerColText, { flex: 1.0, textAlign: 'right' }]}>H / L</Text>
                    </View>
                    {retailGstRows.map((row, idx) => (
                        <View key={row.id} style={[styles.tableRow, idx % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                            <View style={[styles.cell, { flex: 2, alignItems: 'flex-start' }]}>
                                <Text style={[styles.descriptionText, { color: '#064e3b' }]}>{row.label}</Text>
                                <View style={[styles.unitBadge, { backgroundColor: '#d1fae5' }]}><Text style={[styles.unitBadgeText, { color: '#064e3b' }]}>{row.unit.toUpperCase()}</Text></View>
                            </View>
                            <AnimatedPriceCell value={row.sellRate} prevValue={row.prevSell} rowId={row.id} flex={1.1} />
                            <View style={[styles.cell, { flex: 1.0, alignItems: 'flex-end' }]}>
                                <View style={styles.rangeCol}>
                                    <View style={styles.rangeItem}><Text style={styles.highText}>{Math.round(row.high)}</Text></View>
                                    <View style={styles.rangeItem}><Text style={styles.lowText}>{Math.round(row.low)}</Text></View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* ===== Gold Price Calculator ===== */}
                <View style={styles.calcSection}>
                    <View style={styles.calcHeaderBanner}>
                        <View>
                            <Text style={styles.calcBannerTitle}>Jewel Price Calculator</Text>
                            <Text style={styles.calcBannerSub}>Carat · Weight · All charges included</Text>
                        </View>
                        <View style={styles.calcBannerBadge}><Icon name="coins" size={18} color="#FCD34D" solid /></View>
                    </View>

                    <Text style={styles.calcSectionLabel}>Select Carat</Text>
                    <View style={styles.caratRow}>
                        {['22k', '18k'].map(carat => {
                            const caratId = carat === '22k' ? '22k_inr' : '18k_inr';
                            const caratRate = goldRates.rows.find(r => r.id === caratId)?.sellRate || 0;
                            const isActive = selectedCarat === carat;
                            return (
                                <TouchableOpacity
                                    key={carat}
                                    style={[styles.caratBtn, isActive && styles.caratBtnActive]}
                                    onPress={() => { setSelectedCarat(carat); setCalcResult(null); }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.caratBtnText, isActive && styles.caratBtnTextActive]}>{carat.toUpperCase()}</Text>
                                    <Text style={[styles.caratRate, isActive && styles.caratRateActive]}>₹{Math.round(caratRate).toLocaleString('en-IN')}</Text>
                                    <Text style={[styles.caratRatePer, isActive && styles.caratRatePerActive]}>/gm</Text>
                                    {isActive && <View style={styles.caratActiveLine} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.inputsContainer}>
                        <View style={styles.inputGroup}>
                            <View style={styles.inputIconLabel}>
                                <View style={styles.inputIconCircle}><Icon name="weight" size={10} color="#fff" /></View>
                                <Text style={styles.calcSectionLabel}>Gold Weight</Text>
                            </View>
                            <View style={styles.calcInputBox}>
                                <TextInput
                                    style={styles.calcInput}
                                    value={weightGrams}
                                    onChangeText={t => { setWeightGrams(t); setCalcResult(null); }}
                                    keyboardType="decimal-pad"
                                    placeholder="Enter grams…"
                                    placeholderTextColor="#b0b8c4"
                                />
                                <View style={styles.unitPill}><Text style={styles.unitPillText}>grams</Text></View>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputIconLabel}>
                                <View style={[styles.inputIconCircle, { backgroundColor: '#7c3aed' }]}><Icon name="percentage" size={10} color="#fff" /></View>
                                <Text style={styles.calcSectionLabel}>Making Charges</Text>
                            </View>
                            <View style={styles.calcInputBox}>
                                <TextInput
                                    style={styles.calcInput}
                                    value={makingPct}
                                    onChangeText={t => { setMakingPct(t); setCalcResult(null); }}
                                    keyboardType="decimal-pad"
                                    placeholder="Enter percentage…"
                                    placeholderTextColor="#b0b8c4"
                                />
                                <View style={[styles.unitPill, { backgroundColor: '#ede9fe' }]}><Text style={[styles.unitPillText, { color: '#7c3aed' }]}>%</Text></View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.timingRow}>
                        <Icon name="clock" size={10} color="#64748b" />
                        <Text style={styles.timingText}>TIMING: 10:00 AM - 11:30 PM (IST)</Text>
                    </View>

                    <View style={styles.fixedChargesStrip}>
                        <Icon name="info-circle" size={10} color="#78350f" />
                        <Text style={styles.fixedChargesText}>Fixed: Hallmarking ₹40 · Packing ₹100 · GST 3%</Text>
                    </View>

                    <View style={styles.calcBtnRow}>
                        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}><Icon name="times" size={13} color="#64748b" /><Text style={styles.resetBtnText}>Reset</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate} activeOpacity={0.85}><Icon name="calculator" size={13} color="#1C1917" solid /><Text style={styles.calcBtnText}>Calculate Price</Text></TouchableOpacity>
                    </View>

                    {calcResult && (
                        <View style={styles.resultBox}>
                            <View style={styles.receiptHeader}>
                                <Text style={styles.receiptTitle}>COST ESTIMATE</Text>
                                <View style={styles.receiptPill}>
                                    <View style={styles.receiptPulse} />
                                    <Text style={styles.receiptPillText}>{selectedCarat.toUpperCase()} · {formatINR(calcResult.rate)}/g</Text>
                                </View>
                            </View>
                            <View style={styles.receiptBody}>
                                <View style={[styles.receiptRow, styles.receiptRowAlt]}>
                                    <View style={styles.receiptRowLeft}><Icon name="cube" size={9} color="#92400e" style={{ marginRight: 5 }} /><Text style={styles.receiptKey}>Gold Weight</Text></View>
                                    <Text style={styles.receiptVal}>{calcResult.goldWeight} g</Text>
                                </View>
                                <View style={styles.receiptRow}>
                                    <View style={styles.receiptRowLeft}><Icon name="coins" size={9} color="#92400e" style={{ marginRight: 5 }} /><Text style={styles.receiptKey}>Gold Value</Text></View>
                                    <Text style={styles.receiptVal}>{formatINR(calcResult.goldAmount)}</Text>
                                </View>
                                <View style={[styles.receiptRow, styles.receiptRowAlt]}>
                                    <View style={styles.receiptRowLeft}><Icon name="tools" size={9} color="#92400e" style={{ marginRight: 5 }} /><Text style={styles.receiptKey}>Making ({makingPct}%)</Text></View>
                                    <Text style={styles.receiptVal}>{formatINR(calcResult.makingCharges)}</Text>
                                </View>
                                <View style={styles.receiptRow}>
                                    <View style={styles.receiptRowLeft}><Icon name="certificate" size={9} color="#92400e" style={{ marginRight: 5 }} /><Text style={styles.receiptKey}>Hallmarking</Text></View>
                                    <Text style={styles.receiptVal}>₹40</Text>
                                </View>
                                <View style={[styles.receiptRow, styles.receiptRowAlt]}>
                                    <View style={styles.receiptRowLeft}><Icon name="box" size={9} color="#92400e" style={{ marginRight: 5 }} /><Text style={styles.receiptKey}>Packing</Text></View>
                                    <Text style={styles.receiptVal}>₹100</Text>
                                </View>
                            </View>
                            <View style={styles.gstRow}>
                                <View style={styles.receiptRowLeft}><Icon name="receipt" size={10} color="#854d0e" style={{ marginRight: 5 }} /><Text style={styles.gstKey}>GST (3%)</Text></View>
                                <Text style={styles.gstVal}>{formatINR(calcResult.gst)}</Text>
                            </View>
                            <View style={styles.totalBar}>
                                <View><Text style={styles.totalLabel}>TOTAL PAYABLE</Text><Text style={styles.totalSub}>All charges + GST included</Text></View>
                                <Text style={styles.totalAmount}>{formatINR(calcResult.finalAmount)}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            <View style={styles.bottomStatus}>
                <BlurBackground intensity={20} />
                <View style={styles.statusDisplayBar}>
                    <View style={styles.marketStatusPill}>
                        <View style={[styles.statusDot, { backgroundColor: marketStatus.color }]} />
                        <Text style={[styles.statusText, { color: marketStatus.isOpen ? '#22c55e' : '#666', fontWeight: 'bold' }]}>
                            {marketStatus.label}
                        </Text>
                    </View>
                    
                    <Text style={styles.clockText}>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                    </Text>
                </View>
            </View>
        </View>
    );
};

// Simple Blur replacement for platforms without BlurView
const BlurBackground = ({ intensity }) => (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }]} />
);

const styles = StyleSheet.create({
    sectionHeaderBanner: {
        height: 40,
        marginBottom: 5,
    },
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 20,
        color: '#D4A964',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    headerSection: {
        // paddingHorizontal: 10,
        paddingVertical: 8,
        // height: 100,
    },
    headerGradient: {
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    headerContent: {
        gap: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    marketInfo: {
        gap: 2,
    },
    marketStatus: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        paddingHorizontal: 20
    },
    marketLocation: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        paddingHorizontal: 15
    },
    timerContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    timerText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    featuredPriceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    featuredLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    featuredValueRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    featuredCurrency: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 4,
        marginRight: 2,
    },
    featuredPrice: {
        color: '#fff',
        fontSize: 34,
        fontWeight: '900',
    },
    timestampContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
    },
    timestampText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    tableWrapper: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: 1,
        paddingTop: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerColText: {
        fontSize: normalize(13),
        color: '#92400e',
        fontWeight: '900',
        letterSpacing: 1.2,
    },
    tableBody: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 10,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        marginVertical: 2,
        borderRadius: 12,
    },
    tableRowSmall: {
        paddingVertical: 12,
    },
    evenRow: {
        backgroundColor: '#fff',
    },
    oddRow: {
        backgroundColor: '#FBFBFB',
    },
    cell: {
        justifyContent: 'center',
        minHeight: 40,
    },
    descriptionText: {
        fontSize: normalize(16),
        fontWeight: '900',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    unitBadge: {
        backgroundColor: '#F0F2F5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    unitBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#636E72',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceText: {
        fontSize: normalize(18),
        fontWeight: '900',
        textAlign: 'center',
    },
    rangeCol: {
        alignItems: 'flex-end',
        gap: 4,
    },
    rangeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    highText: {
        fontSize: 10,
        color: '#22c55e',
        fontWeight: 'bold',
    },
    lowText: {
        fontSize: 10,
        color: '#ef4444',
        fontWeight: 'bold',
    },
    disclaimerContainer: {
        padding: 30,
        alignItems: 'center',
        gap: 10,
    },
    disclaimerText: {
        textAlign: 'center',
        fontSize: 10,
        color: '#9E9E9E',
        lineHeight: 16,
        paddingHorizontal: 20,
    },

    // --- Gold Price Calculator (Redesigned) ---
    calcSection: {
        marginVertical: 10,
        marginHorizontal: 10,
        marginBottom: 30,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F0F0F0',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    // Dark header banner
    calcHeaderBanner: {
        backgroundColor: '#1C1917',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    calcBannerTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FCD34D',
        letterSpacing: 0.3,
    },
    calcBannerSub: {
        fontSize: 10,
        color: 'rgba(252,211,77,0.55)',
        marginTop: 3,
    },
    calcBannerBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(252,211,77,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(252,211,77,0.2)',
    },
    // Carat chips with built-in rate
    calcSectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 8,
        paddingHorizontal: 16,
        marginTop: 14,
    },
    caratRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 4,
    },
    caratBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        position: 'relative',
        overflow: 'hidden',
    },
    caratBtnActive: {
        backgroundColor: '#1C1917',
        borderColor: '#1C1917',
    },
    caratBtnText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#334155',
        letterSpacing: 0.5,
    },
    caratBtnTextActive: {
        color: '#FCD34D',
    },
    caratRate: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
        marginTop: 3,
    },
    caratRateActive: {
        color: 'rgba(252,211,77,0.8)',
    },
    caratRatePer: {
        fontSize: 8,
        fontWeight: '600',
        color: '#94a3b8',
    },
    caratRatePerActive: {
        color: 'rgba(252,211,77,0.5)',
    },
    caratActiveLine: {
        position: 'absolute',
        bottom: 0,
        left: '20%',
        right: '20%',
        height: 3,
        backgroundColor: '#FCD34D',
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
    },
    // Inputs
    inputsContainer: {
        paddingHorizontal: 16,
        gap: 10,
        marginTop: 6,
    },
    inputGroup: {
        gap: 6,
    },
    inputIconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    inputIconCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#B45309',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calcInputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 2,
    },
    calcInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        paddingVertical: 10,
    },
    unitPill: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    unitPillText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#92400e',
    },
    // Timing
    timingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        marginTop: 10,
    },
    timingText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
    },
    // Fixed charges strip
    fixedChargesStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    fixedChargesText: {
        fontSize: 10,
        color: '#92400e',
        fontWeight: '600',
    },
    // Buttons
    calcBtnRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        marginTop: 14,
        marginBottom: 16,
    },
    resetBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    resetBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    calcBtn: {
        flex: 2.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#FCD34D',
        gap: 8,
        elevation: 3,
        shadowColor: '#B45309',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
    },
    calcBtnText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1C1917',
    },
    // Result receipt
    resultBox: {
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    receiptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    receiptTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#475569',
        letterSpacing: 1.5,
    },
    receiptPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    receiptPulse: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
    },
    receiptPillText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#92400e',
    },
    receiptBody: {
        paddingHorizontal: 14,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 9,
    },
    receiptRowAlt: {
        backgroundColor: '#FAFAFA',
    },
    receiptRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    receiptKey: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '500',
    },
    receiptVal: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    gstRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#FDE68A',
        borderBottomWidth: 1,
        borderBottomColor: '#FDE68A',
    },
    gstKey: {
        fontSize: 12,
        fontWeight: '700',
        color: '#854d0e',
    },
    gstVal: {
        fontSize: 13,
        fontWeight: '800',
        color: '#854d0e',
    },
    totalBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1C1917',
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: '#FCD34D',
        letterSpacing: 1,
    },
    totalSub: {
        fontSize: 9,
        color: 'rgba(252,211,77,0.5)',
        marginTop: 2,
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FCD34D',
    },
    bottomStatus: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2d183',
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    },
    statusDisplayBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: 10,
    },
    marketStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    exchangeRatePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 15,
        gap: 8,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    exLabelText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#92400e',
        letterSpacing: 0.5,
    },
    exValueText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#1e293b',
    },
    statusContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingBottom: Platform.select({ ios: 30, android: 10 }),
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    pulseContainer: {
        width: 12,
        height: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
        zIndex: 2,
    },
    pulseRing: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(34, 197, 94, 0.4)',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#2D3436',
        letterSpacing: 0.5,
    },
    clockText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#636E72',
        fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    },
    // Jewellery Section Styles
    jewellerySection: {
        marginTop: 25,
        marginBottom: 10,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        elevation: 2,
    },
    jewelleryHeaderBanner: {
        height: 40,
    },
    jewelleryHeaderGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    jewelleryHeaderTitle: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    jewellerySubHeader: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#fdfbf0',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    topExchangeBar: {
        marginBottom: 15,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2d183',
        elevation: 4,
        shadowColor: '#915200',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    topExGradient: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    exInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    exLabelTop: {
        fontSize: 11,
        fontWeight: '900',
        color: '#915200',
        letterSpacing: 1,
    },
    exPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    exBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2d183',
    },
    exValueTop: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1e293b',
    },
    exInrSymbol: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#915200',
        marginLeft: 2,
    },
});

export default GoldTab;