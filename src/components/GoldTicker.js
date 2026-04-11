import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useGoldRate } from '../context/GoldRateContext';

const GoldTicker = () => {
    const { goldRates } = useGoldRate();

    if (goldRates.loading) return null;

    // Filter relevant rows for the ticker: 24K, 22K, and 18K INR
    const tickerRows = goldRates.rows.filter(row =>
        row.id === '24k_inr' ||
        row.id === '22k_inr' ||
        row.id === '18k_inr' ||
        row.id === 'silver_inr'
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
                    <Icon name="chart-line" size={10} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.liveText}>DAILY SELLING PRICES</Text>
                </View>
                <Text style={styles.sourceText}>Today's Rates</Text>
            </View>

            <View style={styles.ratesRow}>
                {tickerRows.map((row, idx) => {
                    const isUp = row.sellRate > row.prevSell;
                    const isDown = row.sellRate < row.prevSell;

                    return (
                        <View key={idx} style={[styles.rateBox, idx < tickerRows.length - 1 && styles.borderRight]}>
                            <Text style={styles.karatLabel}>
                                {row.id.includes('24k') ? '24K GOLD' : 
                                 row.id.includes('22k') ? '22K GOLD' : 
                                 row.id.includes('18k') ? '18K GOLD' : 'SILVER'}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.priceText, isUp && { color: '#15803d' }, isDown && { color: '#b91c1c' }]}>
                                    ₹{row.sellRate?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </Text>
                            </View>
                            <Text style={styles.unitSmall}>Per {row.unit === 'kg' ? 'Kilogram' : 'Gram'}</Text>
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
