/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    ImageBackground,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal,
    TextInput,
    ActivityIndicator,
    Platform,
    ScrollView,
    Dimensions,
    Alert,
    Animated,
    PanResponder,
    Switch
} from 'react-native';
import { COLORS } from '../styles/theme';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import { APIURL, BASE_URL } from '../constants/api';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import ViewShot from 'react-native-view-shot';
import Slider from '@react-native-community/slider';
import CustomAlert from './CustomAlert';

const { width } = Dimensions.get('window');
const BANNER_CROP_WIDTH = Math.min(width - 48, 340);
const BANNER_CROP_HEIGHT = Math.round((BANNER_CROP_WIDTH * 9) / 16);
const POPUP_CROP_WIDTH = Math.min(width - 48, 300);
const POPUP_CROP_HEIGHT = Math.round((POPUP_CROP_WIDTH * 5) / 4);

const SkeletonAdCard = () => {
    const pulseAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.9,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.5,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [pulseAnim]);

    return (
        <View style={[styles.activeCard, { borderColor: '#E2E8F0', borderWidth: 1 }]}>
            <View style={styles.cardHeader}>
                <Animated.View style={{ width: 100, height: 16, backgroundColor: '#F1F5F9', borderRadius: 4, opacity: pulseAnim }} />
                <Animated.View style={{ width: 80, height: 22, backgroundColor: '#F1F5F9', borderRadius: 8, opacity: pulseAnim }} />
            </View>

            <View style={{ padding: 20 }}>
                <Animated.View style={[styles.previewContainer, { backgroundColor: '#F8FAFC', borderRadius: 16, opacity: pulseAnim, height: 180 }]} />
            </View>

            <View style={[styles.contentBlock, { paddingTop: 0 }]}>
                <Animated.View style={{ width: '70%', height: 24, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 12, opacity: pulseAnim }} />
                <Animated.View style={{ width: '100%', height: 14, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 8, opacity: pulseAnim }} />
                <Animated.View style={{ width: '85%', height: 14, backgroundColor: '#F1F5F9', borderRadius: 4, opacity: pulseAnim }} />
            </View>

            <View style={[styles.infoGrid, { borderBottomWidth: 0 }]}>
                <View style={styles.infoItem}>
                    <Animated.View style={{ width: 60, height: 12, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 6, opacity: pulseAnim }} />
                    <Animated.View style={{ width: 80, height: 16, backgroundColor: '#F1F5F9', borderRadius: 4, opacity: pulseAnim }} />
                </View>
                <View style={styles.infoItem}>
                    <Animated.View style={{ width: 60, height: 12, backgroundColor: '#F1F5F9', borderRadius: 4, marginBottom: 6, opacity: pulseAnim }} />
                    <Animated.View style={{ width: 80, height: 16, backgroundColor: '#F1F5F9', borderRadius: 4, opacity: pulseAnim }} />
                </View>
            </View>

            <View style={[styles.actionRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                {[1, 2, 3].map(i => (
                    <Animated.View key={i} style={{ alignItems: 'center', opacity: pulseAnim }}>
                        <View style={[styles.iconBox, { backgroundColor: '#F8FAFC' }]} />
                        <View style={{ width: 40, height: 10, backgroundColor: '#F1F5F9', borderRadius: 4 }} />
                    </Animated.View>
                ))}
            </View>
        </View>
    );
};

const formatDateToIndian = (dateObj) => {
    if (!dateObj) return '';
    const date = new Date(dateObj);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const AdManager = ({ user, initialType = 'banner' }) => {
    const [selectedType, setSelectedType] = useState(initialType);
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (initialType) {
            setSelectedType(initialType);
        }
    }, [initialType]);

    const isPopup = selectedType === 'popup';
    const CROP_BOX_WIDTH = isPopup ? POPUP_CROP_WIDTH : BANNER_CROP_WIDTH;
    const CROP_BOX_HEIGHT = isPopup ? POPUP_CROP_HEIGHT : BANNER_CROP_HEIGHT;

    // Filter ads by selected type
    const filteredAds = useMemo(() => {
        if (!ads || !Array.isArray(ads)) return [];
        return ads.filter(a => (a.adType || 'banner') === selectedType);
    }, [ads, selectedType]);

    const activeAd = filteredAds.length > 0 ? filteredAds[0] : null;

    // Alert State
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        buttons: []
    });

    // Form State
    const [editingAd, setEditingAd] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [link, setLink] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const [isAdActiveToggle, setIsAdActiveToggle] = useState(true);

    // Date Picker State
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Crop State & Gesture Refs
    const [cropModalVisible, setCropModalVisible] = useState(false);
    const [cropTarget, setCropTarget] = useState(null); // { type: 'new' | 'existing', index: number, uri: string, width?: number, height?: number }
    const [imageNaturalSize, setImageNaturalSize] = useState({ width: CROP_BOX_WIDTH, height: CROP_BOX_HEIGHT });
    const [cropScale, setCropScale] = useState(1);
    const [fitMode, setFitMode] = useState('cover'); // 'cover' or 'contain'
    const [isCropping, setIsCropping] = useState(false);
    const cropPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const cropPanPos = useRef({ x: 0, y: 0 });
    const cropPanOffset = useRef({ x: 0, y: 0 });
    const cropViewShotRef = useRef(null);

    const cropPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                cropPanOffset.current = {
                    x: cropPanPos.current.x,
                    y: cropPanPos.current.y
                };
            },
            onPanResponderMove: (e, gestureState) => {
                const nextX = Math.round(cropPanOffset.current.x + gestureState.dx);
                const nextY = Math.round(cropPanOffset.current.y + gestureState.dy);
                cropPanPos.current = { x: nextX, y: nextY };
                cropPan.setValue({ x: nextX, y: nextY });
            },
            onPanResponderRelease: () => {}
        })
    ).current;

    const handleOpenCrop = (target) => {
        setCropTarget(target);
        setCropScale(1);
        setFitMode('cover');

        const setupSizes = (origW, origH) => {
            const w = origW || CROP_BOX_WIDTH;
            const h = origH || CROP_BOX_HEIGHT;
            setImageNaturalSize({ width: w, height: h });
            const s = Math.max(CROP_BOX_WIDTH / w, CROP_BOX_HEIGHT / h);
            const rW = Math.round(w * s);
            const rH = Math.round(h * s);
            // If image is vertical (taller than 16:9), start at top (y: 0) to show head/title!
            // If horizontal (wider than 16:9), center horizontally
            const initX = rW > CROP_BOX_WIDTH ? Math.round((CROP_BOX_WIDTH - rW) / 2) : 0;
            const initY = 0; // Always start at top so head/title isn't cut off!
            cropPanPos.current = { x: initX, y: initY };
            cropPanOffset.current = { x: initX, y: initY };
            cropPan.setValue({ x: initX, y: initY });
            setCropModalVisible(true);
        };

        if (target.width && target.height) {
            setupSizes(target.width, target.height);
        } else if (target.uri) {
            Image.getSize(
                target.uri,
                (w, h) => setupSizes(w, h),
                () => setupSizes(CROP_BOX_WIDTH, CROP_BOX_HEIGHT)
            );
        } else {
            setupSizes(CROP_BOX_WIDTH, CROP_BOX_HEIGHT);
        }
    };

    const handleApplyCrop = async () => {
        if (!cropViewShotRef.current || !cropTarget) return;
        setIsCropping(true);
        try {
            const croppedUri = await cropViewShotRef.current.capture();
            if (cropTarget.type === 'new') {
                const updated = [...imageFiles];
                updated[cropTarget.index] = {
                    ...updated[cropTarget.index],
                    uri: croppedUri,
                    fileName: `cropped_ad_${Date.now()}.jpg`
                };
                setImageFiles(updated);
            } else if (cropTarget.type === 'existing') {
                const updatedExisting = existingImages.filter((_, i) => i !== cropTarget.index);
                setExistingImages(updatedExisting);
                setImageFiles(prev => [
                    ...prev,
                    {
                        uri: croppedUri,
                        type: 'image/jpeg',
                        fileName: `cropped_ad_${Date.now()}.jpg`
                    }
                ]);
            }
            setCropModalVisible(false);
            setCropTarget(null);
            showAlert("Image Cropped", `Creative aligned to standard ${isPopup ? '4:5 popup' : '16:9 banner'} format for user screens.`, "success");
        } catch (err) {
            console.error("Crop error:", err);
            showAlert("Crop Failed", "Could not crop image. Please try again.", "danger");
        } finally {
            setIsCropping(false);
        }
    };

    const fadeAnim = useRef(new Animated.Value(0)).current;

    const isCover = fitMode === 'cover';
    const natW = imageNaturalSize.width || CROP_BOX_WIDTH;
    const natH = imageNaturalSize.height || CROP_BOX_HEIGHT;
    const coverScale = Math.max(CROP_BOX_WIDTH / natW, CROP_BOX_HEIGHT / natH);
    const containScale = Math.min(CROP_BOX_WIDTH / natW, CROP_BOX_HEIGHT / natH);
    const baseScale = isCover ? coverScale : containScale;
    const renderedWidth = Math.max(1, Math.round(natW * baseScale));
    const renderedHeight = Math.max(1, Math.round(natH * baseScale));

    useEffect(() => {
        if (user) fetchAds();
    }, [user]);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [ads]);

    const showAlert = (title, message, type = 'info', buttons = []) => {
        setAlertConfig({ visible: true, title, message, type, buttons });
    };

    const fetchAds = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${APIURL}/ads/my-ads`, config);
            setAds(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleImagePick = async () => {
        const options = {
            mediaType: 'photo',
            quality: 0.9,
            selectionLimit: 5,
            maxWidth: 1920,
            maxHeight: 1080,
        };
        const result = await launchImageLibrary(options);
        if (result.assets && result.assets.length > 0) {
            if (result.assets.length + existingImages.length + imageFiles.length > 5) {
                showAlert("Limit Reached", "Max 5 images allowed total.", "warning");
                return;
            }
            const startIndex = imageFiles.length;
            const newFiles = [...imageFiles, ...result.assets];
            setImageFiles(newFiles);
            // If single image was selected, automatically open crop tool
            if (result.assets.length === 1) {
                handleOpenCrop({
                    type: 'new',
                    index: startIndex,
                    uri: result.assets[0].uri,
                    width: result.assets[0].width,
                    height: result.assets[0].height,
                });
            }
        }
    };

    const handleEditClick = (ad) => {
        if (!ad) {
            resetForm();
        } else {
            setEditingAd(ad);
            setLink(ad.link || '');
            setTitle(ad.title || '');
            setDescription(ad.description || '');
            setStartDate(ad.startDate ? new Date(ad.startDate) : new Date());
            setEndDate(ad.endDate ? new Date(ad.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
            setExistingImages(ad.imageUrls || (ad.imageUrl ? [ad.imageUrl] : []));
            setImageFiles([]);
            setIsAdActiveToggle(ad.isActive !== false && ad.status !== 'inactive');
        }
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingAd(null);
        setImageFiles([]);
        setExistingImages([]);
        setLink('');
        setTitle('');
        setDescription('');
        setStartDate(new Date());
        setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
        setIsAdActiveToggle(true);
        setCropTarget(null);
        setCropModalVisible(false);
    };

    // Upload single image helper with React Native OkHttp retry & connection close
    const uploadImageFile = async (file) => {
        const formData = new FormData();
        const uri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '');
        formData.append('image', {
            uri,
            type: file.type || 'image/jpeg',
            name: file.fileName || `ad_img_${Date.now()}.jpg`,
        });

        const uploadConfig = {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Connection': 'close',
            },
            timeout: 25000,
        };

        try {
            const res = await axios.post(`${APIURL}/upload`, formData, uploadConfig);
            return res.data;
        } catch (err) {
            console.log("Upload attempt 1 failed (RN socket bug), retrying...", err?.message);
            // Retry immediately, which resolves the React Native Android socket reuse issue
            const res = await axios.post(`${APIURL}/upload`, formData, uploadConfig);
            return res.data;
        }
    };

    const handleRemoveExistingImage = (index) => {
        const updated = existingImages.filter((_, i) => i !== index);
        setExistingImages(updated);
    };

    const handleRemoveNewImage = (index) => {
        const updated = imageFiles.filter((_, i) => i !== index);
        setImageFiles(updated);
    };

    const handleCreateOrUpdateAd = async () => {
        if (imageFiles.length === 0 && existingImages.length === 0) {
            showAlert("Required", "Please select at least one image", "warning");
            return;
        }

        setUploading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            let finalImageUrls = [...existingImages];

            if (imageFiles.length > 0) {
                const uploadedPaths = [];
                for (const file of imageFiles) {
                    const uploadedPath = await uploadImageFile(file);
                    if (uploadedPath && typeof uploadedPath === 'string') {
                        uploadedPaths.push(uploadedPath);
                    }
                }
                finalImageUrls = [...finalImageUrls, ...uploadedPaths];
            }

            const isTargetPopup = (editingAd ? editingAd.adType : selectedType) === 'popup';
            const adData = {
                imageUrls: finalImageUrls,
                link,
                title,
                description,
                startDate: isTargetPopup ? null : startDate,
                endDate: isTargetPopup ? null : endDate,
                displayFrequency: 15,
                adType: editingAd ? (editingAd.adType || selectedType) : selectedType,
                isActive: isTargetPopup ? isAdActiveToggle : (editingAd ? editingAd.isActive : true),
                status: isTargetPopup ? (isAdActiveToggle ? 'active' : 'inactive') : 'active'
            };

            if (editingAd) {
                await axios.put(`${APIURL}/ads/${editingAd._id}`, adData, config);
                showAlert("Success", `${isTargetPopup ? 'Popup' : 'Banner'} campaign updated successfully`, "success");
            } else {
                await axios.post(`${APIURL}/ads`, adData, config);
                showAlert("Success", `${isTargetPopup ? 'Popup' : 'Banner'} campaign launched successfully`, "success");
            }

            setShowModal(false);
            resetForm();
            fetchAds();
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.message || `Failed to ${editingAd ? 'update' : 'create'} ad`;
            showAlert("Error", errMsg, "error");
        } finally {
            setUploading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!activeAd) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const newIsActive = !activeAd.isActive;
            const updatedAds = ads.map(a => a._id === activeAd._id ? { ...a, isActive: newIsActive, status: newIsActive ? 'active' : 'inactive' } : a);
            setAds(updatedAds); // Optimistic

            await axios.patch(`${APIURL}/ads/${activeAd._id}/status`, { status: newIsActive ? 'active' : 'inactive' }, config);
            showAlert("Status Updated", `${isPopup ? 'Popup' : 'Banner'} is now ${newIsActive ? 'Enabled' : 'Disabled'}`, "success");
        } catch (err) {
            console.error(err);
            showAlert("Error", "Failed to update status", "error");
            fetchAds();
        }
    };

    const handleDelete = async () => {
        if (!activeAd) return;
        showAlert(
            `Delete ${isPopup ? 'Popup' : 'Banner'} Campaign`,
            "Are you sure you want to delete your active campaign? This cannot be undone.",
            "warning",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const config = { headers: { Authorization: `Bearer ${user.token}` } };
                            await axios.delete(`${APIURL}/ads/${activeAd._id}`, config);
                            setAds(prev => prev.filter(a => a._id !== activeAd._id));
                            showAlert("Success", "Campaign deleted successfully", "success");
                        } catch (err) {
                            console.error(err);
                            showAlert("Error", "Failed to delete ad", "error");
                        }
                    }
                }
            ]
        );
    };

    const handleStartDateConfirm = (selectedDate) => {
        setShowStartPicker(false);
        if (selectedDate) {
            setStartDate(selectedDate);
            if (selectedDate > endDate) {
                const newEnd = new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                setEndDate(newEnd);
            }
        }
    };

    const handleEndDateConfirm = (selectedDate) => {
        setShowEndPicker(false);
        if (selectedDate) {
            if (selectedDate < startDate) {
                showAlert("Invalid Date", "End date cannot be earlier than start date.", "warning");
                return;
            }
            setEndDate(selectedDate);
        }
    };

    const renderEmptyState = () => (
        <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
            <View style={styles.emptyContent}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF8EE' }]}>
                    <Icon name={isPopup ? "clone" : "images"} size={44} color={COLORS?.primary || '#915200'} />
                </View>

                <Text style={styles.emptyTitle}>{isPopup ? 'Welcome Popup Ad' : 'Dashboard Banner Ad'}</Text>
                <Text style={styles.emptySubtitle}>
                    {isPopup
                        ? 'Create a high-impact popup ad shown to all users in a modal dialog upon opening the app.'
                        : 'Promote your business on the sliding carousel banner at the top of the user dashboard.'}
                </Text>

                <View style={styles.benefitsRow}>
                    <View style={styles.benefitItem}>
                        <View style={[styles.benefitIconBox, { backgroundColor: '#FFF8EE' }]}>
                            <Icon name={isPopup ? "star" : "eye"} size={16} color={COLORS?.primary || '#915200'} />
                        </View>
                        <Text style={styles.benefitText}>{isPopup ? 'Instant Pop' : 'High Visibility'}</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <View style={[styles.benefitIconBox, { backgroundColor: '#FFF8EE' }]}>
                            <Icon name={isPopup ? "toggle-on" : "calendar-alt"} size={16} color={COLORS?.primary || '#915200'} />
                        </View>
                        <Text style={styles.benefitText}>{isPopup ? 'Instant Toggle' : 'Custom Dates'}</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <View style={[styles.benefitIconBox, { backgroundColor: '#FFF8EE' }]}>
                            <Icon name="chart-line" size={16} color={COLORS?.primary || '#915200'} />
                        </View>
                        <Text style={styles.benefitText}>Track Growth</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => handleEditClick(null)}
                    activeOpacity={0.8}
                >
                    <Icon name="plus" size={18} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.createButtonText}>{isPopup ? 'Create Popup Ad' : 'Launch Banner Ad'}</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderActiveState = () => {
        const isScheduled = !isPopup && activeAd?.startDate && new Date(activeAd.startDate) > new Date();
        const isExpired = !isPopup && activeAd?.endDate && new Date(activeAd.endDate) < new Date();
        let statusText = isPopup
            ? (activeAd?.isActive ? 'Popup Enabled' : 'Popup Disabled')
            : (activeAd?.isActive ? 'Banner Active' : 'Banner Paused');
        let statusColor = activeAd?.isActive ? COLORS?.success : COLORS?.secondary;
        if (!isPopup && isScheduled) {
            statusText = `Scheduled (${formatDateToIndian(activeAd.startDate)})`;
            statusColor = COLORS?.primary || '#915200';
        } else if (!isPopup && isExpired) {
            statusText = 'Expired';
            statusColor = '#EF4444';
        }

        const adImages = activeAd.imageUrls || (activeAd.imageUrl ? [activeAd.imageUrl] : []);

        return (
            <Animated.View style={[styles.activeContainer, { opacity: fadeAnim }]}>
                <View style={styles.activeCard}>
                    {/* Status Header */}
                    <View style={styles.cardHeader}>
                        <View style={styles.statusContainer}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusLabel, isScheduled && { color: COLORS?.primary || '#915200' }]}>{statusText}</Text>
                        </View>
                        <View style={styles.typeBadge}>
                            <Icon name={isPopup ? "clone" : "images"} size={10} color={COLORS?.primary || '#915200'} style={{ marginRight: 4 }} />
                            <Text style={styles.typeBadgeText}>
                                {isPopup ? 'POPUP AD' : 'BANNER AD'}
                            </Text>
                        </View>
                    </View>

                    {/* Enable / Disable Switch Banner for Popup */}
                    {isPopup && (
                        <View style={styles.toggleRowCard}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.toggleRowTitle}>
                                    {activeAd.isActive ? 'Popup is Enabled' : 'Popup is Disabled'}
                                </Text>
                                <Text style={styles.toggleRowSubtitle}>
                                    {activeAd.isActive ? 'Active and showing to users on app launch' : 'Hidden from users (disabled)'}
                                </Text>
                            </View>
                            <Switch
                                value={activeAd.isActive}
                                onValueChange={handleToggleStatus}
                                trackColor={{ false: '#CBD5E1', true: COLORS?.primary || '#915200' }}
                                thumbColor="#fff"
                            />
                        </View>
                    )}

                    {/* Popup Images Section */}
                    {isPopup ? (
                        <View style={styles.popupImagesSection}>
                            <View style={styles.popupImagesHeader}>
                                <Text style={styles.popupImagesTitle}>Popup Images ({adImages.length}/5)</Text>
                                <TouchableOpacity
                                    onPress={() => handleEditClick(activeAd)}
                                    activeOpacity={0.7}
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                >
                                    <Icon name="pen" size={11} color={COLORS?.primary || '#915200'} style={{ marginRight: 4 }} />
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS?.primary || '#915200' }}>Edit Photos</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popupImagesScroll}>
                                {adImages.map((imgUrl, idx) => (
                                    <TouchableOpacity
                                        key={`active-img-${idx}`}
                                        style={styles.popupThumbCard}
                                        onPress={() => handleEditClick(activeAd)}
                                        activeOpacity={0.85}
                                    >
                                        <Image
                                            source={{ uri: `${BASE_URL}${imgUrl}` }}
                                            style={styles.popupThumbImg}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.popupIndexBadge}>
                                            <Text style={styles.popupIndexText}>{idx + 1}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    ) : (
                        /* Banner Preview Image */
                        <View style={styles.previewContainer}>
                            <Image
                                source={{ uri: `${BASE_URL}${adImages[0]}` }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                        </View>
                    )}

                    {/* Content Block */}
                    <View style={styles.contentBlock}>
                        <Text style={styles.contentTitle} numberOfLines={1}>
                            {activeAd.title || (isPopup ? 'Popup Campaign' : 'Banner Campaign')}
                        </Text>

                        {activeAd.description ? (
                            <Text style={styles.contentDesc} numberOfLines={3}>
                                {activeAd.description}
                            </Text>
                        ) : (
                            <Text style={[styles.contentDesc, { fontStyle: 'italic', opacity: 0.6 }]}>
                                No description provided.
                            </Text>
                        )}
                        {!isPopup && activeAd.imageUrls?.length > 1 && (
                            <View style={styles.multiImageBadge}>
                                <Icon name="images" size={10} color="#fff" />
                                <Text style={styles.multiImageText}>+{activeAd.imageUrls.length - 1}</Text>
                            </View>
                        )}
                    </View>

                    {/* Info Grid (Only for Banner with dates) */}
                    {!isPopup && (
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Start Date</Text>
                                <Text style={styles.infoValue}>{formatDateToIndian(activeAd.startDate)}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>End Date</Text>
                                <Text style={styles.infoValue}>{formatDateToIndian(activeAd.endDate)}</Text>
                            </View>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleEditClick(activeAd)}>
                            <View style={[styles.iconBox, { backgroundColor: '#fff8e1' }]}>
                                <Icon name="pen" size={16} color={COLORS?.primary} />
                            </View>
                            <Text style={styles.actionText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={handleToggleStatus}>
                            <View style={[styles.iconBox, { backgroundColor: activeAd.isActive ? '#fff3cd' : '#d4edda' }]}>
                                <Icon name={activeAd.isActive ? "pause" : "play"} size={16} color={activeAd.isActive ? COLORS?.warning : COLORS?.success} />
                            </View>
                            <Text style={styles.actionText}>{activeAd.isActive ? (isPopup ? 'Disable' : 'Pause') : (isPopup ? 'Enable' : 'Resume')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                            <View style={[styles.iconBox, { backgroundColor: '#f8d7da' }]}>
                                <Icon name="trash" size={16} color={COLORS?.danger} />
                            </View>
                            <Text style={styles.actionText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Background Gradient */}
            <ImageBackground source={require('../../public/assests/DKGOLDBG.png')} style={StyleSheet.absoluteFill} resizeMode="cover">

                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{isPopup ? 'Popup Ads' : 'Banner Ads'}</Text>
                    <Text style={styles.headerSubtitle}>
                        {isPopup ? 'Manage your Welcome Popup Ad shown on app launch' : 'Manage your Top Banner Ad on user dashboard'}
                    </Text>

                    {/* Segmented Tab Switcher */}
                    <View style={styles.tabSwitcher}>
                        <TouchableOpacity
                            style={[styles.tabButton, !isPopup && styles.activeTabButton]}
                            onPress={() => setSelectedType('banner')}
                            activeOpacity={0.8}
                        >
                            <Icon name="images" size={13} color={!isPopup ? '#fff' : 'rgba(255, 255, 255, 0.75)'} style={{ marginRight: 6 }} />
                            <Text style={[styles.tabButtonText, !isPopup ? styles.activeTabButtonText : { color: 'rgba(255, 255, 255, 0.75)' }]}>Banner Ads</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabButton, isPopup && styles.activeTabButton]}
                            onPress={() => setSelectedType('popup')}
                            activeOpacity={0.8}
                        >
                            <Icon name="clone" size={13} color={isPopup ? '#fff' : 'rgba(255, 255, 255, 0.75)'} style={{ marginRight: 6 }} />
                            <Text style={[styles.tabButtonText, isPopup ? styles.activeTabButtonText : { color: 'rgba(255, 255, 255, 0.75)' }]}>Popup Ads</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {loading ? (
                        <View style={styles.activeContainer}>
                            <SkeletonAdCard />
                        </View>
                    ) : activeAd ? renderActiveState() : renderEmptyState()}
                </ScrollView>

                {/* Create/Edit Modal */}
                <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    {editingAd ? (isPopup ? 'Edit Popup Ad' : 'Edit Banner Ad') : (isPopup ? 'New Popup Ad' : 'New Banner Ad')}
                                </Text>
                                <Text style={{ fontSize: 12, color: COLORS?.secondary, marginTop: 2 }}>
                                    {isPopup ? 'Shown to users immediately in a popup dialog upon launching app' : 'Shown continuously in sliding carousel on dashboard'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                                <Icon name="times" size={18} color={COLORS?.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalContent}>
                            {/* Image Picker */}
                            <Text style={styles.label}>Campaign Creatives</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                                {existingImages.map((url, i) => (
                                    <View key={`exist-${i}`} style={styles.imagePreview}>
                                        <Image source={{ uri: `${BASE_URL}${url}` }} style={styles.thumbImage} resizeMode="cover" />
                                        <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveExistingImage(i)}>
                                            <Icon name="times" size={10} color="#fff" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.cropOverlayBtn}
                                            onPress={() => handleOpenCrop({ type: 'existing', index: i, uri: `${BASE_URL}${url}` })}
                                            activeOpacity={0.8}
                                        >
                                            <Icon name="crop-alt" size={10} color="#fff" style={{ marginRight: 3 }} />
                                            <Text style={styles.cropOverlayText}>{isPopup ? 'Crop (4:5)' : 'Crop 16:9'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {imageFiles.map((file, i) => (
                                    <View key={`new-${i}`} style={styles.imagePreview}>
                                        <Image source={{ uri: file.uri }} style={styles.thumbImage} resizeMode="cover" />
                                        <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveNewImage(i)}>
                                            <Icon name="times" size={10} color="#fff" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.cropOverlayBtn}
                                            onPress={() => handleOpenCrop({ type: 'new', index: i, uri: file.uri })}
                                            activeOpacity={0.8}
                                        >
                                            <Icon name="crop-alt" size={10} color="#fff" style={{ marginRight: 3 }} />
                                            <Text style={styles.cropOverlayText}>{isPopup ? 'Crop (4:5)' : 'Crop 16:9'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {(existingImages.length + imageFiles.length < 5) && (
                                    <TouchableOpacity style={styles.addImageBtn} onPress={handleImagePick}>
                                        <Icon name="plus" size={20} color={COLORS?.primary} />
                                        <Text style={styles.addText}>Add Photo</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                            <View style={styles.recommendationBox}>
                                <Icon name="info-circle" size={14} color={COLORS.primary} />
                                <Text style={styles.recommendationText}>
                                    {isPopup
                                        ? 'Recommended popup creative: 4:5 portrait format. Tap "Crop (4:5)" on any photo to fit the modal dialog neatly. Maximum 5 images.'
                                        : 'Recommended banner: 16:9 ratio. Tap "Crop 16:9" on any photo to fit standard user dashboard banner format. Maximum 5 images.'}
                                </Text>
                            </View>

                            {/* Info Fields */}
                            <Text style={styles.label}>Headline</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Special Diwali Offer"
                                value={title}
                                onChangeText={setTitle}
                                placeholderTextColor="#999"
                            />

                            {/* Frequency (Only for Banner) */}
                            {!isPopup && (
                                <>
                                    <Text style={styles.label}>Frequency</Text>
                                    <View style={styles.readOnlyInput}>
                                        <Icon name="clock" size={14} color={COLORS?.secondary} style={{ marginRight: 8 }} />
                                        <Text style={styles.readOnlyText}>Ad runs automatically every 15 minutes</Text>
                                    </View>
                                </>
                            )}

                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe your offer in detail..."
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                                placeholderTextColor="#999"
                            />

                            <Text style={styles.label}>Target Link (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://yourwebsite.com"
                                value={link}
                                onChangeText={setLink}
                                autoCapitalize="none"
                                placeholderTextColor="#999"
                            />

                            {/* Status Toggle for Popup vs Dates for Banner */}
                            {isPopup ? (
                                <View style={styles.toggleRowModal}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={[styles.label, { marginBottom: 2, color: COLORS?.primary || '#915200' }]}>Popup Display Status</Text>
                                        <Text style={{ fontSize: 12, color: COLORS?.secondary }}>
                                            {isAdActiveToggle ? 'Enabled (Showing to users on launch)' : 'Disabled (Hidden from users)'}
                                        </Text>
                                    </View>
                                    <Switch
                                        value={isAdActiveToggle}
                                        onValueChange={setIsAdActiveToggle}
                                        trackColor={{ false: '#CBD5E1', true: COLORS?.primary || '#915200' }}
                                        thumbColor="#fff"
                                    />
                                </View>
                            ) : (
                                <>
                                    {/* Dates for Banner */}
                                    <View style={styles.row}>
                                        <View style={styles.col}>
                                            <Text style={styles.label}>Start Date</Text>
                                            <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
                                                <Text style={styles.dateText}>{formatDateToIndian(startDate)}</Text>
                                                <Icon name="calendar-alt" size={14} color={COLORS?.primary} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.col}>
                                            <Text style={styles.label}>End Date</Text>
                                            <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
                                                <Text style={styles.dateText}>{formatDateToIndian(endDate)}</Text>
                                                <Icon name="calendar-alt" size={14} color={COLORS?.primary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <DateTimePickerModal
                                        isVisible={showStartPicker}
                                        mode="date"
                                        date={startDate}
                                        onConfirm={handleStartDateConfirm}
                                        onCancel={() => setShowStartPicker(false)}
                                    />

                                    <DateTimePickerModal
                                        isVisible={showEndPicker}
                                        mode="date"
                                        date={endDate}
                                        onConfirm={handleEndDateConfirm}
                                        onCancel={() => setShowEndPicker(false)}
                                        minimumDate={startDate}
                                    />
                                </>
                            )}

                            <TouchableOpacity
                                style={[styles.saveBtn, uploading && { opacity: 0.8 }]}
                                onPress={handleCreateOrUpdateAd}
                                disabled={uploading}
                            >

                                <Text style={styles.saveBtnText}>
                                    {uploading ? 'SAVING...' : (editingAd ? 'Save Changes' : (isPopup ? 'Save & Enable Popup' : 'Go Active'))}
                                </Text>
                            </TouchableOpacity>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </Modal>

                {/* 16:9 Image Crop Modal */}
                <Modal visible={cropModalVisible} transparent animationType="fade" onRequestClose={() => setCropModalVisible(false)}>
                    <View style={styles.cropModalBackdrop}>
                        <View style={styles.cropModalContainer}>
                            <View style={styles.cropModalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cropModalTitle}>{isPopup ? 'Crop Popup Ad (4:5 Portrait)' : 'Crop Ad Banner (16:9)'}</Text>
                                    <Text style={styles.cropModalSubtitle}>
                                        {isPopup
                                            ? 'Drag to pan, use slider to zoom. Formats for user startup popup dialog.'
                                            : 'Drag to pan, use slider to zoom. Formats for user dashboard banner.'}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setCropModalVisible(false)} style={styles.cropCloseBtn}>
                                    <Icon name="times" size={16} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* Viewport Box */}
                            <View style={styles.cropViewportOuter}>
                                <View
                                    style={[styles.cropViewportBox, { width: CROP_BOX_WIDTH, height: CROP_BOX_HEIGHT }]}
                                    {...cropPanResponder.panHandlers}
                                >
                                    <ViewShot
                                        ref={cropViewShotRef}
                                        options={{ format: "jpg", quality: 0.95 }}
                                        style={{
                                            width: CROP_BOX_WIDTH,
                                            height: CROP_BOX_HEIGHT,
                                            backgroundColor: '#0F172A',
                                            overflow: 'hidden',
                                            position: 'relative',
                                        }}
                                    >
                                        <Animated.View
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                width: renderedWidth,
                                                height: renderedHeight,
                                                transform: [
                                                    { translateX: cropPan.x },
                                                    { translateY: cropPan.y },
                                                    { scale: cropScale }
                                                ],
                                            }}
                                        >
                                            {cropTarget?.uri ? (
                                                <Image
                                                    source={{ uri: cropTarget.uri }}
                                                    style={{ width: renderedWidth, height: renderedHeight }}
                                                    resizeMode="stretch"
                                                />
                                            ) : null}
                                        </Animated.View>
                                    </ViewShot>

                                    {/* Grid Overlay */}
                                    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                                        <View style={styles.cropGridH1} />
                                        <View style={styles.cropGridH2} />
                                        <View style={styles.cropGridV1} />
                                        <View style={styles.cropGridV2} />
                                        <View style={styles.cropBadge}>
                                            <Icon name="crop-alt" size={10} color="#fff" style={{ marginRight: 4 }} />
                                            <Text style={styles.cropBadgeText}>{isPopup ? '4:5 Popup' : '16:9 Banner'}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Zoom & Presets */}
                            <View style={styles.cropControls}>
                                <View style={styles.zoomRow}>
                                    <TouchableOpacity
                                        onPress={() => setCropScale(s => Math.max(0.8, Number((s - 0.1).toFixed(2))))}
                                        style={styles.zoomBtn}
                                    >
                                        <Icon name="search-minus" size={14} color="#64748B" />
                                    </TouchableOpacity>
                                    <Slider
                                        style={{ flex: 1, marginHorizontal: 8, height: 40 }}
                                        minimumValue={0.8}
                                        maximumValue={3.0}
                                        step={0.05}
                                        value={cropScale}
                                        onValueChange={val => setCropScale(Number(val.toFixed(2)))}
                                        minimumTrackTintColor={COLORS?.primary}
                                        maximumTrackTintColor="#CBD5E1"
                                        thumbTintColor={COLORS?.primary}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setCropScale(s => Math.min(3.0, Number((s + 0.1).toFixed(2))))}
                                        style={styles.zoomBtn}
                                    >
                                        <Icon name="search-plus" size={14} color="#64748B" />
                                    </TouchableOpacity>
                                    <Text style={styles.zoomText}>{Math.round(cropScale * 100)}%</Text>
                                </View>

                                <View style={styles.presetRow}>
                                    <TouchableOpacity
                                        style={[styles.presetBtn, fitMode === 'cover' && styles.presetBtnActive]}
                                        onPress={() => {
                                            setFitMode('cover');
                                            setCropScale(1);
                                            const s = Math.max(CROP_BOX_WIDTH / natW, CROP_BOX_HEIGHT / natH);
                                            const rW = Math.round(natW * s);
                                            const initX = rW > CROP_BOX_WIDTH ? Math.round((CROP_BOX_WIDTH - rW) / 2) : 0;
                                            cropPanPos.current = { x: initX, y: 0 };
                                            cropPan.setValue({ x: initX, y: 0 });
                                        }}
                                    >
                                        <Icon name="arrow-up" size={11} color={fitMode === 'cover' ? '#fff' : '#64748B'} style={{ marginRight: 4 }} />
                                        <Text style={[styles.presetBtnText, fitMode === 'cover' && styles.presetBtnTextActive]}>Top</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.presetBtn}
                                        onPress={() => {
                                            setFitMode('cover');
                                            setCropScale(1);
                                            const s = Math.max(CROP_BOX_WIDTH / natW, CROP_BOX_HEIGHT / natH);
                                            const rW = Math.round(natW * s);
                                            const rH = Math.round(natH * s);
                                            const initX = Math.round((CROP_BOX_WIDTH - rW) / 2);
                                            const initY = Math.round((CROP_BOX_HEIGHT - rH) / 2);
                                            cropPanPos.current = { x: initX, y: initY };
                                            cropPan.setValue({ x: initX, y: initY });
                                        }}
                                    >
                                        <Icon name="arrows-alt-v" size={11} color="#64748B" style={{ marginRight: 4 }} />
                                        <Text style={styles.presetBtnText}>Center</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.presetBtn}
                                        onPress={() => {
                                            setFitMode('cover');
                                            setCropScale(1);
                                            const s = Math.max(CROP_BOX_WIDTH / natW, CROP_BOX_HEIGHT / natH);
                                            const rW = Math.round(natW * s);
                                            const rH = Math.round(natH * s);
                                            const initX = Math.round((CROP_BOX_WIDTH - rW) / 2);
                                            const initY = Math.round(CROP_BOX_HEIGHT - rH);
                                            cropPanPos.current = { x: initX, y: initY };
                                            cropPan.setValue({ x: initX, y: initY });
                                        }}
                                    >
                                        <Icon name="arrow-down" size={11} color="#64748B" style={{ marginRight: 4 }} />
                                        <Text style={styles.presetBtnText}>Bottom</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.presetBtn, fitMode === 'contain' && styles.presetBtnActive]}
                                        onPress={() => {
                                            setFitMode('contain');
                                            setCropScale(1);
                                            const s = Math.min(CROP_BOX_WIDTH / natW, CROP_BOX_HEIGHT / natH);
                                            const cW = Math.round(natW * s);
                                            const cH = Math.round(natH * s);
                                            const initX = Math.round((CROP_BOX_WIDTH - cW) / 2);
                                            const initY = Math.round((CROP_BOX_HEIGHT - cH) / 2);
                                            cropPanPos.current = { x: initX, y: initY };
                                            cropPan.setValue({ x: initX, y: initY });
                                        }}
                                    >
                                        <Icon name="compress" size={11} color={fitMode === 'contain' ? '#fff' : '#64748B'} style={{ marginRight: 4 }} />
                                        <Text style={[styles.presetBtnText, fitMode === 'contain' && styles.presetBtnTextActive]}>Fit Full</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Actions */}
                            <View style={styles.cropActionsRow}>
                                <TouchableOpacity
                                    style={styles.cropCancelBtn}
                                    onPress={() => setCropModalVisible(false)}
                                    disabled={isCropping}
                                >
                                    <Text style={styles.cropCancelText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.cropSaveBtn, isCropping && { opacity: 0.7 }]}
                                    onPress={handleApplyCrop}
                                    disabled={isCropping}
                                >
                                    {isCropping ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <Icon name="check" size={14} color="#fff" style={{ marginRight: 6 }} />
                                            <Text style={styles.cropSaveText}>Apply Crop</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                <CustomAlert
                    visible={alertConfig.visible}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    buttons={alertConfig.buttons}
                    onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
                />
            </ImageBackground>
        </View>

    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        // marginLeft: 8,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#fff',
        marginTop: 4,
    },
    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        borderRadius: 12,
        padding: 4,
        marginTop: 14,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        borderRadius: 9,
    },
    activeTabButton: {
        backgroundColor: COLORS?.primary || '#915200',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    tabButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    activeTabButtonText: {
        color: '#fff',
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#FFF8EE',
        borderWidth: 1,
        borderColor: 'rgba(145, 82, 0, 0.25)',
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        color: COLORS?.primary || '#915200',
    },
    toggleRowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8EE',
        borderWidth: 1,
        borderColor: 'rgba(145, 82, 0, 0.25)',
        borderRadius: 12,
        padding: 14,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
    },
    toggleRowTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS?.primary || '#915200',
    },
    toggleRowSubtitle: {
        fontSize: 11,
        color: COLORS?.textSecondary || 'rgba(145, 82, 0, 0.7)',
        marginTop: 2,
    },
    toggleRowModal: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8EE',
        borderWidth: 1,
        borderColor: 'rgba(145, 82, 0, 0.25)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    popupImagesSection: {
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 8,
    },
    popupImagesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    popupImagesTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS?.dark || '#1E293B',
    },
    popupImagesScroll: {
        flexDirection: 'row',
    },
    popupThumbCard: {
        width: 110,
        height: 145,
        borderRadius: 12,
        marginRight: 10,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    popupThumbImg: {
        width: '100%',
        height: '100%',
    },
    popupIndexBadge: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    popupIndexText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 24,
        paddingTop: 8,
    },
    // Empty State
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    emptyContent: {
        alignItems: 'center',
        width: '100%',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFF8EE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.45)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.55)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    emptySubtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.92)',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        paddingHorizontal: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    benefitsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 40,
        gap: 12,
    },
    benefitItem: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 16,
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 2,
    },
    benefitIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    benefitText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS?.dark,
        textAlign: 'center',
    },

    createButton: {
        width: '100%',
        backgroundColor: COLORS?.primary,
        paddingVertical: 18,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        transform: [{ scale: 1.02 }],
    },
    createButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
        letterSpacing: 0.5,
    },
    // Active State
    activeContainer: {
        marginTop: 10,
    },
    activeCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS?.dark,
    },
    frequencyBadge: {
        fontSize: 11,
        color: COLORS?.secondary,
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
    previewContainer: {
        height: 220,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#333',
    },
    contentBlock: {
        padding: 20,
        paddingBottom: 10,
    },
    recommendationBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFF8E6',
        borderWidth: 1,
        borderColor: '#F6D365',
        borderRadius: 10,
        padding: 12,
        marginBottom: 15,
    },

    recommendationText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 12,
        color: '#7A5A00',
        lineHeight: 18,
    },
    contentTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS?.dark,
        marginBottom: 8,
    },
    contentDesc: {
        fontSize: 15,
        color: COLORS?.secondary,
        lineHeight: 22,
    },
    multiImageBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    multiImageBadge: {
        position: 'absolute',

        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    multiImageText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    infoGrid: {
        flexDirection: 'row',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoItem: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        color: COLORS?.secondary,
        textTransform: 'uppercase',
        marginBottom: 4,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 14,
        color: COLORS?.dark,
        fontWeight: '600',
    },
    actionRow: {
        flexDirection: 'row',
        padding: 20,
        justifyContent: 'space-between',
    },
    actionButton: {
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        color: COLORS?.dark,
        fontWeight: '600',
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS?.dark,
    },
    closeBtn: {
        padding: 8,
    },
    modalContent: {
        padding: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS?.dark,
        marginBottom: 10,
        marginTop: 20,
    },
    imageScroll: {
        marginBottom: 10,
    },
    imagePreview: {
        width: 120,
        height: 80,
        marginRight: 10,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0F172A',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.65)',
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    cropOverlayBtn: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingVertical: 3,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cropOverlayText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    addImageBtn: {
        width: 120,
        height: 80,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa',
    },
    addText: {
        fontSize: 12,
        color: COLORS?.secondary,
        marginTop: 6,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: COLORS?.dark,
        borderWidth: 1,
        borderColor: '#eee',
    },
    textArea: {
        height: 100,
        paddingTop: 16,
        textAlignVertical: 'top',
    },
    readOnlyInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e1e4e8',
    },
    readOnlyText: {
        color: COLORS?.secondary,
        fontSize: 14,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    col: {
        flex: 1,
    },
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    dateText: {
        fontSize: 15,
        color: COLORS?.dark,
        fontWeight: '500',
    },
    saveBtn: {
        marginTop: 32,
        marginBottom: 20,
        backgroundColor: COLORS?.primary,
        borderRadius: 16,
        width: '100%',
        padding: 16,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: 'bold',
    },

    // 16:9 Image Crop Modal Styles
    cropModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    cropModalContainer: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    cropModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    cropModalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
    },
    cropModalSubtitle: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    cropCloseBtn: {
        padding: 6,
    },
    cropViewportOuter: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    cropViewportBox: {
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS?.primary,
        backgroundColor: '#0F172A',
        position: 'relative',
    },
    cropGridH1: {
        position: 'absolute',
        top: '33.33%',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
    cropGridH2: {
        position: 'absolute',
        top: '66.66%',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
    cropGridV1: {
        position: 'absolute',
        left: '33.33%',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
    cropGridV2: {
        position: 'absolute',
        left: '66.66%',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
    cropBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    cropBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    cropControls: {
        marginTop: 10,
    },
    zoomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    zoomBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        width: 40,
        textAlign: 'right',
    },
    presetRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    presetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    presetBtnActive: {
        backgroundColor: COLORS?.primary,
    },
    presetBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569',
    },
    presetBtnTextActive: {
        color: '#fff',
    },
    cropActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    cropCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cropCancelText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    cropSaveBtn: {
        flex: 1.5,
        flexDirection: 'row',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: COLORS?.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cropSaveText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
});

export default AdManager;
