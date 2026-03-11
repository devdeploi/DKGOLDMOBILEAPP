/* eslint-disable react-native/no-inline-styles */
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { COLORS } from '../styles/theme';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { BASE_URL } from '../constants/api';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BottomNav = ({ activeTab, onTabChange, tabs }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {tabs.map((tab) => (
                <TouchableOpacity
                    key={tab.id}
                    style={styles.tab}
                    onPress={() => onTabChange(tab.id)}
                >
                    {tab.profileImage ? (
                        <Image
                            source={typeof tab.profileImage === 'string' ? { uri: `${BASE_URL}${tab.profileImage}` } : tab.profileImage}
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                marginBottom: 4,
                                backgroundColor: '#fff',
                                borderWidth: activeTab === tab.id ? 2 : 0,
                                borderColor: COLORS?.primary || '#915200'
                            }}
                        />
                    ) : (
                        <Icon
                            name={tab.icon}
                            size={20}
                            color={activeTab === tab.id ? COLORS?.primary : COLORS?.dark}
                            style={{ marginBottom: 4 }}
                        />
                    )}
                    
                    <Text style={[styles.label, activeTab === tab.id && styles.activeLabel]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#ebdc87',
        borderTopWidth: 1,
        borderTopColor: '#e2d183',
        paddingTop: 8,
        justifyContent: 'space-around',
        alignItems: 'flex-start',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        minWidth: 0,
    },
    label: {
        fontSize: 9,
        color: COLORS?.dark,
        textAlign: 'center',
        numberOfLines: 1,
    },
    activeLabel: {
        color: COLORS?.primary,
        fontWeight: 'bold',
    },
});

export default BottomNav;
