import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform,
  ScrollView,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SideBar = ({ onClose, visible, navigation }) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    logout();
    onClose();
  };

  const navigateTo = (screen) => {
    onClose();
    navigation.navigate(screen);
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={[styles.sidebar, { paddingTop: insets.top || 40 }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* User Profile Section */}
          <View style={styles.profileSection}>
            <Image
              source={require('../assets/images/face.jpeg')}
              style={styles.avatar}
            />
            <Text style={styles.userName}>{user?.name || 'EcoEcho User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Eco Warrior</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Navigation Items */}
          <View style={styles.menuItems}>
            <MenuItem 
              icon="home" 
              title="Home" 
              onPress={() => navigateTo('Home')} 
            />
            <MenuItem 
              icon="photo-camera" 
              title="Scan" 
              onPress={() => navigateTo('Scan')} 
            />
            <MenuItem 
              icon="dashboard" 
              title="Dashboard" 
              onPress={() => navigateTo('Dashboard')} 
            />
          </View>
          
          <View style={styles.divider} />

          <View style={styles.menuItems}>
            <Text style={styles.userName}>{'More Features...'}</Text>
          </View>

          {/* Settings & Support */}
          <View style={styles.menuItems}>
            <MenuItem 
              icon="person" 
              title="Profile" 
              onPress={() => navigateTo('Profile')} 
            />
            <MenuItem 
              icon="settings" 
              title="Settings" 
              onPress={() => navigateTo('Settings')} 
            />
            <MenuItem 
              icon="help-outline" 
              title="Help & Support" 
              onPress={() => {}} 
            />
            <MenuItem 
              icon="info-outline" 
              title="About" 
              onPress={() => {}} 
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.menuItems}>
            <Text style={styles.userName}>{'Coming Soon...'}</Text>
          </View>

          {/* Community Features */}
          <View style={styles.menuItems}>
            <MenuItem 
              icon="analytics" 
              title="Analytics" 
              onPress={() => navigateTo('Analytics')} 
            />
            <MenuItem 
              icon="group" 
              title="Community" 
              onPress={() => navigateTo('Community')} 
            />
            <MenuItem 
              icon="location-on" 
              title="Locations" 
              onPress={() => navigateTo('Locations')} 
            />
            <MenuItem 
              icon="emoji-events" 
              title="Challenges" 
              onPress={() => navigateTo('Challenges')} 
            />
            <MenuItem 
              icon="school" 
              title="Education" 
              onPress={() => navigateTo('Education')} 
            />
          </View>

          <View style={styles.divider} />

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color="#FF6B6B" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={styles.versionText}>EcoEcho v1.0</Text>
        </ScrollView>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <MaterialIcons name="chevron-left" size={30} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Menu Item Component
const MenuItem = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <MaterialIcons name={icon} size={24} color={COLORS.textPrimary} />
    <Text style={styles.menuItemText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    width: width * 0.75,
    maxWidth: 320,
    backgroundColor: COLORS.background,
    paddingBottom: Platform.OS === 'android' ? 20 : 0,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: `${COLORS.primary}30`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 4,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.secondary,
    marginVertical: 8,
  },
  menuItems: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 2,
  },
  menuItemText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  versionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
  },
});

export default SideBar;