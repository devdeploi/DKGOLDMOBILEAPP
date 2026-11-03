import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Image,
    TouchableOpacity,
    Dimensions,
    FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { BASE_URL } from '../constants/api';

const { width, height } = Dimensions.get('window');
const MAX_CARD_WIDTH = Math.min(width - 48, 360);
const MAX_CARD_HEIGHT = Math.min(height * 0.72, 500);

export const POPUP_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
const COOLDOWN_STORAGE_KEY = '@dkgold_last_popup_ad_shown_time';

// Module-level timestamp for instant, synchronous checks across component re-renders and tab switches
let lastPopupShownTime = 0;

// Read cached timestamp from AsyncStorage at module load
AsyncStorage.getItem(COOLDOWN_STORAGE_KEY)
    .then((val) => {
        if (val) {
            const parsed = parseInt(val, 10);
            if (!isNaN(parsed) && parsed > lastPopupShownTime) {
                lastPopupShownTime = parsed;
            }
        }
    })
    .catch(() => {});

export const canShowPopupAd = () => {
    const now = Date.now();
    return (now - lastPopupShownTime) >= POPUP_COOLDOWN_MS;
};

export const markPopupAdShown = () => {
    const now = Date.now();
    lastPopupShownTime = now;
    AsyncStorage.setItem(COOLDOWN_STORAGE_KEY, String(now)).catch(() => {});
};

// Helper to check if a popup ad is enabled/active
const isAdActive = (ad) => {
    if (!ad) return false;

    // Check status flags (enabled/disabled)
    if (ad.status && ad.status.toLowerCase() !== 'active') return false;
    if (ad.isActive === false) return false;

    return true;
};

// Reusable Fallback Card with DK Gold Store Information (Light Theme)
export const FallbackAdCard = ({ width: cardW = MAX_CARD_WIDTH, height: cardH = 340 }) => (
    <View style={[styles.fallbackContainer, { width: cardW, minHeight: cardH }]}>
        <View style={styles.fallbackHeader}>
            <Image
                source={require('../assets/logodk.png')}
                style={styles.fallbackLogo}
                resizeMode="contain"
            />
            <Text style={styles.fallbackShopName}>DK GOLD</Text>
        </View>

        <View style={styles.fallbackDivider} />

        <View style={styles.fallbackDetails}>
            <View style={styles.fallbackRow}>
                <View style={styles.fallbackIconWrap}>
                    <Icon name="phone-alt" size={13} color="#915200" />
                </View>
                <View style={styles.fallbackCol}>
                    <Text style={styles.fallbackLabel}>Phone Number</Text>
                    <Text style={styles.fallbackValue}>9786112675</Text>
                </View>
            </View>

            <View style={styles.fallbackRow}>
                <View style={styles.fallbackIconWrap}>
                    <Icon name="envelope" size={13} color="#915200" />
                </View>
                <View style={styles.fallbackCol}>
                    <Text style={styles.fallbackLabel}>Email Address</Text>
                    <Text style={styles.fallbackValue}>dkgoldambur@gmail.com</Text>
                </View>
            </View>

            <View style={styles.fallbackRow}>
                <View style={styles.fallbackIconWrap}>
                    <Icon name="map-marker-alt" size={14} color="#915200" />
                </View>
                <View style={styles.fallbackCol}>
                    <Text style={styles.fallbackLabel}>Address</Text>
                    <Text style={styles.fallbackValue} numberOfLines={2}>
                        13/35, Mungil Mandi StreetAmbur - 635802
                    </Text>
                </View>
            </View>
        </View>
    </View>
);

const AdPopup = ({ ads = [], visible: externalVisible, onClose: externalOnClose }) => {
    const [cooldownAllowed, setCooldownAllowed] = useState(canShowPopupAd);
    const [modalVisible, setModalVisible] = useState(true);
    const [secondsLeft, setSecondsLeft] = useState(3);
    const [canClose, setCanClose] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);
    const [failedImages, setFailedImages] = useState({});

    // Verify cooldown on mount and notify parent if on cooldown
    useEffect(() => {
        if (!canShowPopupAd()) {
            setCooldownAllowed(false);
            if (externalOnClose) externalOnClose();
            return;
        }

        // Check stored timestamp from AsyncStorage
        AsyncStorage.getItem(COOLDOWN_STORAGE_KEY).then((val) => {
            if (val) {
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed)) {
                    lastPopupShownTime = Math.max(lastPopupShownTime, parsed);
                    if (!canShowPopupAd()) {
                        setCooldownAllowed(false);
                        if (externalOnClose) externalOnClose();
                    }
                }
            }
        }).catch(() => {});
    }, []);

    // Dynamic card dimensions so the popup card fits the image perfectly
    const [cardDimensions, setCardDimensions] = useState({
        width: MAX_CARD_WIDTH,
        height: Math.round(MAX_CARD_WIDTH * 1.25)
    });

    const flatListRef = useRef(null);

    // Filter out expired ads and brand ads, extracting only valid popup campaign creatives
    const validAds = useMemo(() => {
        if (!ads || !Array.isArray(ads) || ads.length === 0) return [];

        // Strictly popup ads only - banner ads and brand banners must NEVER appear in popup dialog
        const popupAds = ads.filter(ad => !ad.isBrandAd && ad.adType === 'popup' && isAdActive(ad));

        if (popupAds.length === 0) return [];

        const flattened = [];
        popupAds.forEach((ad, adIdx) => {
            if (ad.imageUrls && Array.isArray(ad.imageUrls) && ad.imageUrls.length > 0) {
                ad.imageUrls.forEach((imgUrl, imgIdx) => {
                    if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
                        flattened.push({
                            ...ad,
                            imageUrl: imgUrl.trim(),
                            _id: ad._id ? `${ad._id}_img_${imgIdx}` : `ad_${adIdx}_img_${imgIdx}`
                        });
                    }
                });
            } else if (ad.imageUrl && typeof ad.imageUrl === 'string' && ad.imageUrl.trim()) {
                flattened.push({
                    ...ad,
                    imageUrl: ad.imageUrl.trim(),
                    _id: ad._id ? `${ad._id}` : `ad_${adIdx}`
                });
            }
        });
        return flattened;
    }, [ads]);

    const currentAd = validAds[activeSlide] || validAds[0];

    // Measure active image to dynamically fit popup container
    useEffect(() => {
        if (!currentAd) return;

        const imgPath = currentAd.imageUrl;
        if (!imgPath || failedImages[currentAd._id]) {
            setCardDimensions({
                width: MAX_CARD_WIDTH,
                height: 340
            });
            return;
        }

        const uri = imgPath.startsWith('http') ? imgPath : `${BASE_URL}${imgPath}`;

        Image.getSize(
            uri,
            (origWidth, origHeight) => {
                if (origWidth > 0 && origHeight > 0) {
                    const aspect = origWidth / origHeight;
                    let fitWidth = MAX_CARD_WIDTH;
                    let fitHeight = fitWidth / aspect;

                    if (fitHeight > MAX_CARD_HEIGHT) {
                        fitHeight = MAX_CARD_HEIGHT;
                        fitWidth = fitHeight * aspect;
                    }

                    setCardDimensions({
                        width: Math.round(fitWidth),
                        height: Math.round(fitHeight)
                    });
                }
            },
            () => {
                // If fetching image dimensions fails, mark as failed image
                setFailedImages(prev => ({ ...prev, [currentAd._id]: true }));
                setCardDimensions({
                    width: MAX_CARD_WIDTH,
                    height: 340
                });
            }
        );
    }, [currentAd, failedImages]);

    // Popup is visible ONLY if cooldown allows and active ads exist
    const isVisible = (externalVisible !== undefined
        ? externalVisible && validAds.length > 0
        : modalVisible && validAds.length > 0) && cooldownAllowed;

    // Reset 3-second timer and mark cooldown when popup opens on launch
    useEffect(() => {
        if (!isVisible) return;

        // Record cooldown timestamp so subsequent renders or tab switches within 10 min won't popup
        markPopupAdShown();

        setSecondsLeft(3);
        setCanClose(false);
        setActiveSlide(0);

        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanClose(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isVisible]);

    // Auto-slide carousel if multiple images exist
    useEffect(() => {
        if (isVisible && validAds.length > 1) {
            const slideTimer = setInterval(() => {
                setActiveSlide((prev) => {
                    const next = (prev + 1) % validAds.length;
                    flatListRef.current?.scrollToIndex({
                        index: next,
                        animated: true
                    });
                    return next;
                });
            }, 4000);

            return () => clearInterval(slideTimer);
        }
    }, [isVisible, validAds.length]);

    const handleClose = () => {
        if (!canClose) return;
        setModalVisible(false);
        setCooldownAllowed(false);
        markPopupAdShown();
        if (externalOnClose) {
            externalOnClose();
        }
    };

    if (!isVisible || validAds.length === 0) {
        return null;
    }

    const renderAdSlide = ({ item }) => {
        const hasFailed = failedImages[item._id] || !item.imageUrl;

        if (hasFailed) {
            return (
                <View style={[styles.slideCard, { width: cardDimensions.width, height: cardDimensions.height }]}>
                    <FallbackAdCard width={cardDimensions.width} height={cardDimensions.height} />
                </View>
            );
        }

        let imageUrl = '';
        if (item.imageUrl) {
            imageUrl = item.imageUrl.startsWith('http') ? item.imageUrl : `${BASE_URL}${item.imageUrl}`;
        }
        const imageSource = { uri: imageUrl };

        return (
            <View
                style={[styles.slideCard, { width: cardDimensions.width, height: cardDimensions.height }]}
            >
                <Image
                    source={imageSource}
                    style={{
                        width: cardDimensions.width,
                        height: cardDimensions.height
                    }}
                    resizeMode="contain"
                    onError={() => {
                        setFailedImages(prev => ({ ...prev, [item._id]: true }));
                    }}
                />
            </View>
        );
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={handleClose}
        >
            <View style={styles.backdrop}>
                <View style={[styles.popupCard, { width: cardDimensions.width, height: cardDimensions.height }]}>
                    {/* Floating Close / 3-sec Timer Button on Top-Right */}
                    <View style={styles.closeButtonContainer}>
                        {canClose ? (
                            <TouchableOpacity
                                style={styles.closeButtonActive}
                                onPress={handleClose}
                                activeOpacity={0.7}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Icon name="times" size={14} color="#ffffff" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.timerBadge}>
                                <Text style={styles.timerText}>{secondsLeft}s</Text>
                            </View>
                        )}
                    </View>

                    {/* Image Slide Carousel (Fitted Image or Fallback) */}
                    <FlatList
                        ref={flatListRef}
                        data={validAds}
                        renderItem={renderAdSlide}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={cardDimensions.width}
                        decelerationRate="fast"
                        onMomentumScrollEnd={(e) => {
                            const newIndex = Math.round(e.nativeEvent.contentOffset.x / cardDimensions.width);
                            setActiveSlide(newIndex);
                        }}
                    />

                    {/* Subtle Pagination Dots (only if multiple images) */}
                    {validAds.length > 1 && (
                        <View style={styles.dotsOverlay}>
                            {validAds.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        activeSlide === i && styles.activeDot
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    popupCard: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 15,
        position: 'relative'
    },
    closeButtonContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 99
    },
    closeButtonActive: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#ffffff'
    },
    timerBadge: {
        minWidth: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.8)'
    },
    timerText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold'
    },
    slideCard: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 20
    },
    dotsOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 3
    },
    activeDot: {
        width: 16,
        backgroundColor: '#FFD700',
        borderRadius: 3
    },
    // Fallback Card Styles (Light Luxury Theme)
    fallbackContainer: {
        backgroundColor: '#FFFDF7',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#D4AF37',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10
    },
    fallbackHeader: {
        alignItems: 'center',
        marginBottom: 4
    },
    fallbackLogo: {
        width: 58,
        height: 58,
        marginBottom: 6
    },
    fallbackShopName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#7A4300',
        letterSpacing: 2
    },
    fallbackDivider: {
        width: '90%',
        height: 1.5,
        backgroundColor: '#EAD99B',
        marginVertical: 14
    },
    fallbackDetails: {
        width: '100%',
        paddingHorizontal: 4
    },
    fallbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    fallbackIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5E8C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E2D099'
    },
    fallbackCol: {
        flex: 1
    },
    fallbackLabel: {
        fontSize: 10.5,
        color: '#8A7558',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    fallbackValue: {
        fontSize: 13.5,
        color: '#1E1E1E',
        fontWeight: '700',
        marginTop: 1
    }
});

export default AdPopup;
