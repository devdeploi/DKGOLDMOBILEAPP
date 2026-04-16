/* eslint-disable react-native/no-inline-styles */
/* Force rebuild */

import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { APIURL } from './src/constants/api';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MerchantDashboardScreen from './src/screens/MerchantDashboardScreen';
import UserDashboardScreen from './src/screens/UserDashboardScreen';
import MerchantDetailsScreen from './src/screens/MerchantDetailsScreen';
import IntroScreen from './src/screens/IntroScreen';
import ProfileSelectScreen from './src/screens/ProfileSelectScreen';
import { COLORS } from './src/styles/theme';
import FCMService from './src/services/FCMService';
import AdDisplay from './src/components/AdDisplay';
import SchoolHubAd from './src/components/SchoolHubAd';
import QuickproAd from './src/components/QuickproAd';
import { GoldRateProvider } from './src/context/GoldRateContext';

import AsyncStorage from '@react-native-async-storage/async-storage';

type Role = 'merchant' | 'user';

interface UserData {
  name: string;
  email: string;
  role: Role;
  id: number;
  _id?: string;
  plan: string | null;
  phone?: string;
  address?: string;
  token?: string;
  goldRate18k?: number;
  goldRate22k?: number;
  shopLogo?: string;
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<string>('INTRO');
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [dashboardStartTab, setDashboardStartTab] = useState<string>('dashboard');
  const [ads, setAds] = useState([]);
  const [areAdsPaused, setAreAdsPaused] = useState(false);
  // Multiple-profile support
  const [pendingProfiles, setPendingProfiles] = useState<UserData[]>([]); // Restore paused state logic

  // Merchant-specific Brand Ad logic
  const [showBrandAd, setShowBrandAd] = useState(false);
  const [selectedBrandAd, setSelectedBrandAd] = useState<'quickpro' | 'schoolhub'>('quickpro');

  // Check for stored session on mount
  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user_session');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error reading session:', error);
      } finally {
        setIsLoadingSession(false);
      }
    };
    checkSession();
  }, []);

  // Fetch Ads for Global Display (Users and Merchants)
  const fetchAds = React.useCallback(async () => {
    if (!user) return;
    try {
      const config = user.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};
      let endpoint = `${APIURL}/ads/feed`;
      const { data } = await axios.get(endpoint, config);
      setAds(data);
    } catch (error) {
      console.log("Failed to fetch ads", error);
    }
  }, [user]);

  React.useEffect(() => {
    fetchAds();
    // Refresh ads every 5 minutes
    const interval = setInterval(fetchAds, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAds]);

  // Merchant Brand Ad Interval Logic
  // Merchant Brand Ad Interval Logic Removed

  // Pause Controls for Screens
  const pauseAds = () => setAreAdsPaused(true);
  const resumeAds = () => setAreAdsPaused(false);

  React.useEffect(() => {
    const initNotifications = async () => {
      await FCMService.requestUserPermission();
      await FCMService.createDefaultChannel();
      await FCMService.checkInitialNotification();
    };

    initNotifications();
    const unsubscribe = FCMService.registerForegroundHandler();

    return unsubscribe;
  }, []);

  const handleLogin = async (role: string, userData: any) => {
    // Multiple profiles returned from backend — show selector
    if (userData.multipleProfiles && userData.profiles) {
      setPendingProfiles(userData.profiles);
      setCurrentScreen('PROFILE_SELECT');
      return;
    }

    setUser(userData);
    try {
      await AsyncStorage.setItem('user_session', JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving session:', error);
    }

    if (role === 'merchant') {
      setCurrentScreen('MERCHANT_DASHBOARD');
    } else {
      setDashboardStartTab('dashboard');
      setCurrentScreen('USER_DASHBOARD');
    }
  };

  // Called when user picks a profile from ProfileSelectScreen
  const handleProfileSelect = async (selectedProfile: UserData) => {
    setUser(selectedProfile);
    setPendingProfiles([]);
    try {
      await AsyncStorage.setItem('user_session', JSON.stringify(selectedProfile));
    } catch (error) {
      console.error('Error saving selected profile session:', error);
    }
    setDashboardStartTab('dashboard');
    setCurrentScreen('USER_DASHBOARD');
  };

  // Switch profile — fetch fresh profiles list then show selector
  const handleSwitchProfile = async () => {
    if (!user) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`${APIURL}/users/profiles-by-phone`, config);
      if (data.profiles && data.profiles.length > 1) {
        setPendingProfiles(data.profiles);
        setCurrentScreen('PROFILE_SELECT');
      }
    } catch (error) {
      console.error('Switch profile fetch failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_session');
    } catch (error) {
      console.error('Error removing session:', error);
    }
    setUser(null);
    setCurrentScreen('LOGIN');
    setSelectedMerchant(null);
  };

  const handleRegisterClick = () => {
    setCurrentScreen('REGISTER');
  };

  const handleRegisterSubmit = async (userData: UserData) => {
    setUser(userData);
    try {
      await AsyncStorage.setItem('user_session', JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving session:', error);
    }
    if (userData.role === 'merchant') {
      setCurrentScreen('MERCHANT_DASHBOARD');
    } else {
      setCurrentScreen('USER_DASHBOARD');
    }
  };

  const handleSelectMerchant = (merchant: any) => {
    setSelectedMerchant(merchant);
    setCurrentScreen('MERCHANT_DETAILS');
  };

  const handleBackFromMerchantDetails = () => {
    setDashboardStartTab('merchants');
    setCurrentScreen('USER_DASHBOARD');
  };

  const handleUserUpdate = async (updatedUser: any) => {
    setUser(updatedUser);
    try {
      await AsyncStorage.setItem('user_session', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const renderScreen = () => {
    if (isLoadingSession) {
      return (
        <LinearGradient
            colors={['#c1ab8eff', '#f2e07bff', '#915200']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }} 
            style={{ flex: 1 }} 
        />
      );
    }

    switch (currentScreen) {
      case 'INTRO':
        return (
          <IntroScreen
            onFinish={() => {
              if (user) {
                setCurrentScreen(user.role === 'merchant' ? 'MERCHANT_DASHBOARD' : 'USER_DASHBOARD');
              } else {
                setCurrentScreen('LOGIN');
              }
            }}
          />
        );
      case 'LOGIN':
        return (
          <LoginScreen
            onLogin={handleLogin}
            onRegisterClick={handleRegisterClick}
          />
        );
      case 'REGISTER':
        return (
          <RegisterScreen
            onRegister={handleRegisterSubmit}
            onSwitchToLogin={() => setCurrentScreen('LOGIN')}
          />
        );
      case 'MERCHANT_DASHBOARD':
        return (
          <MerchantDashboardScreen
            user={user}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
            onRefreshAds={fetchAds}
          />
        );
      case 'PROFILE_SELECT':
        return (
          <ProfileSelectScreen
            profiles={pendingProfiles}
            onSelect={handleProfileSelect}
            onLogout={handleLogout}
          />
        );
      case 'USER_DASHBOARD':
        return (
          <UserDashboardScreen
            user={user}
            onLogout={handleLogout}
            onSelectMerchant={handleSelectMerchant}
            onUserUpdate={handleUserUpdate}
            initialTab={dashboardStartTab}
            ads={ads}
            onRefreshAds={fetchAds}
            onSwitchProfile={handleSwitchProfile}
          />
        );
      case 'MERCHANT_DETAILS':
        return (
          <MerchantDetailsScreen
            merchant={selectedMerchant}
            onBack={handleBackFromMerchantDetails}
            user={user}
          />
        );
      default:
        return <LoginScreen onLogin={handleLogin} onRegisterClick={handleRegisterClick} />;
    }
  };


  const isLoginOrRegister = currentScreen === 'LOGIN' || currentScreen === 'REGISTER' || currentScreen === 'INTRO' || currentScreen === 'PROFILE_SELECT';

  const [globalMerchantRates, setGlobalMerchantRates] = useState<any>(null);

  useEffect(() => {
    if (user && user.role === 'user' && user.token) {
      // Fetch primary merchant's rates for customers
      axios.get(`${APIURL}/merchants?limit=20`, {
        headers: { Authorization: `Bearer ${user.token}` }
      }).then(({ data }) => {
        if (data.merchants && data.merchants.length > 0) {
          // Find merchant with active rates, or DK GOLD specifically, or fallback
          const m = data.merchants.find((mer: any) => mer.goldRate22k > 0) || 
                    data.merchants.find((mer: any) => mer.name?.toUpperCase().includes('DK GOLD')) || 
                    data.merchants[0];
          
          setGlobalMerchantRates({
             goldRate18k: m.goldRate18k,
             goldRate22k: m.goldRate22k
          });
        }
      }).catch(err => console.log("Failed to fetch primary merchant rates", err));
    }
  }, [user]);

  // Stabilize merchantRates object to prevent provider re-renders
  const merchantRatesObj = useMemo(() => {
    if (user?.role === 'merchant') {
       return { goldRate18k: user.goldRate18k, goldRate22k: user.goldRate22k };
    }
    return globalMerchantRates;
  }, [user?.role, user?.goldRate18k, user?.goldRate22k, globalMerchantRates]);

  return (
    <SafeAreaProvider>
      <GoldRateProvider merchantRates={merchantRatesObj}>
        <View style={{ flex: 1, backgroundColor: COLORS?.light }}>
          <StatusBar
            barStyle={isLoginOrRegister ? 'light-content' : 'dark-content'}
            backgroundColor="transparent"
            translucent
          />
          {renderScreen()}
          <Toast />
        </View>
      </GoldRateProvider>
    </SafeAreaProvider>
  );
}

export default App;
