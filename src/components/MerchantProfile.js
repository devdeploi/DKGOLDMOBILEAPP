/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { APIURL } from '../constants/api';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../styles/theme';

const MerchantProfile = ({
    user,
    profileData,
    setProfileData,
    isEditingProfile,
    setIsEditingProfile,
    handleUpdateProfile,
    updatingProfile,
    uploadingDoc,
    setUploadingDoc,
    onRefresh
}) => {
    const [refreshing, setRefreshing] = useState(false);

    // Brand Colors
    const primaryColor = '#915200';
    const secondaryColor = '#ebdc87';
    const lightBg = '#fffbf0';

    const handleRefresh = async () => {
        if (onRefresh) {
            setRefreshing(true);
            await onRefresh();
            setRefreshing(false);
        }
    };

    const handleImageUpload = async (docType) => {
        const options = {
            mediaType: 'photo',
            quality: 0.8,
            maxWidth: 1200,
            maxHeight: 1200,
        };

        try {
            const response = await launchImageLibrary(options);

            if (response.didCancel || response.errorCode || !response.assets || response.assets.length === 0) {
                return;
            }

            const imageFile = response.assets[0];
            setUploadingDoc(true);
            const token = user.token;

            const uploadEndpoint = `${APIURL}/upload`;
            const uploadFormData = new FormData();
            uploadFormData.append('image', {
                uri: imageFile.uri,
                type: imageFile.type || 'image/jpeg',
                name: imageFile.fileName || `upload_${Date.now()}.jpg`,
            });

            const { data: imagePath } = await axios.post(uploadEndpoint, uploadFormData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                }
            });

            setProfileData(prev => {
                if (docType === 'shopLogo') {
                    return { ...prev, shopLogo: imagePath };
                } else {
                    const currentImages = prev.shopImages || [];
                    return { ...prev, shopImages: [...currentImages, imagePath] };
                }
            });

        } catch (error) {
            console.error("Image upload error", error);
        } finally {
            setUploadingDoc(false);
        }
    };

    const removeShopImage = (indexOrUrl) => {
        const currentImages = profileData.shopImages || [];
        let newImages;
        if (typeof indexOrUrl === 'number') {
            newImages = currentImages.filter((_, i) => i !== indexOrUrl);
        } else {
            newImages = currentImages.filter(url => url !== indexOrUrl);
        }
        setProfileData(prev => ({ ...prev, shopImages: newImages }));
    };

    return (
        <LinearGradient
            colors={['#c1ab8eff', '#f2e07bff', '#915200']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}>
            <ScrollView
                contentContainerStyle={[styles.contentContainer, isEditingProfile && { paddingBottom: 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[primaryColor]} />
                }
            >
                {/* Header Card */}
                <View style={[styles.card, { borderColor: secondaryColor, borderWidth: 1 }]}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={[styles.headerTitle, { color: COLORS?.dark }]}>Merchant Profile</Text>
                            <Text style={[styles.headerSubtitle, { color: COLORS?.secondary }]}>Manage your business details</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setIsEditingProfile(!isEditingProfile)}
                            style={[styles.editButton, { borderColor: primaryColor, backgroundColor: isEditingProfile ? '#fff' : 'transparent' }]}
                        >
                            <Text style={{ color: primaryColor, fontWeight: 'bold' }}>{isEditingProfile ? 'Cancel' : 'Edit'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Centered Logo Section */}
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <View style={[styles.logoContainer, { borderColor: secondaryColor, backgroundColor: '#fff', width: 100, height: 100, borderRadius: 50 }]}>
                        {profileData.shopLogo ? (
                            <Image
                                source={{ uri: `${APIURL.replace('/api', '')}${profileData.shopLogo}` }}
                                style={{ width: '100%', height: '100%', borderRadius: 50 }}
                            />
                        ) : (
                            <Text style={{ fontSize: 42, fontWeight: 'bold', color: primaryColor }}>{profileData.name?.charAt(0).toUpperCase()}</Text>
                        )}

                        {isEditingProfile && (
                            <TouchableOpacity
                                style={[styles.cameraButton, { backgroundColor: primaryColor, width: 28, height: 28, borderRadius: 14 }]}
                                onPress={() => handleImageUpload('shopLogo')}
                            >
                                <Icon name="camera" size={12} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {isEditingProfile && profileData.shopLogo ? (
                        <TouchableOpacity onPress={() => setProfileData({ ...profileData, shopLogo: '' })} style={{ marginTop: 10 }}>
                            <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: 'bold' }}>Remove Logo</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Profile Form */}
                <View style={[styles.card, { backgroundColor: '#fff' }]}>
                    <Text style={[styles.sectionTitle, { color: primaryColor }]}>Basic Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryColor }]}>Full Name (Shop Name)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                            value={profileData.name}
                            onChangeText={(text) => setProfileData({ ...profileData, name: text })}
                            editable={isEditingProfile}
                            placeholder="Enter Shop Name"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryColor }]}>Email Address</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                            value={profileData.email}
                            onChangeText={(text) => setProfileData({ ...profileData, email: text })}
                            editable={isEditingProfile}
                            placeholder="Enter Email Address"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryColor }]}>Phone Number</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                            value={profileData.phone}
                            onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
                            editable={isEditingProfile}
                            placeholder="Enter Phone"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryColor }]}>Address</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: lightBg, color: '#000' }]}
                            value={profileData.address}
                            onChangeText={(text) => setProfileData({ ...profileData, address: text })}
                            editable={isEditingProfile}
                            multiline
                            numberOfLines={3}
                            placeholder="Enter Address"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryColor }]}>UPI ID</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                            value={profileData.upiId}
                            onChangeText={(text) => setProfileData({ ...profileData, upiId: text })}
                            editable={isEditingProfile}
                            placeholder="e.g. merchant@upi"
                            placeholderTextColor="#999"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryColor }]}>UPI Number</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                            value={profileData.upiNumber}
                            onChangeText={(text) => setProfileData({ ...profileData, upiNumber: text })}
                            editable={isEditingProfile}
                            placeholder="e.g. 9876543210"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryColor }]}>GSTIN</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                            value={profileData.gstin}
                            onChangeText={(text) => setProfileData({ ...profileData, gstin: text })}
                            editable={isEditingProfile}
                            placeholder="Enter GSTIN"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: primaryColor }]}>Pancard</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                            value={profileData.pancard}
                            onChangeText={(text) => setProfileData({ ...profileData, pancard: text })}
                            editable={isEditingProfile}
                            placeholder="Enter Pancard Number"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { color: primaryColor, marginTop: 10 }]}>Gold Rates (Selling / gm)</Text>
                    <View style={{ flexDirection: 'row', gap: 15, marginBottom: 15 }}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.inputLabel, { color: primaryColor }]}>22K Rate</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                                value={profileData.goldRate22k?.toString()}
                                onChangeText={(text) => setProfileData({ ...profileData, goldRate22k: text.replace(/[^0-9]/g, '') })}
                                editable={isEditingProfile}
                                placeholder="Auto"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.inputLabel, { color: primaryColor }]}>18K Rate</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                                value={profileData.goldRate18k?.toString()}
                                onChangeText={(text) => setProfileData({ ...profileData, goldRate18k: text.replace(/[^0-9]/g, '') })}
                                editable={isEditingProfile}
                                placeholder="Auto"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <Text style={{ fontSize: 10, color: '#999', marginTop: -10, marginBottom: 15 }}>* Leave as "0" or empty to use Live Market rates as fallback.</Text>

                    <Text style={[styles.sectionTitle, { color: primaryColor, marginTop: 10 }]}>Store Branding</Text>

                    {/* Gallery Section */}
                    <Text style={[styles.inputLabel, { color: primaryColor, marginTop: 20 }]}>Store Gallery</Text>
                    <View style={styles.galleryContainer}>
                        {profileData.shopImages && profileData.shopImages.map((img, idx) => (
                            <View key={idx} style={[styles.galleryItem, { borderColor: secondaryColor }]}>
                                <Image
                                    source={{ uri: `${APIURL.replace('/api', '')}${img}` }}
                                    style={styles.galleryImage}
                                />
                                {isEditingProfile && (
                                    <TouchableOpacity
                                        style={styles.removeImageBtn}
                                        onPress={() => removeShopImage(idx)}
                                    >
                                        <Icon name="times" size={10} color="#fff" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}

                        {isEditingProfile && (
                            <TouchableOpacity
                                style={[styles.addGalleryBtn, { borderColor: secondaryColor, backgroundColor: lightBg }]}
                                onPress={() => handleImageUpload('shopImage')}
                                disabled={uploadingDoc}
                            >
                                {uploadingDoc ? (
                                    <ActivityIndicator color={primaryColor} size="small" />
                                ) : (
                                    <>
                                        <Icon name="plus" size={16} color={primaryColor} />
                                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: primaryColor, marginTop: 4 }}>Add Image</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                    {!profileData.shopImages?.length && !isEditingProfile && (
                        <Text style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>No images uploaded.</Text>
                    )}

                </View>

                <View style={{ height: 100 }} />
            </ScrollView >

            {isEditingProfile && (
                <View style={styles.floatingButtonContainer}>
                    <TouchableOpacity
                        style={[styles.floatingSaveButton, { backgroundColor: primaryColor }, updatingProfile && { opacity: 0.7 }]}
                        onPress={() => handleUpdateProfile(profileData)}
                        disabled={updatingProfile}
                    >
                        {updatingProfile ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Icon name="save" size={16} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.floatingSaveButtonText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </LinearGradient >
    );
};

const styles = StyleSheet.create({
    contentContainer: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
        opacity: 0.8,
    },
    editButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        opacity: 0.7,
        marginBottom: 15,
        letterSpacing: 1,
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    input: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    divider: {
        height: 1,
        opacity: 0.5,
        marginVertical: 20,
    },
    brandingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        position: 'relative',
        overflow: 'visible',
    },
    logoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: -5,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    galleryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    galleryItem: {
        width: 100,
        height: 100,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        position: 'relative',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain'
    },
    removeImageBtn: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#dc2626',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addGalleryBtn: {
        width: 100,
        height: 100,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingButtonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingSaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
    },
    floatingSaveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default MerchantProfile;