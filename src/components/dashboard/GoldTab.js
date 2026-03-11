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
    TouchableOpacity
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

    // Sort rows to put common items at top (Gold 24k, 22k)
    const sortedRows = [...goldRates.rows].sort((a, b) => {
        const priority = { 'gold_24k': 1, 'gold_22k': 2, 'silver_spot': 3 };
        return (priority[a.id] || 99) - (priority[b.id] || 99);
    });

    const mainPrice = sortedRows[0] || { buyRate: 0, label: 'Gold' };

    return (
        <View style={styles.container}>
            <View style={styles.tableWrapper}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.headerColText, { flex: 2 }]}>COMMODITY</Text>
                    <Text style={[styles.headerColText, { flex: 1.1, textAlign: 'center' }]}>BUY</Text>
                    <Text style={[styles.headerColText, { flex: 1.1, textAlign: 'center' }]}>SELL</Text>
                    <Text style={[styles.headerColText, { flex: 1.0, textAlign: 'right' }]}>H / L</Text>
                </View>

                <ScrollView
                    style={styles.tableBody}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: isLandscape ? 80 : 140 }
                    ]}
                >
                    {sortedRows.map((row, idx) => (
                        <View
                            key={row.id || idx}
                            style={[
                                styles.tableRow,
                                idx % 2 === 0 ? styles.evenRow : styles.oddRow,
                                isSmallDevice && styles.tableRowSmall
                            ]}
                        >
                            <View style={[styles.cell, { flex: 2, alignItems: 'flex-start' }]}>
                                <Text style={styles.descriptionText}>
                                    {row.label}
                                </Text>
                                <View style={styles.unitBadge}>
                                    <Text style={styles.unitBadgeText}>{row.unit.toUpperCase()}</Text>
                                </View>
                            </View>

                            <AnimatedPriceCell
                                value={row.buyRate}
                                prevValue={row.prevBuy}
                                rowId={row.id}
                                flex={1.1}
                            />

                            <AnimatedPriceCell
                                value={row.sellRate}
                                prevValue={row.prevSell}
                                rowId={row.id}
                                flex={1.1}
                            />

                            <View style={[styles.cell, { flex: 1.0, alignItems: 'flex-end' }]}>
                                <View style={styles.rangeCol}>
                                    <View style={styles.rangeItem}>
                                        <Icon name="arrow-up" size={8} color="#22c55e" />
                                        <Text style={styles.highText}>
                                            {Math.round(row.high)}
                                        </Text>
                                    </View>
                                    <View style={styles.rangeItem}>
                                        <Icon name="arrow-down" size={8} color="#ef4444" />
                                        <Text style={styles.lowText}>
                                            {Math.round(row.low)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}

                    <View style={styles.disclaimerContainer}>
                        <Icon name="info-circle" size={12} color="#915200" style={{ opacity: 0.5 }} />
                        <Text style={styles.disclaimerText}>
                            Prices are indicative and for reference only. Refresh happens every 10-15 seconds based on market volatility.
                        </Text>
                    </View>
                </ScrollView>
            </View>

            <View style={styles.bottomStatus}>
                <BlurBackground intensity={20} />
                <View style={styles.statusContent}>
                    <View style={styles.statusIndicator}>
                        <View style={styles.pulseContainer}>
                            <View style={styles.pulseDot} />
                            <View style={styles.pulseRing} />
                        </View>
                        <Text style={styles.statusText}>CHENNAI BULLION UPDATED</Text>
                    </View>
                    <Text style={styles.clockText}>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
        fontSize: 10,
        color: '#9E9E9E',
        fontWeight: 'bold',
        letterSpacing: 1,
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
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2D3436',
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
        fontSize: 12,
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
    bottomStatus: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: Platform.select({ ios: 40, android: 70 }),
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
    }
});

export default GoldTab;