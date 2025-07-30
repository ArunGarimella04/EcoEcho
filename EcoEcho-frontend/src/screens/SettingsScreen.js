import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator,
  Platform,
  Switch
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  
  // Get insets for Android navigation bar
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await authService.getProfile();
      setProfileData(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // If the token is invalid, log the user out
      if (error.response && error.response.status === 401) {
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please log in again.",
          [{ 
            text: "OK", 
            onPress: handleLogout 
          }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Logout", 
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const settingsSections = [
    {
      title: "ACCOUNT",
      items: [
        {
          icon: "person",
          title: "Profile",
          subtitle: "View and edit your profile",
          action: () => navigation.navigate('EditProfile')
        },
        {
          icon: "workspace-premium",
          title: "Subscription",
          subtitle: "Manage your subscription",
          action: () => Alert.alert("Coming Soon", "Subscription management will be available soon.")
        },
        {
          icon: "link",
          title: "Connected Accounts",
          subtitle: "Manage your connected accounts",
          action: () => Alert.alert("Coming Soon", "Connected accounts feature will be available soon.")
        }
      ]
    },
    {
      title: "PREFERENCES",
      items: [
        {
          icon: "notifications",
          title: "Notifications",
          subtitle: "Manage your notifications",
          hasSwitch: true,
          switchValue: notificationsEnabled,
          onSwitchChange: (value) => setNotificationsEnabled(value)
        },
        {
          icon: "dark-mode",
          title: "Dark Mode",
          subtitle: "Toggle dark mode",
          hasSwitch: true,
          switchValue: darkModeEnabled,
          onSwitchChange: (value) => setDarkModeEnabled(value)
        },
        {
          icon: "tune",
          title: "App Preferences",
          subtitle: "Manage your app preferences",
          action: () => Alert.alert("Coming Soon", "App preferences will be available soon.")
        }
      ]
    },
    {
      title: "SUPPORT",
      items: [
        {
          icon: "help-outline",
          title: "Help & Support",
          subtitle: "Get help and support",
          action: () => Alert.alert("Support", "Need help? Email us at support@ecoecho.com")
        },
        {
          icon: "info-outline",
          title: "About EcoEcho",
          subtitle: "Learn more about EcoEcho",
          action: () => Alert.alert("About", "EcoEcho v1.0\nMaking recycling easy and rewarding.")
        },
        {
          icon: "privacy-tip",
          title: "Privacy & Terms",
          subtitle: "View our privacy policy and terms",
          action: () => Alert.alert("Privacy", "Read our full privacy policy and terms at ecoecho.com/privacy")
        }
      ]
    }
  ];

  // Calculate bottom padding for Android navigation bar
  const bottomPadding = Platform.OS === 'android' ? 100 : Math.max(20, insets.bottom + 20);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: bottomPadding } // Dynamic padding based on insets
        ]}
        showsVerticalScrollIndicator={true}
      >
        {/* User Profile Card */}
        <TouchableOpacity 
          style={styles.profileCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <Image 
            source={{ 
              uri: user?.profilePicture || 'https://randomuser.me/api/portraits/men/32.jpg' 
            }} 
            style={styles.profileImage} 
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'EcoEcho User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Eco Warrior</Text>
              </View>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.cardGroup}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity 
                  key={itemIndex} 
                  style={styles.card}
                  onPress={item.action}
                  disabled={item.hasSwitch}
                >
                  <View style={styles.iconContainer}>
                    <MaterialIcons name={item.icon} size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.hasSwitch ? (
                    <Switch
                      trackColor={{ false: COLORS.secondary, true: `${COLORS.primary}80` }}
                      thumbColor={item.switchValue ? COLORS.primary : '#f4f3f4'}
                      ios_backgroundColor={COLORS.secondary}
                      onValueChange={item.onSwitchChange}
                      value={item.switchValue}
                    />
                  ) : (
                    <MaterialIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        
        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color="#ff6b6b" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        {/* App Version */}
        <Text style={styles.versionText}>EcoEcho v1.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    zIndex: 10,
    marginTop: Platform.OS === 'android' ? 25 : 0, // Adjust for Android status bar
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    width: 40,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    // paddingBottom will be set dynamically based on insets
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2, // Add shadow for Android
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  profileEmail: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: `${COLORS.primary}30`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardGroup: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    minHeight: 72,
    elevation: 1, // Add subtle shadow for Android
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  logoutText: {
    color: '#ff6b6b',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  }
});

export default SettingsScreen;