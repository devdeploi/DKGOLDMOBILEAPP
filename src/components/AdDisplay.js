import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Image,
    TouchableOpacity,
    Dimensions,
    Linking,
    Animated,
    ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import SchoolHubAd from './SchoolHubAd';
import QuickproAd from './QuickproAd';
import { BASE_URL } from '../constants/api';

const { width, height } = Dimensions.get('window');

const AdDisplay = ({ ads, visible: initialVisible = true, paused = false, userRole = 'user' }) => {
    const [isVisible, setIsVisible] = useState(initialVisible);
    const [lastShownMap, setLastShownMap] = useState({});
    // Ad State
    const [activeAd, setActiveAd] = useState(null);
    const [adImages, setAdImages] = useState([]);
    const [secondsLeft, setSecondsLeft] = useState(5);
    const [canClose, setCanClose] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);

    const progress = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef(null);

    // Global Cooldown State - Initialize to now so ads don't show instantly on login
    const [lastGlobalShowTime, setLastGlobalShowTime] = useState(Date.now());

    // Initial Load & Frequency Logic
    const savedCallback = useRef();

    useEffect(() => {
        savedCallback.current = checkAndDisplayAd;
    });

    useEffect(() => {
        if (ads && ads.length > 0) {
            // Seed lastShownMap with 0 so ads can show immediately if due
            setLastShownMap(prev => {
                const updated = { ...prev };
                let modified = false;
                ads.forEach(ad => {
                    if (updated[ad._id] === undefined) {
                        updated[ad._id] = 0;
                        modified = true;
                    }
                });
                return modified ? updated : prev;
            });

            // Set up frequency checker interval (every minute)
            const tick = () => {
                if (savedCallback.current) {
                    savedCallback.current();
                }
            };

            // Run tick immediately when ads array updates
            tick();

            const frequencyTimer = setInterval(tick, 60000);
            return () => clearInterval(frequencyTimer);
        }
    }, [ads]);

    const checkAndDisplayAd = () => {
        // If already showing an ad, don't interrupt
        if (isVisible && activeAd) return;

        // If paused, don't show
        if (paused) return;

        const now = Date.now();

        // Global Cooldown Check (15 minutes between ANY ads)
        const GLOBAL_COOLDOWN = 15 * 60 * 1000;
        if (now - lastGlobalShowTime < GLOBAL_COOLDOWN) {
            return;
        }

        const hasMerchantAd = ads.some(ad => !ad.isBrandAd);
        console.log("AdDisplay: Loaded Ads:", ads.length, "Has Merchant Ad:", hasMerchantAd);
        // Find all ads that are due
        const dueAds = ads.filter(ad => {
            // If the user is a merchant, ONLY show brand banners
            if (userRole === 'merchant' && !ad.isBrandAd) {
                return false;
            }

            // If there's a merchant ad available and user is 'user', DO NOT show brand ads
            if (userRole === 'user' && hasMerchantAd && ad.isBrandAd) {
                return false;
            }

            const lastShown = lastShownMap[ad._id] || 0;
            // Enforce default 15 mins frequency or use ad specific frequency
            const adFreq = ad.displayFrequency ? ad.displayFrequency : 15;
            const frequency = adFreq * 60 * 1000;
            return (now - lastShown) >= frequency;
        });

        // Sort to prioritize Merchant Ads, then by Least Recently Shown
        dueAds.sort((a, b) => {
            // Give Priority to non-brand ads (Merchant Ads)
            if (a.isBrandAd && !b.isBrandAd) return 1;
            if (!a.isBrandAd && b.isBrandAd) return -1;

            // If both are the same type, sort by least recently shown
            const lastShownA = lastShownMap[a._id] || 0;
            const lastShownB = lastShownMap[b._id] || 0;
            return lastShownA - lastShownB;
        });

        const dueAd = dueAds.length > 0 ? dueAds[0] : null;

        if (dueAd) {
            setActiveAd(dueAd);
            prepareAdImages(dueAd);
            setIsVisible(true);

            // Update last shown for this specific ad AND the global timer
            setLastShownMap(prev => ({
                ...prev,
                [dueAd._id]: now
            }));
            setLastGlobalShowTime(now);
        }
    };

    const prepareAdImages = (ad) => {
        // Only needed for Merchant Ads
        if (!ad.isBrandAd) {
            let images = [];
            if (ad.imageUrls && ad.imageUrls.length > 0) {
                images = ad.imageUrls
                    .filter(url => typeof url === 'string' && url.trim() !== '')
                    .map(url => ({ uri: `${BASE_URL}${url}` }));
            } else if (ad.imageUrl && typeof ad.imageUrl === 'string' && ad.imageUrl.trim() !== '') {
                images = [{ uri: `${BASE_URL}${ad.imageUrl}` }];
            }
            setAdImages(images);
        }
    };

    // Auto-play Carousel Logic (Only for Merchant Ads)
    useEffect(() => {
        if (isVisible && activeAd && !activeAd.isBrandAd) {
            const autoPlayTimer = setInterval(() => {
                setActiveSlide((prev) => {
                    const next = (prev + 1) % adImages.length;
                    scrollRef.current?.scrollTo({ x: next * width, animated: true });
                    return next;
                });
            }, 3000);

            return () => clearInterval(autoPlayTimer);
        }
    }, [isVisible, activeAd, adImages]);

    // Timer & Progress Logic (Only for Merchant Ads)
    useEffect(() => {
        if (isVisible && activeAd && !activeAd.isBrandAd) {
            setSecondsLeft(5);
            setCanClose(false);
            progress.setValue(0);
            setActiveSlide(0);

            // Start countdown
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

            // Animate progress
            Animated.timing(progress, {
                toValue: 1,
                duration: 5000,
                useNativeDriver: false
            }).start();

            return () => {
                clearInterval(timer);
                progress.stopAnimation();
            };
        }
    }, [isVisible, activeAd]);


    const handleClose = () => {
        setIsVisible(false);
        setActiveAd(null);
    };

    const handleAdPress = () => {
        if (activeAd && activeAd.link) {
            Linking.openURL(activeAd.link).catch(err => console.error("Couldn't load page", err));
        }
    };

    // Determine the variant based on user role
    const variant = userRole === 'merchant' ? 'banner' : 'full';



    if (!isVisible || !activeAd) return null;

    if (activeAd.isBrandAd) {
        if (activeAd._id === 'brand_schoolhub') {
            return <SchoolHubAd visible={isVisible} onClose={handleClose} variant="banner" />;
        }
        if (activeAd._id === 'brand_quickpro') {
            return <QuickproAd visible={isVisible} onClose={handleClose} variant="banner" />;
        }
        return null;
    }

    // Default: Dynamic Merchant Ad UI (Same blocking style as SchoolHubAd)
    return (
        <Modal
            animationType="fade"
            transparent={false}
            visible={isVisible}
            onRequestClose={() => {
                if (canClose) handleClose();
            }}
        >
            <View style={styles.container}>
                {/* Header Timeline */}
                <View style={styles.headerContainer}>
                    <View style={styles.progressBarContainer}>
                        <Animated.View
                            style={[
                                styles.progressBar,
                                {
                                    width: progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%']
                                    })
                                }
                            ]}
                        />
                    </View>

                    <View style={styles.topActions}>
                        <View style={styles.sponsoredTag}>
                            <Text style={styles.sponsoredText}>
                                Partner Ad
                            </Text>
                        </View>

                        <View style={styles.timerBadge}>
                            {canClose ? (
                                <TouchableOpacity onPress={handleClose} style={styles.closeButtonHitSlop}>
                                    <Icon name="times" size={16} color="#fff" />
                                </TouchableOpacity>
                            ) : (
                                <Text style={styles.timerText}>{secondsLeft}s</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Main Scrollable Content */}
                <ScrollView
                    ref={scrollRef}
                    pagingEnabled
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    // onMomentumScrollEnd={onMomentumScrollEnd}
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                >
                    {adImages.map((img, index) => (
                        <TouchableOpacity
                            key={index}
                            activeOpacity={1}
                            style={styles.slide}
                            onPress={handleAdPress}
                        >
                            {/* Blurred Background Layer (Optional based on performance) */}
                            <Image
                                source={img}
                                style={[StyleSheet.absoluteFill, { width: width, height: height, zIndex: -1, opacity: 0.5 }]}
                                resizeMode="cover"
                                blurRadius={50}
                            />
                            {/* Background Dimmer */}
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', zIndex: -2 }]} />
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: -1 }]} />

                            {/* Main Foreground Image */}
                            <Image
                                source={img}
                                style={styles.adImage}
                                resizeMode="contain"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.8)']}
                                style={styles.gradientOverlay}
                            />
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Bottom Pagination & CTA */}
                <View style={styles.footerContainer}>
                    {/* Pagination Dots */}
                    {adImages.length > 1 && (
                        <View style={styles.paginationContainer}>
                            {adImages.map((_, i) => (
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

                    <View style={styles.textContainer}>
                        {activeAd.merchant && activeAd.merchant.shopLogo ? (
                            <Image
                                source={{ uri: `${BASE_URL}${activeAd.merchant.shopLogo}` }}
                                style={styles.brandLogo}
                            />
                        ) : null}

                        <View>
                            <Text style={styles.adTitle}>
                                {activeAd.title || (activeAd.merchant ? activeAd.merchant.name : 'Partner Offer')}
                            </Text>
                            <Text style={styles.adSubtitle}>
                                {activeAd.description || 'Check out our latest offers'}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={handleAdPress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.ctaText}>View Offer</Text>
                        <Icon name="arrow-right" size={14} color="#000" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingTop: 50,
        paddingHorizontal: 16,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        marginBottom: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#F59E0B',
    },
    topActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sponsoredTag: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center'
    },
    sponsoredText: {
        color: '#ccc',
        fontSize: 12,
    },
    timerBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    closeButtonHitSlop: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center'
    },
    timerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        // No padding here to allow full screen
    },
    slide: {
        width: width,
        height: height,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    adImage: {
        width: width,
        height: height,
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '40%',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 40,
        zIndex: 90,
    },
    paginationContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginRight: 6,
    },
    activeDot: {
        width: 24,
        backgroundColor: '#F59E0B',
    },
    textContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    brandLogo: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#fff'
    },
    adTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    adSubtitle: {
        color: '#ddd',
        fontSize: 14,
    },
    ctaButton: {
        backgroundColor: '#F59E0B',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    ctaText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default AdDisplay;
