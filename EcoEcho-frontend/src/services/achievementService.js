import AsyncStorage from '@react-native-async-storage/async-storage';

// Achievement storage keys
export const ACHIEVEMENT_KEYS = {
  ACHIEVEMENTS: 'eco_echo_achievements',
  USER_PROGRESS: 'eco_echo_user_progress',
  BADGES: 'eco_echo_badges',
  POINTS: 'eco_echo_points'
};

// Achievement definitions
export const ACHIEVEMENTS = {
  // Scanning milestones
  FIRST_SCAN: {
    id: 'first_scan',
    title: 'First Steps',
    description: 'Complete your first waste scan',
    icon: 'camera-outline',
    points: 50,
    category: 'milestone',
    requirement: { type: 'scan_count', value: 1 }
  },
  SCAN_VETERAN: {
    id: 'scan_veteran',
    title: 'Scan Veteran',
    description: 'Complete 10 waste scans',
    icon: 'star-outline',
    points: 200,
    category: 'milestone',
    requirement: { type: 'scan_count', value: 10 }
  },
  SCAN_MASTER: {
    id: 'scan_master',
    title: 'Scan Master',
    description: 'Complete 50 waste scans',
    icon: 'trophy-outline',
    points: 500,
    category: 'milestone',
    requirement: { type: 'scan_count', value: 50 }
  },
  ECO_CHAMPION: {
    id: 'eco_champion',
    title: 'Eco Champion',
    description: 'Complete 100 waste scans',
    icon: 'crown-outline',
    points: 1000,
    category: 'milestone',
    requirement: { type: 'scan_count', value: 100 }
  },

  // Recycling achievements
  RECYCLING_ROOKIE: {
    id: 'recycling_rookie',
    title: 'Recycling Rookie',
    description: 'Scan 5 recyclable items',
    icon: 'recycle',
    points: 100,
    category: 'recycling',
    requirement: { type: 'recyclable_count', value: 5 }
  },
  RECYCLING_HERO: {
    id: 'recycling_hero',
    title: 'Recycling Hero',
    description: 'Scan 25 recyclable items',
    icon: 'leaf-outline',
    points: 300,
    category: 'recycling',
    requirement: { type: 'recyclable_count', value: 25 }
  },
  GREEN_GUARDIAN: {
    id: 'green_guardian',
    title: 'Green Guardian',
    description: 'Scan 50 recyclable items',
    icon: 'earth',
    points: 600,
    category: 'recycling',
    requirement: { type: 'recyclable_count', value: 50 }
  },

  // Eco Score achievements
  HIGH_SCORER: {
    id: 'high_scorer',
    title: 'High Scorer',
    description: 'Achieve an average eco score of 70+',
    icon: 'trending-up',
    points: 250,
    category: 'score',
    requirement: { type: 'average_score', value: 70 }
  },
  ECO_PERFECTIONIST: {
    id: 'eco_perfectionist',
    title: 'Eco Perfectionist',
    description: 'Achieve an average eco score of 85+',
    icon: 'medal-outline',
    points: 400,
    category: 'score',
    requirement: { type: 'average_score', value: 85 }
  },

  // Category diversity achievements
  CATEGORY_EXPLORER: {
    id: 'category_explorer',
    title: 'Category Explorer',
    description: 'Scan items from 4 different categories',
    icon: 'compass-outline',
    points: 150,
    category: 'diversity',
    requirement: { type: 'category_diversity', value: 4 }
  },
  WASTE_DETECTIVE: {
    id: 'waste_detective',
    title: 'Waste Detective',
    description: 'Scan items from all 7 waste categories',
    icon: 'magnify',
    points: 350,
    category: 'diversity',
    requirement: { type: 'category_diversity', value: 7 }
  },

  // Streak achievements
  WEEKLY_WARRIOR: {
    id: 'weekly_warrior',
    title: 'Weekly Warrior',
    description: 'Scan items for 7 consecutive days',
    icon: 'calendar-check',
    points: 200,
    category: 'streak',
    requirement: { type: 'daily_streak', value: 7 }
  },
  CONSISTENCY_KING: {
    id: 'consistency_king',
    title: 'Consistency King',
    description: 'Scan items for 30 consecutive days',
    icon: 'calendar-star',
    points: 800,
    category: 'streak',
    requirement: { type: 'daily_streak', value: 30 }
  },

  // Special achievements
  EARLY_BIRD: {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Scan an item before 8 AM',
    icon: 'weather-sunrise',
    points: 75,
    category: 'special',
    requirement: { type: 'early_scan', value: 8 }
  },
  NIGHT_OWL: {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Scan an item after 10 PM',
    icon: 'weather-night',
    points: 75,
    category: 'special',
    requirement: { type: 'late_scan', value: 22 }
  },
  SHARE_THE_LOVE: {
    id: 'share_the_love',
    title: 'Share the Love',
    description: 'Share your first scan result',
    icon: 'share-variant',
    points: 100,
    category: 'social',
    requirement: { type: 'share_count', value: 1 }
  }
};

// Get user-specific storage key
const getUserSpecificKey = async (baseKey) => {
  try {
    const userString = await AsyncStorage.getItem('user');
    if (!userString) return `anonymous_${baseKey}`;
    
    const user = JSON.parse(userString);
    if (!user?._id) return `anonymous_${baseKey}`;
    
    return `${baseKey}_${user._id}`;
  } catch (error) {
    console.error('Error creating achievement storage key:', error);
    return `anonymous_${baseKey}`;
  }
};

// Initialize user progress
export const initializeAchievements = async () => {
  try {
    const progressKey = await getUserSpecificKey(ACHIEVEMENT_KEYS.USER_PROGRESS);
    const pointsKey = await getUserSpecificKey(ACHIEVEMENT_KEYS.POINTS);
    
    const existingProgress = await AsyncStorage.getItem(progressKey);
    const existingPoints = await AsyncStorage.getItem(pointsKey);
    
    if (!existingProgress) {
      const initialProgress = {
        scanCount: 0,
        recyclableCount: 0,
        totalEcoScore: 0,
        categoriesScanned: [],
        dailyStreak: 0,
        lastScanDate: null,
        shareCount: 0,
        unlockedAchievements: [],
        pendingAchievements: []
      };
      await AsyncStorage.setItem(progressKey, JSON.stringify(initialProgress));
    }
    
    if (!existingPoints) {
      await AsyncStorage.setItem(pointsKey, JSON.stringify({ total: 0, earned: [] }));
    }
  } catch (error) {
    console.error('Error initializing achievements:', error);
  }
};

// Update user progress after a scan
export const updateProgressAfterScan = async (scanResult) => {
  try {
    const progressKey = await getUserSpecificKey(ACHIEVEMENT_KEYS.USER_PROGRESS);
    const progressString = await AsyncStorage.getItem(progressKey);
    
    if (!progressString) {
      await initializeAchievements();
      return updateProgressAfterScan(scanResult);
    }
    
    const progress = JSON.parse(progressString);
    const now = new Date();
    const today = now.toDateString();
    
    // Update basic stats
    progress.scanCount += 1;
    if (scanResult.isRecyclable) {
      progress.recyclableCount += 1;
    }
    progress.totalEcoScore += (scanResult.ecoScore || 0);
    
    // Update categories
    if (scanResult.category && !progress.categoriesScanned.includes(scanResult.category)) {
      progress.categoriesScanned.push(scanResult.category);
    }
    
    // Update streak
    const lastScanDate = progress.lastScanDate ? new Date(progress.lastScanDate).toDateString() : null;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (!lastScanDate || lastScanDate === yesterday.toDateString()) {
      // Continue or start streak
      if (lastScanDate !== today) {
        progress.dailyStreak += 1;
      }
    } else if (lastScanDate !== today) {
      // Reset streak if gap > 1 day
      progress.dailyStreak = 1;
    }
    
    progress.lastScanDate = now.toISOString();
    
    // Check for new achievements
    const newAchievements = await checkAchievements(progress);
    
    // Save updated progress
    await AsyncStorage.setItem(progressKey, JSON.stringify(progress));
    
    return newAchievements;
  } catch (error) {
    console.error('Error updating progress after scan:', error);
    return [];
  }
};

// Check which achievements have been unlocked
export const checkAchievements = async (progress) => {
  try {
    const newlyUnlocked = [];
    
    for (const achievement of Object.values(ACHIEVEMENTS)) {
      // Skip if already unlocked
      if (progress.unlockedAchievements.includes(achievement.id)) {
        continue;
      }
      
      let isUnlocked = false;
      const requirement = achievement.requirement;
      
      switch (requirement.type) {
        case 'scan_count':
          isUnlocked = progress.scanCount >= requirement.value;
          break;
        case 'recyclable_count':
          isUnlocked = progress.recyclableCount >= requirement.value;
          break;
        case 'average_score':
          const averageScore = progress.scanCount > 0 ? 
            progress.totalEcoScore / progress.scanCount : 0;
          isUnlocked = averageScore >= requirement.value;
          break;
        case 'category_diversity':
          isUnlocked = progress.categoriesScanned.length >= requirement.value;
          break;
        case 'daily_streak':
          isUnlocked = progress.dailyStreak >= requirement.value;
          break;
        case 'share_count':
          isUnlocked = progress.shareCount >= requirement.value;
          break;
        case 'early_scan':
          const hour = new Date().getHours();
          isUnlocked = hour < requirement.value;
          break;
        case 'late_scan':
          const nightHour = new Date().getHours();
          isUnlocked = nightHour >= requirement.value;
          break;
      }
      
      if (isUnlocked) {
        progress.unlockedAchievements.push(achievement.id);
        newlyUnlocked.push(achievement);
        
        // Award points
        await awardPoints(achievement.points, achievement.id);
      }
    }
    
    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};

// Award points for achievements
export const awardPoints = async (points, achievementId) => {
  try {
    const pointsKey = await getUserSpecificKey(ACHIEVEMENT_KEYS.POINTS);
    const pointsString = await AsyncStorage.getItem(pointsKey);
    
    const pointsData = pointsString ? JSON.parse(pointsString) : { total: 0, earned: [] };
    
    pointsData.total += points;
    pointsData.earned.push({
      points,
      achievementId,
      timestamp: new Date().toISOString()
    });
    
    await AsyncStorage.setItem(pointsKey, JSON.stringify(pointsData));
  } catch (error) {
    console.error('Error awarding points:', error);
  }
};

// Update share count
export const updateShareCount = async () => {
  try {
    const progressKey = await getUserSpecificKey(ACHIEVEMENT_KEYS.USER_PROGRESS);
    const progressString = await AsyncStorage.getItem(progressKey);
    
    if (progressString) {
      const progress = JSON.parse(progressString);
      progress.shareCount += 1;
      await AsyncStorage.setItem(progressKey, JSON.stringify(progress));
      
      // Check for sharing achievements
      return await checkAchievements(progress);
    }
    
    return [];
  } catch (error) {
    console.error('Error updating share count:', error);
    return [];
  }
};

// Get user progress
export const getUserProgress = async () => {
  try {
    const progressKey = await getUserSpecificKey(ACHIEVEMENT_KEYS.USER_PROGRESS);
    const pointsKey = await getUserSpecificKey(ACHIEVEMENT_KEYS.POINTS);
    
    const progressString = await AsyncStorage.getItem(progressKey);
    const pointsString = await AsyncStorage.getItem(pointsKey);
    
    const progress = progressString ? JSON.parse(progressString) : null;
    const points = pointsString ? JSON.parse(pointsString) : { total: 0, earned: [] };
    
    return {
      progress,
      points,
      level: Math.floor(points.total / 1000) + 1, // Level up every 1000 points
      nextLevelPoints: ((Math.floor(points.total / 1000) + 1) * 1000) - points.total
    };
  } catch (error) {
    console.error('Error getting user progress:', error);
    return {
      progress: null,
      points: { total: 0, earned: [] },
      level: 1,
      nextLevelPoints: 1000
    };
  }
};

// Get unlocked achievements
export const getUnlockedAchievements = async () => {
  try {
    const progressKey = await getUserSpecificKey(ACHIEVEMENT_KEYS.USER_PROGRESS);
    const progressString = await AsyncStorage.getItem(progressKey);
    
    if (!progressString) return [];
    
    const progress = JSON.parse(progressString);
    return progress.unlockedAchievements.map(id => ACHIEVEMENTS[id.toUpperCase()]).filter(Boolean);
  } catch (error) {
    console.error('Error getting unlocked achievements:', error);
    return [];
  }
};

// Get achievements by category
export const getAchievementsByCategory = () => {
  const categories = {};
  
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    if (!categories[achievement.category]) {
      categories[achievement.category] = [];
    }
    categories[achievement.category].push(achievement);
  });
  
  return categories;
};

// Calculate achievement progress percentage
export const getAchievementProgress = async (achievementId) => {
  try {
    const progressKey = await getUserSpecificKey(ACHIEVEMENT_KEYS.USER_PROGRESS);
    const progressString = await AsyncStorage.getItem(progressKey);
    
    if (!progressString) return 0;
    
    const progress = JSON.parse(progressString);
    const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);
    
    if (!achievement) return 0;
    
    const requirement = achievement.requirement;
    let currentValue = 0;
    
    switch (requirement.type) {
      case 'scan_count':
        currentValue = progress.scanCount;
        break;
      case 'recyclable_count':
        currentValue = progress.recyclableCount;
        break;
      case 'average_score':
        currentValue = progress.scanCount > 0 ? progress.totalEcoScore / progress.scanCount : 0;
        break;
      case 'category_diversity':
        currentValue = progress.categoriesScanned.length;
        break;
      case 'daily_streak':
        currentValue = progress.dailyStreak;
        break;
      case 'share_count':
        currentValue = progress.shareCount;
        break;
    }
    
    return Math.min((currentValue / requirement.value) * 100, 100);
  } catch (error) {
    console.error('Error calculating achievement progress:', error);
    return 0;
  }
};
