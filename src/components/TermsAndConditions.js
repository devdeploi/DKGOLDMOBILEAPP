import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { COLORS } from '../styles/theme';

const { height, width } = Dimensions.get('window');

const TermsAndConditions = ({ visible, onClose, onAccept }) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerIconContainer}>
                            <Icon name="file-contract" size={24} color={COLORS?.primary} />
                        </View>
                        <Text style={styles.title}>Terms of Service</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Icon name="times" size={20} color="#718096" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {/* <Text style={styles.lastUpdated}>Last Updated: Feb 2026</Text> */}

                        <Text style={styles.introText}>
                            Welcome to the DK Gold App. These terms govern your use of our platform as a subscriber. By using this app, you agree to follow the terms and transparent payment policies outlined below.
                        </Text>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>1. User Obligations</Text>
                            <View style={styles.card}>
                                <Text style={styles.cardText}>
                                    As a User, you are responsible for maintaining accurate records of your payments and respecting DK Gold plan terms.
                                </Text>
                                <View style={styles.bulletPoint}>
                                    <Icon name="check" size={12} color={COLORS?.primary} style={{ marginTop: 4, marginRight: 8 }} />
                                    <Text style={styles.bulletText}>Complete plan payments transparently and on time.</Text>
                                </View>
                                <View style={styles.bulletPoint}>
                                    <Icon name="check" size={12} color={COLORS?.primary} style={{ marginTop: 4, marginRight: 8 }} />
                                    <Text style={styles.bulletText}>Provide valid identification details when required by DK Gold.</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>2. Payments & Transactions</Text>
                            <View style={styles.card}>
                                <Text style={styles.cardText}>
                                    DK Gold does not facilitate or process any payments directly through this application software.
                                </Text>
                                <View style={styles.bulletPoint}>
                                    <Icon name="info-circle" size={12} color={COLORS?.primary} style={{ marginTop: 4, marginRight: 8 }} />
                                    <Text style={styles.bulletText}>All monetary transactions are strictly handled between you and DK Gold externally.</Text>
                                </View>
                                <View style={styles.bulletPoint}>
                                    <Icon name="info-circle" size={12} color={COLORS?.primary} style={{ marginTop: 4, marginRight: 8 }} />
                                    <Text style={styles.bulletText}>This app serves exclusively as a digital logbook for tracking your savings progress.</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>3. User Data & Privacy</Text>
                            <View style={styles.card}>
                                <Text style={styles.cardText}>
                                    We prioritize the security of the information you provide to DK Gold.
                                </Text>
                                <View style={styles.bulletPoint}>
                                    <Icon name="lock" size={12} color={COLORS?.primary} style={{ marginTop: 4, marginRight: 8 }} />
                                    <Text style={styles.bulletText}>Personal details and transaction histories are visible only to you and DK Gold management.</Text>
                                </View>
                                <View style={styles.bulletPoint}>
                                    <Icon name="user-shield" size={12} color={COLORS?.primary} style={{ marginTop: 4, marginRight: 8 }} />
                                    <Text style={styles.bulletText}>You have the right to request account deletion or data clarification at any time from DK Gold.</Text>
                                </View>
                            </View>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.acceptButton} onPress={onAccept || onClose} activeOpacity={0.8}>
                            <Text style={styles.acceptButtonText}>I Read and Accept</Text>
                            <Icon name="arrow-right" size={16} color="#fff" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 24,
        width: '100%',
        maxHeight: height * 0.8,
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F7FAFC'
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(214, 158, 46, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A202C',
        flex: 1
    },
    closeButton: {
        padding: 4,
        backgroundColor: '#F7FAFC',
        borderRadius: 20
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    lastUpdated: {
        fontSize: 12,
        color: '#A0AEC0',
        marginBottom: 16,
        textAlign: 'right'
    },
    introText: {
        fontSize: 15,
        color: '#4A5568',
        lineHeight: 24,
        marginBottom: 24
    },
    section: {
        marginBottom: 24
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2D3748',
        marginBottom: 12,
        letterSpacing: 0.3
    },
    card: {
        backgroundColor: '#F7FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#EDF2F7'
    },
    cardText: {
        fontSize: 14,
        color: '#4A5568',
        lineHeight: 22,
        marginBottom: 8
    },
    bulletPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    bulletText: {
        fontSize: 14,
        color: '#4A5568',
        lineHeight: 20,
        flex: 1
    },
    text: {
        fontSize: 14,
        color: '#718096',
        lineHeight: 22
    },
    warningCard: {
        backgroundColor: '#FFF5F5',
        borderColor: '#FEB2B2',
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#C53030',
        marginLeft: 8
    },
    warningText: {
        fontSize: 13,
        color: '#C53030',
        lineHeight: 20
    },
    footer: {
        padding: 24,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F7FAFC'
    },
    acceptButton: {
        backgroundColor: COLORS?.primary,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS?.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5
    }
});

export default TermsAndConditions;
