/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { ImageBackground, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { COLORS } from '../styles/theme';

const SetGoldRates = ({
    user,
    profileData,
    setProfileData,
    handleUpdateProfile,
    updatingProfile,
    onRefresh
}) => {
    const [refreshing, setRefreshing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

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

    const handleSave = () => {
        if (handleUpdateProfile) {
            handleUpdateProfile(profileData, 'Rates updated successfully');
            setIsEditing(false);
        }
    };

    return (
        <ImageBackground source={require('../../public/assests/DKGOLDBG.png')} style={{ flex: 1 }} resizeMode="cover">
            <ScrollView
                contentContainerStyle={[styles.contentContainer, isEditing && { paddingBottom: 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {/* Header Card */}
                <View style={[styles.card, { borderColor: secondaryColor, borderWidth: 1 }]}>
                    <View style={styles.headerRow}>
                        <View>
                            <Text style={[styles.headerTitle, { color: COLORS?.dark }]}>Set Gold Rates</Text>
                            <Text style={[styles.headerSubtitle, { color: COLORS?.secondary }]}>Manage your store's selling rates</Text>
                        </View>
                        {!user?.isStaff && (
                            <TouchableOpacity
                                onPress={() => setIsEditing(!isEditing)}
                                style={[styles.editButton, { borderColor: primaryColor, backgroundColor: isEditing ? '#fff' : 'transparent' }]}
                            >
                                <Text style={{ color: primaryColor, fontWeight: 'bold' }}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Rates Form */}
                <View style={[styles.card, { backgroundColor: '#fff' }]}>
                    <Text style={[styles.sectionTitle, { color: primaryColor }]}>Gold Rates (Selling / gm)</Text>
                    
                    <View style={{ flexDirection: 'row', gap: 15, marginBottom: 15, flexWrap: 'wrap' }}>
                        <View style={[styles.inputGroup, { width: '47%' }]}>
                            <Text style={[styles.inputLabel, { color: primaryColor }]}>24K Rate</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                                value={profileData.goldRate24k?.toString()}
                                onChangeText={(text) => setProfileData({ ...profileData, goldRate24k: text.replace(/[^0-9]/g, '') })}
                                editable={isEditing && !user?.isStaff}
                                placeholder="Auto"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { width: '47%' }]}>
                            <Text style={[styles.inputLabel, { color: primaryColor }]}>22K Rate</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                                value={profileData.goldRate22k?.toString()}
                                onChangeText={(text) => setProfileData({ ...profileData, goldRate22k: text.replace(/[^0-9]/g, '') })}
                                editable={isEditing && !user?.isStaff}
                                placeholder="Auto"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { width: '47%' }]}>
                            <Text style={[styles.inputLabel, { color: primaryColor }]}>18K Rate</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                                value={profileData.goldRate18k?.toString()}
                                onChangeText={(text) => setProfileData({ ...profileData, goldRate18k: text.replace(/[^0-9]/g, '') })}
                                editable={isEditing && !user?.isStaff}
                                placeholder="Auto"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { width: '47%' }]}>
                            <Text style={[styles.inputLabel, { color: primaryColor }]}>14K Rate</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                                value={profileData.goldRate14k?.toString()}
                                onChangeText={(text) => setProfileData({ ...profileData, goldRate14k: text.replace(/[^0-9]/g, '') })}
                                editable={isEditing && !user?.isStaff}
                                placeholder="Auto"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { width: '47%' }]}>
                            <Text style={[styles.inputLabel, { color: primaryColor }]}>9K Rate</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                                value={profileData.goldRate9k?.toString()}
                                onChangeText={(text) => setProfileData({ ...profileData, goldRate9k: text.replace(/[^0-9]/g, '') })}
                                editable={isEditing && !user?.isStaff}
                                placeholder="Auto"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={[styles.inputGroup, { width: '47%' }]}>
                            <Text style={[styles.inputLabel, { color: primaryColor }]}>Silver Rate per gram</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: lightBg, color: '#000' }]}
                                value={profileData.silverRate?.toString()}
                                onChangeText={(text) => setProfileData({ ...profileData, silverRate: text.replace(/[^0-9]/g, '') })}
                                editable={isEditing && !user?.isStaff}
                                placeholder="Auto"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <Text style={{ fontSize: 10, color: '#999', marginTop: -10, marginBottom: 15 }}>* Leave as "0" or empty to use Live Market rates as fallback.</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {isEditing && (
                <View style={styles.floatingButtonContainer}>
                    <TouchableOpacity
                        style={[styles.floatingSaveButton, { backgroundColor: primaryColor }, updatingProfile && { opacity: 0.7 }]}
                        onPress={handleSave}
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
        </ImageBackground>
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

export default SetGoldRates;
