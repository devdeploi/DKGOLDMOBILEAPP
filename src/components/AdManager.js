/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import {
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
    Animated
} from 'react-native';
import { COLORS } from '../styles/theme';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import { APIURL, BASE_URL } from '../constants/api';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomAlert from './CustomAlert';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

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

const AdManager = ({ user }) => {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);

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

    // Date Picker State
    const [showEndPicker, setShowEndPicker] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;

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

    const activeAd = ads.length > 0 ? ads[0] : null;

    const handleImagePick = async () => {
        const options = {
            mediaType: 'photo',
            quality: 0.8,
            selectionLimit: 5,
            maxWidth: 1024,
            maxHeight: 1024,
        };
        const result = await launchImageLibrary(options);
        if (result.assets && result.assets.length > 0) {
            if (result.assets.length + existingImages.length > 5) {
                showAlert("Limit Reached", "Max 5 images allowed total.", "warning");
                return;
            }
            setImageFiles(result.assets);
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
            setStartDate(new Date(ad.startDate));
            setEndDate(new Date(ad.endDate));
            setExistingImages(ad.imageUrls || [ad.imageUrl]);
            setImageFiles([]);
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
                const formData = new FormData();
                imageFiles.forEach(file => {
                    formData.append('images', {
                        uri: file.uri,
                        type: file.type || 'image/jpeg',
                        name: file.fileName || `ad_${Date.now()}.jpg`,
                    });
                });

                const uploadConfig = {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                };
                const { data: uploadedPaths } = await axios.post(`${APIURL}/upload/multiple`, formData, uploadConfig);
                finalImageUrls = [...finalImageUrls, ...uploadedPaths];
            }

            const adData = {
                imageUrls: finalImageUrls,
                link,
                title,
                description,
                startDate,
                endDate,
                displayFrequency: 15
            };

            if (editingAd) {
                await axios.put(`${APIURL}/ads/${editingAd._id}`, adData, config);
                showAlert("Success", "Campaign updated successfully", "success");
            } else {
                await axios.post(`${APIURL}/ads`, adData, config);
                showAlert("Success", "Campaign launched successfully", "success");
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
            const updatedAds = ads.map(a => a._id === activeAd._id ? { ...a, isActive: !a.isActive } : a);
            setAds(updatedAds); // Optimistic

            await axios.patch(`${APIURL}/ads/${activeAd._id}/status`, {}, config);
        } catch (err) {
            console.error(err);
            showAlert("Error", "Failed to update status", "error");
            fetchAds();
        }
    };

    const handleDelete = async () => {
        if (!activeAd) return;
        showAlert(
            "Delete Campaign",
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
                            setAds([]);
                        } catch (err) {
                            console.error(err);
                            showAlert("Error", "Failed to delete ad", "error");
                        }
                    }
                }
            ]
        );
    };

    const onEndDateChange = (event, selectedDate) => {
        setShowEndPicker(false);
        if (selectedDate) setEndDate(selectedDate);
    };

    const renderEmptyState = () => (
        <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
            <View style={styles.emptyContent}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF5F5' }]}>
                    <Icon name="rocket" size={50} color={COLORS?.primary} />
                </View>

                <Text style={styles.emptyTitle}>Boost Your Reach!</Text>
                <Text style={styles.emptySubtitle}>
                    Promote your business directly to thousands of users on their dashboard.
                </Text>

                <View style={styles.benefitsRow}>
                    <View style={styles.benefitItem}>
                        <View style={[styles.benefitIconBox, { backgroundColor: '#E6FFFA' }]}>
                            <Icon name="eye" size={16} color="#38B2AC" />
                        </View>
                        <Text style={styles.benefitText}>High Visibility</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <View style={[styles.benefitIconBox, { backgroundColor: '#EBF8FF' }]}>
                            <Icon name="clock" size={16} color="#4299E1" />
                        </View>
                        <Text style={styles.benefitText}>15m Intervals</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <View style={[styles.benefitIconBox, { backgroundColor: '#FAF5FF' }]}>
                            <Icon name="chart-line" size={16} color="#9F7AEA" />
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
                    <Text style={styles.createButtonText}>Launch Campaign</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderActiveState = () => (
        <Animated.View style={[styles.activeContainer, { opacity: fadeAnim }]}>
            <View style={styles.activeCard}>
                {/* Status Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: activeAd.isActive ? COLORS?.success : COLORS?.secondary }]} />
                        <Text style={styles.statusLabel}>{activeAd.isActive ? 'Active Campaign' : 'Paused'}</Text>
                    </View>
                    <Text style={styles.frequencyBadge}>Runs every 15 min</Text>
                </View>

                {/* Main Preview with Image */}
                <View style={styles.previewContainer}>
                    <Image
                        source={{ uri: `${BASE_URL}${activeAd.imageUrls?.[0] || activeAd.imageUrl}` }}
                        style={styles.previewImage}
                        resizeMode="cover"
                    />

                </View>

                {/* Content Block */}
                <View style={styles.contentBlock}>
                    <Text style={styles.contentTitle} numberOfLines={1}>
                        {activeAd.title || 'Untitled Campaign'}
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
                    {activeAd.imageUrls?.length > 1 && (
                        <View style={styles.multiImageBadge}>
                            <Icon name="images" size={10} color="#fff" />
                            <Text style={styles.multiImageText}>+{activeAd.imageUrls.length - 1}</Text>
                        </View>
                    )}
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Start Date</Text>
                        <Text style={styles.infoValue}>{new Date(activeAd.startDate).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>End Date</Text>
                        <Text style={styles.infoValue}>{new Date(activeAd.endDate).toLocaleDateString()}</Text>
                    </View>
                    {/* <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Link</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{activeAd.link ? 'Active' : 'None'}</Text>
                    </View> */}
                </View>

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
                        <Text style={styles.actionText}>{activeAd.isActive ? 'Pause' : 'Resume'}</Text>
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

    return (
        <View style={styles.container}>
            {/* Background Gradient */}
            <LinearGradient
                colors={['#c1ab8eff', '#f2e07bff', '#915200']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Promotion</Text>
                <Text style={styles.headerSubtitle}>Manage your Business Global Ad</Text>
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
                        <Text style={styles.modalTitle}>{editingAd ? 'Edit Campaign' : 'New Campaign'}</Text>
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
                                    <Image source={{ uri: `${BASE_URL}${url}` }} style={styles.thumbImage} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveExistingImage(i)}>
                                        <Icon name="times" size={10} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {imageFiles.map((file, i) => (
                                <View key={`new-${i}`} style={styles.imagePreview}>
                                    <Image source={{ uri: file.uri }} style={styles.thumbImage} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveNewImage(i)}>
                                        <Icon name="times" size={10} color="#fff" />
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

                        {/* Info Fields */}
                        <Text style={styles.label}>Headline</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Special Diwali Offer"
                            value={title}
                            onChangeText={setTitle}
                            placeholderTextColor="#999"
                        />

                        <Text style={styles.label}>Frequency</Text>
                        <View style={styles.readOnlyInput}>
                            <Icon name="clock" size={14} color={COLORS?.secondary} style={{ marginRight: 8 }} />
                            <Text style={styles.readOnlyText}>Ad runs automatically every 15 minutes</Text>
                        </View>

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

                        {/* Dates */}
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={styles.label}>Start Date</Text>
                                <View style={[styles.dateInput, { backgroundColor: '#f0f2f5' }]}>
                                    <Text style={[styles.dateText, { color: COLORS?.secondary }]}>{startDate.toLocaleDateString()}</Text>
                                    <Icon name="calendar-alt" size={14} color={COLORS?.secondary} />
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>End Date</Text>
                                <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
                                    <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
                                    <Icon name="calendar-alt" size={14} color={COLORS?.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Date Pickers */}
                        {showEndPicker && (
                            <DateTimePicker
                                value={endDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onEndDateChange}
                                minimumDate={startDate}
                            />
                        )}

                        <TouchableOpacity
                            style={[styles.saveBtn, uploading && { opacity: 0.8 }]}
                            onPress={handleCreateOrUpdateAd}
                            disabled={uploading}
                        >

                            <Text style={styles.saveBtnText}>
                                {uploading ? 'LAUNCHING...' : (editingAd ? 'Save Changes' : 'Go Active')}
                            </Text>
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>
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
        color: COLORS?.dark,
        // marginLeft: 8,
    },
    headerSubtitle: {
        fontSize: 12,
        color: COLORS?.secondary,
        marginTop: 4,
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
        backgroundColor: '#FFF5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS?.dark,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 15,
        color: COLORS?.secondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        paddingHorizontal: 20,
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
        width: 100,
        height: 100,
        marginRight: 10,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addImageBtn: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ddd',
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
});

export default AdManager;
