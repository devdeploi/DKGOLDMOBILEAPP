import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useGoldRate } from '../context/GoldRateContext';

const GoldTicker = () => {
    const { goldRates } = useGoldRate();

    if (goldRates.loading) return null;

    // Filter relevant rows for the ticker: 24K INR, 22K INR, and 22K 1 Pound
    const tickerRows = goldRates.rows.filter(row =>
        row.id === '24k_inr' ||
        row.id === '22k_inr' ||
        row.id === '22k_1pound'
    );

    return (
        <LinearGradient
            colors={['#eadb84ff', '#ebdc87']}
            style={styles.cardContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.cardHeader}>
                <View style={styles.liveTagContainer}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>CHENNAI LIVE</Text>
                </View>
                <Text style={styles.sourceText}>Market Rates</Text>
            </View>

            <View style={styles.ratesRow}>
                {tickerRows.map((row, idx) => {
                    const isUp = row.price > row.prevPrice;
                    const isDown = row.price < row.prevPrice;
                    const isPound = row.id.includes('pound');

                    return (
                        <View key={idx} style={[styles.rateBox, idx < tickerRows.length - 1 && styles.borderRight]}>
                            <Text style={styles.karatLabel}>
                                {row.id.includes('24k') ? '24K' : row.id.includes('1pound') ? '1 POUND' : '22K'}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.priceText, isUp && { color: '#15803d' }, isDown && { color: '#b91c1c' }]}>
                                    {row.price.toLocaleString(undefined, { maximumFractionDigits: isPound ? 0 : 0 })}
                                </Text>
                            </View>
                            <Text style={styles.unitSmall}>{isPound ? '8 Grams' : 'Per Gram'}</Text>
                        </View>
                    );
                })}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(183, 121, 31, 0.15)'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(183, 121, 31, 0.1)',
        padding: 10
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    sourceText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#854D0E',
        textTransform: 'uppercase'
    },
    liveTagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#DC2626',
        marginRight: 6
    },
    liveText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#DC2626'
    },
    ratesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: 10
    },
    rateBox: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 5
    },
    borderRight: {
        borderRightWidth: 1,
        borderRightColor: 'rgba(183, 121, 31, 0.1)'
    },
    karatLabel: {
        fontSize: 11,
        color: '#854D0E',
        marginBottom: 4,
        fontWeight: '700'
    },
    priceText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#B45309',
    },
    unitSmall: {
        fontSize: 9,
        color: '#854D0E',
        opacity: 0.6,
    }
});

export default GoldTicker;
