import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../styles/theme';
import { getScanHistory } from '../services/historyService';
import { Share } from 'react-native';

const { width, height } = Dimensions.get('window');
const itemSize = (width - 48) / 2; // Two columns with margins

const GalleryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [scanHistory, setScanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // date, category, score

  // Load scan history when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadScanHistory();
    }, [])
  );

  const loadScanHistory = async () => {
    try {
      setLoading(true);
      const history = await getScanHistory(100); // Get more items for gallery
      setScanHistory(history);
    } catch (error) {
      console.error('Error loading scan history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadScanHistory();
  };

  const sortedHistory = React.useMemo(() => {
    const sorted = [...scanHistory];
    switch (sortBy) {
      case 'category':
        return sorted.sort((a, b) => a.category.localeCompare(b.category));
      case 'score':
        return sorted.sort((a, b) => (b.ecoScore || 0) - (a.ecoScore || 0));
      case 'date':
      default:
        return sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
  }, [scanHistory, sortBy]);

  const getCategoryIcon = (category) => {
    const iconMap = {
      'Plastic': 'bottle-soda',
      'Paper': 'newspaper-variant',
      'Glass': 'cup',
      'Metal': 'can',
      'Organic': 'leaf',
      'Electronic': 'cellphone',
      'Other': 'help-circle'
    };
    return iconMap[category] || 'help-circle';
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      'Plastic': '#FF6B6B',
      'Paper': '#4ECDC4',
      'Glass': '#45B7D1',
      'Metal': '#96CEB4',
      'Organic': '#FFEAA7',
      'Electronic': '#DDA0DD',
      'Other': '#A8A8A8'
    };
    return colorMap[category] || '#A8A8A8';
  };

  const shareItem = async (item) => {
    try {
      const message = `I just scanned ${item.itemName}! 🌱\n` +
        `Category: ${item.category}\n` +
        `Eco Score: ${item.ecoScore}/100\n` +
        `${item.isRecyclable ? '♻️ Recyclable' : '🗑️ General Waste'}\n\n` +
        `#EcoEcho #Sustainability #WasteReduction`;

      await Share.share({
        message,
        title: 'My EcoEcho Scan Result',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderGalleryItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.galleryItem,
        { backgroundColor: getCategoryColor(item.category) + '20' }
      ]}
      onPress={() => {
        setSelectedItem(item);
        setModalVisible(true);
      }}
    >
      {item.imageUri ? (
        <Image
          source={{ uri: item.imageUri }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.noImageContainer, { backgroundColor: getCategoryColor(item.category) + '30' }]}>
          <MaterialCommunityIcons
            name={getCategoryIcon(item.category)}
            size={40}
            color={getCategoryColor(item.category)}
          />
        </View>
      )}
      
      <View style={styles.itemOverlay}>
        <View style={styles.itemHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
            <MaterialCommunityIcons
              name={getCategoryIcon(item.category)}
              size={12}
              color="white"
            />
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{item.ecoScore || 0}</Text>
          </View>
        </View>
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.itemName}
          </Text>
          <Text style={styles.itemDate}>
            {new Date(item.timestamp).toLocaleDateString()}
          </Text>
        </View>

        {item.isRecyclable && (
          <MaterialIcons
            name="recycling"
            size={16}
            color={COLORS.primary}
            style={styles.recycleIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="camera-outline"
        size={80}
        color={COLORS.textSecondary}
      />
      <Text style={styles.emptyTitle}>No Scans Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start scanning items to build your gallery!
      </Text>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('Scan')}
      >
        <MaterialIcons name="camera-alt" size={24} color={COLORS.textOnPrimary} />
        <Text style={styles.scanButtonText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  const ItemDetailModal = () => (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Scan Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {selectedItem && (
            <ScrollView style={styles.modalBody}>
              {selectedItem.imageUri && (
                <Image
                  source={{ uri: selectedItem.imageUri }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>{selectedItem.itemName}</Text>
                <Text style={styles.detailDate}>
                  Scanned on {new Date(selectedItem.timestamp).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: getCategoryColor(selectedItem.category) + '20' }]}>
                  <MaterialCommunityIcons
                    name={getCategoryIcon(selectedItem.category)}
                    size={24}
                    color={getCategoryColor(selectedItem.category)}
                  />
                  <Text style={styles.statLabel}>{selectedItem.category}</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{selectedItem.ecoScore || 0}</Text>
                  <Text style={styles.statLabel}>Eco Score</Text>
                </View>

                <View style={styles.statCard}>
                  <MaterialIcons
                    name={selectedItem.isRecyclable ? "recycling" : "delete"}
                    size={24}
                    color={selectedItem.isRecyclable ? COLORS.primary : COLORS.negativeChange}
                  />
                  <Text style={styles.statLabel}>
                    {selectedItem.isRecyclable ? 'Recyclable' : 'General Waste'}
                  </Text>
                </View>
              </View>

              {selectedItem.disposalInstructions && (
                <View style={styles.instructionsSection}>
                  <Text style={styles.sectionTitle}>Disposal Instructions</Text>
                  <Text style={styles.instructionsText}>
                    {selectedItem.disposalInstructions}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => shareItem(selectedItem)}
              >
                <MaterialIcons name="share" size={20} color={COLORS.textOnPrimary} />
                <Text style={styles.shareButtonText}>Share Result</Text>
              </TouchableOpacity>
            </ScrollView>
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
        <Text style={styles.headerTitle}>Scan Gallery</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              const options = ['Date', 'Category', 'Eco Score'];
              Alert.alert(
                'Sort By',
                'Choose sorting option',
                options.map(option => ({
                  text: option,
                  onPress: () => setSortBy(option.toLowerCase().replace(' ', ''))
                }))
              );
            }}
          >
            <MaterialIcons name="sort" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      ) : scanHistory.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <View style={styles.statsHeader}>
            <Text style={styles.statsText}>
              {scanHistory.length} items scanned • {scanHistory.filter(item => item.isRecyclable).length} recyclable
            </Text>
          </View>
          
          <FlatList
            data={sortedHistory}
            renderItem={renderGalleryItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.galleryContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          />
        </>
      )}

      <ItemDetailModal />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    padding: 8,
  },
  statsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  statsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  galleryContainer: {
    padding: 16,
  },
  galleryItem: {
    width: itemSize,
    height: itemSize,
    marginHorizontal: 8,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  itemImage: {
    width: '100%',
    height: '70%',
  },
  noImageContainer: {
    width: '100%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 10,
    color: 'white',
    marginLeft: 2,
    ...FONTS.medium,
  },
  scoreBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scoreText: {
    fontSize: 10,
    color: COLORS.textOnPrimary,
    ...FONTS.bold,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    color: 'white',
    ...FONTS.medium,
  },
  itemDate: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    ...FONTS.regular,
  },
  recycleIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 8,
    ...FONTS.bold,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    ...FONTS.regular,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  scanButtonText: {
    fontSize: 16,
    color: COLORS.textOnPrimary,
    marginLeft: 8,
    ...FONTS.medium,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: 200,
  },
  detailSection: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 24,
    color: COLORS.textPrimary,
    marginBottom: 4,
    ...FONTS.bold,
  },
  detailDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: COLORS.secondaryBackground,
  },
  statNumber: {
    fontSize: 20,
    color: COLORS.primary,
    ...FONTS.bold,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    ...FONTS.regular,
  },
  instructionsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 12,
    ...FONTS.bold,
  },
  instructionsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    ...FONTS.regular,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  shareButtonText: {
    fontSize: 16,
    color: COLORS.textOnPrimary,
    marginLeft: 8,
    ...FONTS.medium,
  },
});

export default GalleryScreen;
