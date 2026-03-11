/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../styles/theme';
import Icon from 'react-native-vector-icons/FontAwesome5';

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, type = 'info', onClose, buttons }) => {
    if (!visible) return null;

    let iconName = 'info-circle';

    // Always use brand primary color for visual consistency as requested
    const accentColor = COLORS?.primary || '#915200';
    const bgSecondary = COLORS?.backgroundSecondary || '#f1f1f1';

    if (type === 'success') {
        iconName = 'check-circle';
    } else if (type === 'error') {
        iconName = 'times-circle';
    } else if (type === 'warning') {
        iconName = 'exclamation-triangle';
    }

    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.alertContainer}>
                    <View style={[styles.iconContainer, { backgroundColor: bgSecondary }]}>
                        <Icon name={iconName} size={30} color={accentColor} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {buttons && buttons.length > 0 ? (
                            buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        { backgroundColor: btn.style === 'cancel' ? (COLORS?.secondary || '#666') : (COLORS?.primary || '#000'), flex: buttons.length > 1 ? 1 : 0, minWidth: '40%' }
                                    ]}
                                    onPress={() => {
                                        if (btn.onPress) btn.onPress();
                                        onClose();
                                    }}
                                >
                                    <Text style={styles.buttonText}>{btn.text}</Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: COLORS?.primary || '#915200', minWidth: '50%' }]}
                                onPress={onClose}
                            >
                                <Text style={styles.buttonText}>OK</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContainer: {
        width: width * 0.85,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS?.dark || '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: COLORS?.secondary || '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: 10,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 5
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default CustomAlert;
