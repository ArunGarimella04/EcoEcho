import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { 
  ActivityIndicator, 
  View, 
  StatusBar, 
  Platform,
  UIManager,
  LayoutAnimation
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegistrationScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScanScreen from './src/screens/ScanScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ScanResultScreen from './src/screens/ScanResultScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
// import EditProfileScreen from './src/screens/EditProfileScreen';

// Import Auth Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Create navigation context
import { NavigationContext } from './src/context/NavigationContext';

// Enable layout animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Enable better screen management for performance
enableScreens();

// Create navigators
const Stack = createStackNavigator();

// Define colors
const COLORS = {
  primary: '#38e07b',
  background: '#122118',
  secondary: '#264532',
  textPrimary: '#FFFFFF',
  textSecondary: '#96c5a9',
  accent: '#6ee7b7',
};

// Loading Screen Component
const LoadingScreen = () => (
  <View style={{ 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: COLORS.background 
  }}>
    <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

// Authentication stack navigator
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Main navigator that checks authentication status
const MainNavigator = () => {
  const { loading, isAuthenticated } = useAuth();
  const [isSidebarVisible, setSidebarVisible] = useState(false);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContext.Provider value={{ 
      isSidebarVisible, 
      setSidebarVisible 
    }}>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: COLORS.primary,
            background: COLORS.background,
            card: COLORS.background,
            text: COLORS.textPrimary,
            border: COLORS.secondary,
            notification: COLORS.primary,
          },
        }}
        onReady={() => {
          // Force layout recalculation when navigation is ready
          if (Platform.OS === 'android') {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            StatusBar.setTranslucent(false);
            setTimeout(() => StatusBar.setTranslucent(true), 50);
          }
        }}
      >
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="transparent" 
          translucent={true}
        />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Scan" component={ScanScreen} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="ScanResult" component={ScanResultScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Gallery" component={GalleryScreen} />
              <Stack.Screen name="Achievements" component={AchievementsScreen} />
              <Stack.Screen name="Analytics" component={AnalyticsScreen} />
              {/* <Stack.Screen name="EditProfile" component={EditProfileScreen} /> */}
            </>
          ) : (
            <Stack.Screen 
              name="Auth" 
              component={AuthStack} 
              options={{ 
                gestureEnabled: false,
                animationEnabled: false 
              }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationContext.Provider>
  );
};

// Root component to handle initialization
const AppRoot = () => {
  // Force layout recalculation on mount
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Short delay to allow system UI to stabilize
      const timer = setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        StatusBar.setTranslucent(false);
        StatusBar.setTranslucent(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <MainNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
};

// Export the theme constants to be used across the app
export { COLORS };

export default AppRoot;