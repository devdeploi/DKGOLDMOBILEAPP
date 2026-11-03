import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions,
    Animated,
    FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { BASE_URL } from '../constants/api';

const { width } = Dimensions.get('window');
const SLIDE_WIDTH = width - 40;
const BANNER_HEIGHT = 200;

// Helper to check if an ad is currently active and within valid date range
const isAdActive = (ad) => {
    if (!ad) return false;

    if (ad.status && ad.status.toLowerCase() !== 'active') return false;
    if (ad.isActive === false) return false;

    const now = new Date();

    if (ad.startDate) {
        const start = new Date(ad.startDate);
        if (!isNaN(start.getTime()) && now < start) {
            return false;
        }
    }

    if (ad.endDate) {
        const end = new Date(ad.endDate);
        if (!isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            if (now > end) {
                return false;
            }
        }
    }

    return true;
};

// Reusable Fallback Card with DK Gold Store Information (Light Theme)
const FallbackBannerCard = () => (
    <View style={styles.fallbackCard}>
        <View style={styles.fallbackLeft}>
            <Image
                source={require('../assets/logodk.png')}
                style={styles.fallbackLogo}
                resizeMode="contain"
            />
            <Text style={styles.fallbackShopName}>DK GOLD</Text>
        </View>

        <View style={styles.fallbackVerticalLine} />

        <View style={styles.fallbackRight}>
            <View style={styles.fallbackItem}>
                <View style={styles.fallbackIconBadge}>
                    <Icon name="phone-alt" size={10} color="#915200" />
                </View>
                <Text style={styles.fallbackText}>9786112675</Text>
            </View>

            <View style={styles.fallbackItem}>
                <View style={styles.fallbackIconBadge}>
                    <Icon name="envelope" size={10} color="#915200" />
                </View>
                <Text style={styles.fallbackText}>dkgoldambur@gmail.com</Text>
            </View>

            <View style={styles.fallbackItem}>
                <View style={styles.fallbackIconBadge}>
                    <Icon name="map-marker-alt" size={11} color="#915200" />
                </View>
                <Text style={styles.fallbackText} numberOfLines={2}>
                    13/35, Mungil Mandi StreetAmbur - 635802
                </Text>
            </View>
        </View>
    </View>
);

const AdBanner = ({ ads = [] }) => {
    const [activeSlide, setActiveSlide] = useState(0);
    const [failedImages, setFailedImages] = useState({});
    const flatListRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    // Filter out expired ads, extracting only valid banner creatives (popup ads must never display here)
    const validAds = useMemo(() => {
        if (!ads || !Array.isArray(ads) || ads.length === 0) return [];

        const bannerAds = ads.filter(ad => {
            const isBannerType = (ad.adType || 'banner') === 'banner';
            return isBannerType && isAdActive(ad);
        });

        const merchantBannerAds = bannerAds.filter(ad => !ad.isBrandAd);
        const activeAdsList = merchantBannerAds.length > 0 ? merchantBannerAds : bannerAds;

        if (activeAdsList.length === 0) return [];

        const flattened = [];
        activeAdsList.forEach((ad, adIdx) => {
            if (ad.imageUrls && Array.isArray(ad.imageUrls) && ad.imageUrls.length > 0) {
                ad.imageUrls.forEach((imgUrl, imgIdx) => {
                    if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
                        flattened.push({
                            ...ad,
                            imageUrl: imgUrl.trim(),
                            _id: ad._id ? `${ad._id}_image_${imgIdx}` : `merchant_${adIdx}_img_${imgIdx}`
                        });
                    }
                });
            } else if (ad.imageUrl && typeof ad.imageUrl === 'string' && ad.imageUrl.trim()) {
                flattened.push({
                    ...ad,
                    imageUrl: ad.imageUrl.trim(),
                    _id: ad._id ? `${ad._id}` : `merchant_${adIdx}`
                });
            }
        });
        return flattened;
    }, [ads]);

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

    if (validAds.length === 0) {
        return null;
    }

    const renderItem = ({ item }) => {
        const hasFailed = failedImages[item._id] || !item.imageUrl;

        if (hasFailed) {
            return <FallbackBannerCard />;
        }

        let imageUrl = '';
        if (item.imageUrl) {
            imageUrl = item.imageUrl.startsWith('http') ? item.imageUrl : `${BASE_URL}${item.imageUrl}`;
        }
        const imageSource = { uri: imageUrl };

        return (
            <View style={styles.adCard}>
                <Image
                    source={imageSource}
                    style={styles.adImage}
                    resizeMode="contain"
                    onError={() => {
                        setFailedImages(prev => ({ ...prev, [item._id]: true }));
                    }}
                />
            </View>
        );
    };

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
        height: BANNER_HEIGHT + 24,
    },
    listContent: {
        paddingHorizontal: 0,
    },
    adCard: {
        width: SLIDE_WIDTH,
        height: BANNER_HEIGHT,
        marginHorizontal: 5,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1E1E1E',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.25)'
    },
    adImage: {
        width: '100%',
        height: '100%',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFD700',
        marginHorizontal: 4,
    },
    // Fallback banner styles (Light Theme)
    fallbackCard: {
        width: SLIDE_WIDTH,
        height: BANNER_HEIGHT,
        marginHorizontal: 5,
        borderRadius: 20,
        backgroundColor: '#FFFDF7',
        borderWidth: 1.5,
        borderColor: '#D4AF37',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
    },
    fallbackLeft: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '38%',
    },
    fallbackLogo: {
        width: 48,
        height: 48,
        marginBottom: 6,
    },
    fallbackShopName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#7A4300',
        letterSpacing: 1.5,
        textAlign: 'center',
    },
    fallbackVerticalLine: {
        width: 1,
        height: '75%',
        backgroundColor: '#EAD99B',
        marginHorizontal: 10,
    },
    fallbackRight: {
        flex: 1,
        justifyContent: 'center',
    },
    fallbackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 7,
    },
    fallbackIconBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#F5E8C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    fallbackText: {
        fontSize: 11.5,
        color: '#1E1E1E',
        fontWeight: '600',
        flex: 1,
    }
});

export default AdBanner;
