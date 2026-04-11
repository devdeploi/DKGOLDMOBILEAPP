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

const { width, height } = Dimensions.get('window');

// Import images statically
const adImages = [
    require('../../public/assests/SchoolHub1.png'),
    require('../../public/assests/SchoolHub2.png'),
    require('../../public/assests/SchoolHub3.png'),
    require('../../public/assests/SchoolHub4.png')
];

const SchoolHubAd = ({ visible, onClose, variant = 'full' }) => {
    const [secondsLeft, setSecondsLeft] = useState(5);
    const [canClose, setCanClose] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);
    const progress = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef(null);

    // Auto-play Carousel Logic
    useEffect(() => {
        if (visible && variant === 'full') {
            const autoPlayTimer = setInterval(() => {
                setActiveSlide((prev) => {
                    const next = (prev + 1) % adImages.length;
                    scrollRef.current?.scrollTo({ x: next * width, animated: true });
                    return next;
                });
            }, 3000); // Change slide every 3 seconds

            return () => clearInterval(autoPlayTimer);
        }
    }, [visible, variant]);

    useEffect(() => {
        if (visible && variant === 'full') {
            setSecondsLeft(5);
            setCanClose(false);
            progress.setValue(0);
            setActiveSlide(0);

            // Start countdown timer
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

            // Animate progress bar (Timeline)
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
    }, [visible, variant, progress]);

    const handleAdPress = () => {
        Linking.openURL('https://www.safprotech.com/Productsview');
    };

    const onMomentumScrollEnd = (e) => {
        const page = Math.round(e.nativeEvent.contentOffset.x / width);
        setActiveSlide(page);
    };

    if (!visible) return null;

    // --- BANNER VARIANT ---
    if (variant === 'banner') {
        return (
            <View style={styles.bannerContainer}>
                <TouchableOpacity style={styles.bannerContent} onPress={handleAdPress} activeOpacity={0.9}>
                    <Image
                        source={adImages[0]}
                        style={styles.bannerImage}
                        resizeMode="cover"
                    />
                    <View style={styles.bannerTextContainer}>
                        <View style={styles.bannerHeader}>
                            <Image
                                source={require('../../public/assests/SchoolHubLogo.png')}
                                style={{ width: 12, height: 12, marginRight: 4 }}
                                resizeMode="contain"
                            />
                            <Text style={styles.bannerSponsored}>Sponsored</Text>
                        </View>
                        <Text style={styles.bannerTitle}>SchoolHub</Text>
                        <Text style={styles.bannerSubtitle}>Smart Management for Schools</Text>
                    </View>
                    <Icon name="chevron-right" size={16} color="#333" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.bannerClose} onPress={onClose}>
                    <Icon name="times" size={10} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={visible}
            onRequestClose={() => {
                if (canClose) onClose();
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

                            <Text style={styles.sponsoredText}>Sponsored</Text>
                        </View>

                        <View style={styles.timerBadge}>
                            {canClose ? (
                                <TouchableOpacity onPress={onClose} style={styles.closeButtonHitSlop}>
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
                    onMomentumScrollEnd={onMomentumScrollEnd}
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                >
                    {adImages.map((img, index) => (
                        <TouchableOpacity
                            key={index}
                            activeOpacity={0.9}
                            style={styles.slide}
                            onPress={handleAdPress}
                        >
                            {/* Blurred Background Layer */}
                            <Image
                                source={img}
                                style={[StyleSheet.absoluteFill, { width: width, height: height, zIndex: -1 }]}
                                resizeMode="cover"
                                blurRadius={50}
                            />
                            {/* Background Dimmer */}
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

                    <View style={styles.textContainer}>
                        <Image
                            source={require('../../public/assests/SchoolHubLogo.png')}
                            style={styles.brandLogo}
                            resizeMode="contain"
                        />
                        <View>
                            <Text style={styles.adTitle}>SchoolHub</Text>
                            <Text style={styles.adSubtitle}>Smart Management for Modern Schools</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={handleAdPress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.ctaText}>Learn More</Text>
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
    // Banner Styles
    bannerContainer: {
        position: 'absolute',
        top: 50, // Moved to top (navbar area)
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 1000,
        borderWidth: 1,
        borderColor: '#eee',
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    bannerImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2
    },
    bannerSponsored: {
        fontSize: 10,
        color: '#666',
        fontWeight: '500'
    },
    bannerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
    },
    bannerSubtitle: {
        fontSize: 12,
        color: '#666'
    },
    bannerClose: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#333',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#fff'
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

export default SchoolHubAd;
