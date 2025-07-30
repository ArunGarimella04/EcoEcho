import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  RefreshControl,
  Modal,
  Animated,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../styles/theme';
import {
  getUserProgress,
  getAchievementsByCategory,
  getAchievementProgress,
  ACHIEVEMENTS
} from '../services/achievementService';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const AchievementsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [userProgress, setUserProgress] = useState(null);
  const [achievements, setAchievements] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [progressData, setProgressData] = useState({});

  // Animation values
  const levelProgressAnim = React.useRef(new Animated.Value(0)).current;

  // Load data when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadAchievementData();
    }, [])
  );

  const loadAchievementData = async () => {
    try {
      setLoading(true);
      
      // Load user progress and points
      const progress = await getUserProgress();
      setUserProgress(progress);
      
      // Load achievements by category
      const achievementsByCategory = getAchievementsByCategory();
      setAchievements(achievementsByCategory);
      
      // Load progress for each achievement
      const progressMap = {};
      for (const achievement of Object.values(ACHIEVEMENTS)) {
        const progressPercent = await getAchievementProgress(achievement.id);
        progressMap[achievement.id] = progressPercent;
      }
      setProgressData(progressMap);
      
      // Animate level progress bar
      if (progress?.nextLevelPoints) {
        const progressPercent = ((1000 - progress.nextLevelPoints) / 1000) * 100;
        Animated.timing(levelProgressAnim, {
          toValue: progressPercent,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }
      
    } catch (error) {
      console.error('Error loading achievement data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAchievementData();
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      milestone: 'flag',
      recycling: 'recycle',
      score: 'trending-up',
      diversity: 'compass',
      streak: 'calendar-check',
      special: 'star',
      social: 'share-variant'
    };
    return iconMap[category] || 'help-circle';
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

  const renderLevelCard = () => {
    if (!userProgress) return null;

    return (
      <View style={styles.levelCard}>
        <View style={styles.levelHeader}>
          <View style={styles.levelIconContainer}>
            <MaterialCommunityIcons
              name="crown"
              size={32}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>Level {userProgress.level}</Text>
            <Text style={styles.levelSubtitle}>
              {userProgress.points.total} points • {userProgress.nextLevelPoints} to next level
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: levelProgressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                    extrapolate: 'clamp',
                  }),
                }
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderCategoryTabs = () => {
    const categories = ['all', ...Object.keys(achievements)];
    
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabs}
        contentContainerStyle={styles.categoryTabsContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              selectedCategory === category && styles.categoryTabActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            {category !== 'all' && (
              <MaterialCommunityIcons
                name={getCategoryIcon(category)}
                size={16}
                color={
                  selectedCategory === category
                    ? COLORS.textOnPrimary
                    : COLORS.textSecondary
                }
              />
            )}
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === category && styles.categoryTabTextActive
              ]}
            >
              {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderAchievementCard = (achievement) => {
    const isUnlocked = userProgress?.progress?.unlockedAchievements?.includes(achievement.id);
    const progress = progressData[achievement.id] || 0;
    const categoryColor = getCategoryColor(achievement.category);

    return (
      <TouchableOpacity
        key={achievement.id}
        style={[
          styles.achievementCard,
          isUnlocked && styles.achievementCardUnlocked,
          { borderColor: isUnlocked ? categoryColor : COLORS.cardBorder }
        ]}
        onPress={() => {
          setSelectedAchievement(achievement);
          setModalVisible(true);
        }}
      >
        <View style={styles.achievementHeader}>
          <View
            style={[
              styles.achievementIconContainer,
              {
                backgroundColor: isUnlocked ? categoryColor + '20' : COLORS.secondaryBackground
              }
            ]}
          >
            <MaterialCommunityIcons
              name={achievement.icon}
              size={24}
              color={isUnlocked ? categoryColor : COLORS.textSecondary}
            />
          </View>
          
          {isUnlocked && (
            <View style={styles.unlockedBadge}>
              <MaterialIcons name="check" size={16} color="white" />
            </View>
          )}
        </View>

        <Text
          style={[
            styles.achievementTitle,
            isUnlocked && styles.achievementTitleUnlocked
          ]}
          numberOfLines={2}
        >
          {achievement.title}
        </Text>

        <Text
          style={[
            styles.achievementDescription,
            isUnlocked && styles.achievementDescriptionUnlocked
          ]}
          numberOfLines={2}
        >
          {achievement.description}
        </Text>

        {!isUnlocked && (
          <View style={styles.progressContainer}>
            <View style={styles.miniProgressBar}>
              <View
                style={[
                  styles.miniProgressFill,
                  { width: `${Math.min(progress, 100)}%`, backgroundColor: categoryColor }
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}

        <View style={styles.achievementFooter}>
          <View style={styles.pointsBadge}>
            <MaterialCommunityIcons name="star" size={12} color={COLORS.primary} />
            <Text style={styles.pointsText}>{achievement.points}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getFilteredAchievements = () => {
    if (selectedCategory === 'all') {
      return Object.values(ACHIEVEMENTS);
    }
    return achievements[selectedCategory] || [];
  };

  const AchievementDetailModal = () => (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {selectedAchievement && (
            <>
              <View style={styles.modalHeader}>
                <View
                  style={[
                    styles.modalIconContainer,
                    { backgroundColor: getCategoryColor(selectedAchievement.category) + '20' }
                  ]}
                >
                  <MaterialCommunityIcons
                    name={selectedAchievement.icon}
                    size={48}
                    color={getCategoryColor(selectedAchievement.category)}
                  />
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>{selectedAchievement.title}</Text>
              <Text style={styles.modalDescription}>
                {selectedAchievement.description}
              </Text>

              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <MaterialCommunityIcons name="star" size={20} color={COLORS.primary} />
                  <Text style={styles.modalStatText}>{selectedAchievement.points} Points</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <MaterialCommunityIcons
                    name={getCategoryIcon(selectedAchievement.category)}
                    size={20}
                    color={getCategoryColor(selectedAchievement.category)}
                  />
                  <Text style={styles.modalStatText}>
                    {selectedAchievement.category.charAt(0).toUpperCase() + selectedAchievement.category.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.modalProgressSection}>
                <Text style={styles.modalProgressTitle}>Progress</Text>
                <View style={styles.modalProgressBar}>
                  <View
                    style={[
                      styles.modalProgressFill,
                      {
                        width: `${Math.min(progressData[selectedAchievement.id] || 0, 100)}%`,
                        backgroundColor: getCategoryColor(selectedAchievement.category)
                      }
                    ]}
                  />
                </View>
                <Text style={styles.modalProgressText}>
                  {Math.round(progressData[selectedAchievement.id] || 0)}% Complete
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {renderLevelCard()}
        
        {renderCategoryTabs()}

        <View style={styles.achievementsGrid}>
          {getFilteredAchievements().map(renderAchievementCard)}
        </View>

        {getFilteredAchievements().length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="trophy-outline"
              size={64}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Achievements Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start scanning to unlock your first achievement!
            </Text>
          </View>
        )}
      </ScrollView>

      <AchievementDetailModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  content: {
    flex: 1,
  },
  levelCard: {
    margin: 16,
    padding: 20,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  levelSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.iconBackground,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  categoryTabs: {
    paddingVertical: 12,
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryBackground,
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
  },
  categoryTabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
    ...FONTS.medium,
  },
  categoryTabTextActive: {
    color: COLORS.textOnPrimary,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: cardWidth,
    padding: 16,
    marginBottom: 16,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  achievementCardUnlocked: {
    backgroundColor: COLORS.iconBackground,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementTitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 4,
    ...FONTS.bold,
  },
  achievementTitleUnlocked: {
    color: COLORS.textPrimary,
  },
  achievementDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
    ...FONTS.regular,
  },
  achievementDescriptionUnlocked: {
    color: COLORS.textSecondary,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: COLORS.iconBackground,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'right',
    ...FONTS.regular,
  },
  achievementFooter: {
    alignItems: 'flex-end',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pointsText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 2,
    ...FONTS.bold,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    ...FONTS.bold,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    ...FONTS.regular,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 20,
    width: width - 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 24,
    color: COLORS.textPrimary,
    marginBottom: 8,
    ...FONTS.bold,
  },
  modalDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
    ...FONTS.regular,
  },
  modalStats: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  modalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  modalStatText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
    ...FONTS.medium,
  },
  modalProgressSection: {
    marginTop: 20,
  },
  modalProgressTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 12,
    ...FONTS.bold,
  },
  modalProgressBar: {
    height: 8,
    backgroundColor: COLORS.iconBackground,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  modalProgressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    ...FONTS.regular,
  },
});

export default AchievementsScreen;
