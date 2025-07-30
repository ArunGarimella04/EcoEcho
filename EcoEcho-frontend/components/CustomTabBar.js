import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Import colors from theme
const COLORS = {
  primary: '#38e07b',
  background: '#122118',
  secondary: '#264532', 
  textPrimary: '#FFFFFF',
  textSecondary: '#96c5a9',
};

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const [initialized, setInitialized] = useState(false);
  
  // Force tab bar to render properly on first mount
  useEffect(() => {
    if (!initialized) {
      // Short delay to allow system UI to stabilize
      const timer = setTimeout(() => {
        if (Platform.OS === 'android') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setInitialized(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [initialized]);
  
  // Get Android navigation bar height - crucial for fixing overlap
  const navBarHeight = Platform.OS === 'android' ? 48 : 0;
  
  return (
    <View 
      style={[
        styles.container, 
        // Add extra padding/margin at the bottom to push tab bar above Android nav bar
        { 
          height: 60 + navBarHeight,
          paddingBottom: 0,
          opacity: initialized ? 1 : 0.99, // Force re-render when initialized
        }
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        // Get icon based on route name
        let iconName;
        if (route.name === 'Home') {
          iconName = 'home';
        } else if (route.name === 'Scan') {
          iconName = 'photo-camera';
        } else if (route.name === 'Dashboard') {
          iconName = 'dashboard';
        } else if (route.name === 'Profile') {
          iconName = 'person';
        }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            // Force layout recalculation when switching tabs
            if (Platform.OS === 'android') {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
            android_ripple={{ color: COLORS.secondary, borderless: false }}
          >
            <MaterialIcons 
              name={iconName} 
              size={24} 
              color={isFocused ? COLORS.primary : COLORS.textSecondary} 
            />
            <Text 
              style={[
                styles.tabText, 
                { color: isFocused ? COLORS.primary : COLORS.textSecondary }
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.secondary,
    // Critical styles for proper positioning
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    zIndex: 999,
    paddingHorizontal: 10,
    marginBottom: Platform.OS === 'android' ? 0: 0, // Adjust for Android nav bar
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default CustomTabBar;