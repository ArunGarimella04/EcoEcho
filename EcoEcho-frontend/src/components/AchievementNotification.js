import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../styles/theme';

const { width } = Dimensions.get('window');

const AchievementNotification = ({ 
  visible, 
  achievement, 
  onClose,
  onViewAchievements 
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      // Scale up animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-close after 4 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, achievement]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) onClose();
    });
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      milestone: '#FFD700',
      recycling: '#32CD32',
      score: '#FF6347',
      diversity: '#4682B4',
      streak: '#FF69B4',
      special: '#9370DB',
      social: '#20B2AA'
    };
    return colorMap[category] || COLORS.primary;
  };

  if (!visible || !achievement) {
    return null;
  }

  const categoryColor = getCategoryColor(achievement.category);

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Achievement icon */}
          <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
            <MaterialCommunityIcons
              name={achievement.icon}
              size={48}
              color={categoryColor}
            />
          </View>

          {/* Achievement unlocked text */}
          <View style={styles.unlockedBadge}>
            <MaterialIcons name="stars" size={16} color={COLORS.primary} />
            <Text style={styles.unlockedText}>Achievement Unlocked!</Text>
          </View>

          {/* Achievement details */}
          <Text style={styles.title}>{achievement.title}</Text>
          <Text style={styles.description}>{achievement.description}</Text>

          {/* Points earned */}
          <View style={styles.pointsContainer}>
            <MaterialCommunityIcons name="star" size={20} color={COLORS.primary} />
            <Text style={styles.pointsText}>+{achievement.points} points</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleClose}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => {
                if (onViewAchievements) onViewAchievements();
                handleClose();
              }}
            >
              <Text style={styles.viewButtonText}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* Celebration particles */}
          <View style={styles.particle1}>
            <MaterialIcons name="stars" size={16} color={categoryColor} />
          </View>
          <View style={styles.particle2}>
            <MaterialIcons name="stars" size={12} color={COLORS.primary} />
          </View>
          <View style={styles.particle3}>
            <MaterialIcons name="stars" size={14} color={categoryColor} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    width: width - 40,
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.iconBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  unlockedText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 6,
    ...FONTS.bold,
  },
  title: {
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    ...FONTS.bold,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    ...FONTS.regular,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryBackground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  pointsText: {
    fontSize: 16,
    color: COLORS.primary,
    marginLeft: 6,
    ...FONTS.bold,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 25,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  viewButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 16,
    color: COLORS.textOnPrimary,
    ...FONTS.bold,
  },
  particle1: {
    position: 'absolute',
    top: 20,
    left: 30,
    opacity: 0.7,
  },
  particle2: {
    position: 'absolute',
    top: 40,
    right: 25,
    opacity: 0.8,
  },
  particle3: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    opacity: 0.6,
  },
});

export default AchievementNotification;
