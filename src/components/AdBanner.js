import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    Linking,
    Animated,
    FlatList
} from 'react-native';
import { COLORS } from '../styles/theme';
import { BASE_URL } from '../constants/api';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width - 40;

const AdBanner = ({ ads }) => {
    const [activeSlide, setActiveSlide] = useState(0);
    const flatListRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const brandAds = useMemo(() => [], []);

    // Process ads to expand multiple images into individual slides
    const validAds = useMemo(() => {
        const merchantAds = ads.filter(ad => !ad.isBrandAd && (ad.imageUrl || (ad.imageUrls && ad.imageUrls.length > 0)));

        if (merchantAds.length > 0) {
            const flattenedAds = [];
            merchantAds.forEach((ad, adIdx) => {
                if (ad.imageUrls && ad.imageUrls.length > 0) {
                    ad.imageUrls.forEach((imgUrl, imgIdx) => {
                        flattenedAds.push({
                            ...ad,
                            imageUrl: imgUrl,
                            // Ensure unique _id for each image slide
                            _id: ad._id ? `${ad._id}_image_${imgIdx}` : `merchant_${adIdx}_img_${imgIdx}`
                        });
                    });
                } else if (ad.imageUrl) {
                    flattenedAds.push(ad);
                }
            });
            return flattenedAds;
        }
        return brandAds;
    }, [ads, brandAds]);

    useEffect(() => {
        if (validAds.length > 1) {
            const timer = setInterval(() => {
                let nextSlide = (activeSlide + 1) % validAds.length;
                setActiveSlide(nextSlide);
                flatListRef.current?.scrollToIndex({
                    index: nextSlide,
                    animated: true
                });
            }, 5000);
            return () => clearInterval(timer);
        }
    }, [activeSlide, validAds.length]);

    const handleAdPress = (ad) => {
        if (ad.link) {
            Linking.openURL(ad.link).catch(err => console.error("Couldn't load page", err));
        }
    };

    const renderItem = ({ item }) => {
        let imageSource;
        if (item.source) {
            // Static local asset (brand ads)
            imageSource = item.source;
        } else {
            // Remote image (merchant ads)
            let imageUrl = '';
            if (item.imageUrl) {
                imageUrl = item.imageUrl.startsWith('http') ? item.imageUrl : `${BASE_URL}${item.imageUrl}`;
            } else if (item.imageUrls && item.imageUrls.length > 0) {
                imageUrl = item.imageUrls[0].startsWith('http') ? item.imageUrls[0] : `${BASE_URL}${item.imageUrls[0]}`;
            }
            imageSource = { uri: imageUrl || 'https://via.placeholder.com/400x200?text=Exclusive+Offer' };
        }

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleAdPress(item)}
                style={styles.adCard}
            >
                <Image
                    source={imageSource}
                    style={styles.adImage}
                    resizeMode="cover"
                />
                <View style={styles.overlay}>
                    <View style={styles.textContainer}>
                        <Text style={styles.adTitle} numberOfLines={1}>
                            {item.title || 'Special Offer'}
                        </Text>
                        <Text style={styles.adSubtitle} numberOfLines={2}>
                            {item.description || 'Check out our latest premium collections and offers.'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (validAds.length === 0) return null;

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={validAds}
                renderItem={renderItem}
                keyExtractor={(item, index) => item._id || index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToAlignment="center"
                snapToInterval={SLIDE_WIDTH + 10}
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / (SLIDE_WIDTH + 10));
                    setActiveSlide(index);
                }}
            />
            {validAds.length > 1 && (
                <View style={styles.pagination}>
                    {validAds.map((_, i) => {
                        const scale = scrollX.interpolate({
                            inputRange: [(i - 1) * (SLIDE_WIDTH + 10), i * (SLIDE_WIDTH + 10), (i + 1) * (SLIDE_WIDTH + 10)],
                            outputRange: [0.8, 1.2, 0.8],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange: [(i - 1) * (SLIDE_WIDTH + 10), i * (SLIDE_WIDTH + 10), (i + 1) * (SLIDE_WIDTH + 10)],
                            outputRange: [0.4, 1, 0.4],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.dot,
                                    { transform: [{ scale }], opacity }
                                ]}
                            />
                        );
                    })}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
        height: 220,
    },
    listContent: {
        paddingHorizontal: 0,
    },
    adCard: {
        width: SLIDE_WIDTH,
        height: 200,
        marginHorizontal: 5,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    adImage: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'flex-end',
        padding: 15,
    },
    textContainer: {
        width: '80%',
    },
    adTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    adSubtitle: {
        color: '#e0e0e0',
        fontSize: 12,
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 5,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS?.primary || '#D4A964',
        marginHorizontal: 4,
    },
});

export default AdBanner;
