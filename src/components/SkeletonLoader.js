/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export const SkeletonItem = ({ width, height, borderRadius = 4, style }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [layoutWidth, setLayoutWidth] = React.useState(typeof width === 'number' ? width : 0);

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [animatedValue]);

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-layoutWidth, layoutWidth],
    });

    return (
        <View
            onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
            style={[{ width, height, borderRadius, backgroundColor: '#E0E0E0', overflow: 'hidden' }, style]}
        >
            <Animated.View
                style={{
                    width: '100%',
                    height: '100%',
                    transform: [{ translateX }],
                }}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
};

const SkeletonLoader = () => {
    return (
        <View style={styles.container}>
            {[1, 2, 3].map((item) => (
                <View key={item} style={styles.card}>
                    <View style={styles.row}>
                        <View>
                            <SkeletonItem width={120} height={24} style={{ marginBottom: 8 }} />
                            <SkeletonItem width={100} height={16} />
                        </View>
                        <SkeletonItem width={60} height={24} borderRadius={12} />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <SkeletonItem width={80} height={40} />
                        <SkeletonItem width={80} height={40} />
                        <SkeletonItem width={80} height={40} />
                    </View>
                    <View style={[styles.row, { marginTop: 20 }]}>
                        <SkeletonItem width={'100%'} height={30} />
                    </View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        // padding: 20, // Removed to avoid double padding in AnalyticsTab
    },
    header: {
        marginBottom: 30,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 15,
    },
});

export default SkeletonLoader;
