import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import { wasteService } from '../services/api';
import { saveScanToHistory } from '../services/historyService';
import { useAuth } from '../context/AuthContext';

const ScanResultScreen = ({ route, navigation }) => {
  const { scanResult, imageUri } = route.params;
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  
  const { updateUserWithLocalStats } = useAuth();

  // Get disposal instructions from ML model or use fallback
  const getDisposalInstructions = () => {
    if (scanResult.disposalInstructions) {
      return scanResult.disposalInstructions;
    }
    
    if (scanResult.isRecyclable) {
      return 'Make sure the item is clean and dry before recycling. Remove any non-recyclable parts.';
    } else if (scanResult.category === 'compostable') {
      return 'Add to compost bin or green waste collection. This will break down naturally.';
    } else {
      return 'This item cannot be recycled through standard recycling programs. Dispose in general waste.';
    }
  };
  
  // Get environmental impact from ML model or use fallback
  const getEnvironmentalImpact = () => {
    if (scanResult.environmentalImpact) {
      return scanResult.environmentalImpact;
    }
    
    if (scanResult.isRecyclable) {
      return 'Recycling this item helps conserve natural resources and reduces landfill waste.';
    } else if (scanResult.category === 'compostable') {
      return 'Composting returns nutrients to the soil and reduces methane emissions from landfills.';
    } else {
      return 'Non-recyclable waste contributes to landfill and may take hundreds of years to decompose.';
    }
  };
  
  // Calculate estimated CO2 savings
  const calculateCO2Saved = () => {
    if (scanResult.carbonFootprint) {
      return scanResult.carbonFootprint;
    }
    
    // Estimate based on item type and recyclability
    if (scanResult.isRecyclable) {
      if (scanResult.category === 'plastic' || scanResult.itemName.includes('plastic')) {
        return 0.5; // ~0.5kg CO2 saved for plastic recycling
      } else if (scanResult.category === 'paper' || scanResult.itemName.includes('paper')) {
        return 0.3; // ~0.3kg CO2 saved for paper recycling
      } else if (scanResult.category === 'glass' || scanResult.itemName.includes('glass')) {
        return 0.25; // ~0.25kg CO2 saved for glass recycling
      } else if (scanResult.category === 'metal' || scanResult.itemName.includes('aluminum')) {
        return 0.9; // ~0.9kg CO2 saved for aluminum recycling
      }
      return 0.4; // Default CO2 savings for recyclable items
    }
    
    return 0; // No CO2 savings for non-recyclable items
  };
  
  // Save waste item to database and local history
  const saveWasteItem = async () => {
    try {
      setLoading(true);
      
      // Prepare waste item data
      const wasteItem = {
        itemName: scanResult.itemName,
        category: scanResult.category || 'Other',  // Use 'Other' as fallback
        type: scanResult.type || '',
        weightInGrams: scanResult.weightInGrams || 100,  // Default to 100g
        isRecyclable: scanResult.isRecyclable || false,
        carbonFootprint: calculateCO2Saved(),
        disposalMethod: scanResult.disposalMethod || 
                        (scanResult.isRecyclable ? 'Recycled' : 
                         scanResult.category === 'compostable' ? 'Composted' : 'Landfill'),
        ecoScore: scanResult.ecoScore || 0,
        confidence: scanResult.confidence || 0,
        notes: notes
      };
      
      // Ensure the category is capitalized to match backend enum
      if (wasteItem.category) {
        wasteItem.category = wasteItem.category.charAt(0).toUpperCase() + wasteItem.category.slice(1);
      }
      
      // 1. Save to local history first
      await saveScanToHistory(wasteItem, imageUri);
      
      // 2. Update user stats from local storage - THIS IS THE CRITICAL NEW STEP
      await updateUserWithLocalStats();
      
      // 3. Try to save to backend (if it fails, we've still saved locally and updated user stats)
      try {
        await wasteService.addWasteItem({
          ...wasteItem,
          itemImage: imageUri ? await imageToBase64(imageUri) : null,
        });
      } catch (backendError) {
        console.log('Backend save failed, but item saved to local history', backendError);
        // Still proceed as success since we saved locally and updated user stats
      }
      
      // Show success alert
      Alert.alert(
        'Success!',
        'Waste item logged successfully.',
        [
          { 
            text: 'View Dashboard', 
            onPress: () => navigation.navigate('Dashboard') 
          },
          { 
            text: 'Scan Another', 
            onPress: () => {
              navigation.navigate('Scan');
            }
          }
        ]
      );
      
      setLoading(false);
    } catch (error) {
      console.error('Error saving waste item:', error);
      Alert.alert('Error', 'Failed to save waste item. Please try again.');
      setLoading(false);
    }
  };
  
  // Helper function to convert image to base64 if needed
  const imageToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  };
  
  // Get confidence text
  const getConfidenceText = () => {
    if (!scanResult.confidence) return null;
    
    const confidence = scanResult.confidence;
    if (confidence > 0.8) return 'High confidence';
    if (confidence > 0.5) return 'Medium confidence';
    return 'Low confidence';
  };
  
  // Get status color based on recyclability
  const getStatusColor = () => {
    if (scanResult.category === 'compostable') return '#FFC857'; // Yellow/amber for compostable
    return scanResult.isRecyclable ? '#4CAF50' : '#F44336'; // Green or red
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Results</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.content}>
        {/* Image preview */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: imageUri }} 
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
        
        {/* Item identification */}
        <View style={styles.itemContainer}>
          <View style={styles.itemHeaderRow}>
            <MaterialIcons 
              name={scanResult.isRecyclable ? 'check-circle' : 
                    scanResult.category === 'compostable' ? 'compost' : 'cancel'} 
              size={28} 
              color={getStatusColor()} 
            />
            <Text style={styles.itemName}>{scanResult.itemName}</Text>
          </View>
          
          {scanResult.confidence && (
            <View style={styles.confidenceContainer}>
              <View style={[
                styles.confidenceBadge, 
                { backgroundColor: `${getStatusColor()}20` }
              ]}>
                <Text style={[styles.confidenceText, { color: getStatusColor() }]}>
                  {Math.round(scanResult.confidence * 100)}% {getConfidenceText()}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.itemDetailRow}>
            <Text style={styles.itemDetailLabel}>Category:</Text>
            <Text style={styles.itemDetailValue}>
              {scanResult.category ? 
                scanResult.category.charAt(0).toUpperCase() + scanResult.category.slice(1) : 
                'General'
              }
            </Text>
          </View>
          
          {scanResult.type && (
            <View style={styles.itemDetailRow}>
              <Text style={styles.itemDetailLabel}>Type:</Text>
              <Text style={styles.itemDetailValue}>{scanResult.type}</Text>
            </View>
          )}
          
          {scanResult.ecoScore && (
            <View style={styles.itemDetailRow}>
              <Text style={styles.itemDetailLabel}>EcoScore:</Text>
              <Text style={[
                styles.itemDetailValue, 
                { color: scanResult.ecoScore > 70 ? '#4CAF50' : 
                          scanResult.ecoScore > 40 ? '#FFC857' : '#F44336' }
              ]}>
                {scanResult.ecoScore} / 100
              </Text>
            </View>
          )}
          
          <View style={styles.recyclableContainer}>
            <Text style={[styles.recyclableLabel, { color: getStatusColor() }]}>
              {scanResult.isRecyclable 
                ? 'This item is recyclable' 
                : scanResult.category === 'compostable'
                ? 'This item is compostable'
                : 'This item is not recyclable'
              }
            </Text>
          </View>
        </View>
        
        {/* Environmental impact */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Environmental Impact</Text>
          
          <View style={styles.impactGrid}>
            {scanResult.ecoScore && (
              <View style={styles.impactCard}>
                <MaterialIcons name="eco" size={24} color={COLORS.primary} />
                <Text style={styles.impactValue}>{scanResult.ecoScore}</Text>
                <Text style={styles.impactLabel}>EcoScore</Text>
              </View>
            )}
            
            <View style={styles.impactCard}>
              <MaterialIcons name="cloud" size={24} color={COLORS.primary} />
              <Text style={styles.impactValue}>{calculateCO2Saved()}kg</Text>
              <Text style={styles.impactLabel}>CO₂ Impact</Text>
            </View>
          </View>
          
          {/* Environmental impact text */}
          <View style={styles.impactTextCard}>
            <Text style={styles.impactTextContent}>
              {getEnvironmentalImpact()}
            </Text>
          </View>
        </View>
        
        {/* Disposal instructions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Proper Disposal</Text>
          
          <View style={styles.disposalCard}>
            <MaterialIcons 
              name={scanResult.isRecyclable ? 'recycling' : 
                    scanResult.category === 'compostable' ? 'compost' : 'delete'} 
              size={32} 
              color={COLORS.primary} 
              style={styles.disposalIcon}
            />
            
            <Text style={styles.disposalMethod}>
              {scanResult.disposalMethod || 
                (scanResult.isRecyclable 
                  ? 'Place in recycling bin' 
                  : scanResult.category === 'compostable'
                  ? 'Place in compost bin'
                  : 'Place in general waste'
                )
              }
            </Text>
            
            <Text style={styles.disposalInstructions}>
              {getDisposalInstructions()}
            </Text>
          </View>
        </View>
        
        {/* Bottom spacing for button */}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Save button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveWasteItem}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <>
              <MaterialIcons name="save-alt" size={24} color={COLORS.background} />
              <Text style={styles.saveButtonText}>Log This Item</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    marginTop: Platform.OS === 'android' ? 25 : 0, // Fix Android status bar overlap
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.secondary,
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  itemContainer: {
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: `${COLORS.secondary}90`,
    borderRadius: 12,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // Reduced from 16
    gap: 12,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    flex: 1,
  },
  confidenceContainer: {
    marginBottom: 16,
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 36, // Align with item name
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  itemDetailLabel: {
    width: 100,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  itemDetailValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  recyclableContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.textSecondary}30`,
  },
  recyclableLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  impactGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  impactCard: {
    flex: 1,
    backgroundColor: `${COLORS.secondary}90`,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  impactValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  impactLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  impactTextCard: {
    backgroundColor: `${COLORS.secondary}90`,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  impactTextContent: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  disposalCard: {
    backgroundColor: `${COLORS.secondary}90`,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disposalIcon: {
    marginBottom: 12,
  },
  disposalMethod: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  disposalInstructions: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.secondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ScanResultScreen;