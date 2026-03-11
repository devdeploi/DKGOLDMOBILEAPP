
import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { COLORS } from '../styles/theme';

const { height } = Dimensions.get('window');

const UserPolicy = ({ visible, onClose, onAccept }) => {
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
                            <Icon name="user-shield" size={20} color={COLORS?.primary} />
                        </View>
                        <Text style={styles.title}>Data & Privacy Policy</Text>
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

                        <View style={styles.introBox}>
                            <Text style={styles.introText}>
                                At DK Gold, your personal data and your account's privacy are our top priorities.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>1. Data Collection & Usage</Text>
                            <View style={styles.card}>
                                <Text style={styles.cardText}>
                                    We collect essential personal information and transaction logs to power your gold savings tracking and reward management.
                                </Text>
                                <View style={styles.tagContainer}>
                                    <View style={styles.tag}>
                                        <Icon name="lock" size={10} color={COLORS?.primary} style={{ marginRight: 4 }} />
                                        <Text style={styles.tagText}>Secure</Text>
                                    </View>
                                    <View style={styles.tag}>
                                        <Icon name="user-secret" size={10} color={COLORS?.primary} style={{ marginRight: 4 }} />
                                        <Text style={styles.tagText}>Private</Text>
                                    </View>
                                </View>
                                <Text style={[styles.cardText, { marginTop: 10, fontWeight: '600', color: COLORS?.primary }]}>
                                    We provide the transparency; you maintain your savings at DK Gold.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>2. Service Provider Commitment</Text>
                            <View style={[styles.card, styles.infoCard]}>
                                <View style={styles.infoHeader}>
                                    <Icon name="info-circle" size={16} color="#2B6CB0" />
                                    <Text style={styles.infoTitle}>DK Gold Infrastructure</Text>
                                </View>
                                <Text style={styles.infoText}>
                                    DK Gold provides the technical infrastructure and digital bookkeeping for your gold savings journey. We ensure your records are accurate and always accessible.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>3. User Conduct</Text>
                            <View style={styles.bulletPoint}>
                                <Icon name="check-circle" size={12} color={COLORS?.success} style={{ marginTop: 4, marginRight: 8 }} />
                                <Text style={styles.bulletText}>Maintain accurate profile information and honest payment reporting.</Text>
                            </View>
                            <View style={[styles.bulletPoint, { marginTop: 8 }]}>
                                <Icon name="ban" size={12} color={COLORS?.danger} style={{ marginTop: 4, marginRight: 8 }} />
                                <Text style={styles.bulletText}>Any attempt to misrepresent payments or misuse the platform results in account suspension.</Text>
                            </View>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.acceptButton} onPress={onAccept || onClose} activeOpacity={0.8}>
                            <Text style={styles.acceptButtonText}>I Understand & Accept</Text>
                            <Icon name="check" size={16} color="#fff" style={{ marginLeft: 8 }} />
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
        backgroundColor: '#EBF8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    title: {
        fontSize: 18,
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
    introBox: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#F0FFF4',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#48BB78'
    },
    introText: {
        fontSize: 14,
        color: '#2F855A',
        lineHeight: 22,
        fontStyle: 'italic',
        fontWeight: '500'
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
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#EDF2F7'
    },
    cardText: {
        fontSize: 14,
        color: '#4A5568',
        lineHeight: 22
    },
    tagContainer: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(214, 158, 46, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    tagText: {
        fontSize: 11,
        color: COLORS?.primary,
        fontWeight: '600'
    },
    infoCard: {
        backgroundColor: '#EBF8FF', // Light blue
        borderColor: '#BEE3F8'
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2B6CB0',
        marginLeft: 8
    },
    infoText: {
        fontSize: 13,
        color: '#2C5282',
        lineHeight: 20
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

export default UserPolicy;
