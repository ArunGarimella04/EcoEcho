import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  Image, 
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  BackHandler
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../styles/theme';
import { useFocusEffect } from '@react-navigation/native';
import { wasteService } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { classifyWasteImage } from '../services/wasteClassifierService';
import { saveScanToHistory } from '../services/historyService';
import { 
  updateProgressAfterScan, 
  initializeAchievements 
} from '../services/achievementService';
import AchievementNotification from '../components/AchievementNotification';

// Define dimensions for the scanner
const { width } = Dimensions.get('window');
const scannerWidth = width * 0.85;
const scannerHeight = scannerWidth * (3/4); // 4:3 aspect ratio

// Map ML category to backend-compatible category
const mapCategory = (mlCategory, materialName) => {
  // Normalize the category and material strings
  const category = mlCategory?.toLowerCase() || '';
  const material = materialName?.toLowerCase() || '';
  
  // Handle compostable materials
  if (category === 'compostable' || 
      material.includes('food_waste') || 
      material.includes('coffee_grounds') || 
      material.includes('tea_bags') ||
      material.includes('eggshells')) {
    return 'Organic';
  }
  
  // Handle plastic materials
  if (material.includes('plastic') || 
      material.includes('styrofoam')) {
    return 'Plastic';
  }
  
  // Handle paper materials
  if (material.includes('paper') || 
      material.includes('cardboard') || 
      material.includes('newspaper') || 
      material.includes('magazine')) {
    return 'Paper';
  }
  
  // Handle glass materials
  if (material.includes('glass')) {
    return 'Glass';
  }
  
  // Handle metal materials
  if (material.includes('aluminum') || 
      material.includes('metal') || 
      material.includes('steel') ||
      material.includes('aerosol')) {
    return 'Metal';
  }
  
  // Handle electronic waste
  if (material.includes('electronic') ||
      material.includes('battery') ||
      material.includes('device')) {
    return 'Electronic';
  }
  
  // Default
  return 'Other';
};

const ScanScreen = ({ navigation }) => {
  // Get insets for Android navigation bar
  const insets = useSafeAreaInsets();
  
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [image, setImage] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Achievement notification states
  const [achievementNotificationVisible, setAchievementNotificationVisible] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  
  // Request camera permissions on component mount
  // Request camera permissions on component mount
  useEffect(() => {
    (async () => {
      try {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        setHasPermission(
          cameraStatus === 'granted' && 
          mediaStatus === 'granted'
        );
        
        if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
          Alert.alert(
            'Permissions Required', 
            'Camera and photo library permissions are needed to use this feature.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.log('Error requesting permissions:', error);
        setHasPermission(false);
      }
    })();
  }, [image]); // Add image to the dependency array
  
  // Reset states when screen comes into focus and handle back button
  useFocusEffect(
    React.useCallback(() => {
      setIsScanning(false);
      setSubmitting(false);
      
      // Handle Android back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (image || scanResult) {
          resetScan();
          return true; // Prevents default back action
        }
        return false; // Let default back action occur
      });
      
      return () => backHandler.remove();
    }, [image, scanResult])
  );
  
  // Launch camera to take a picture
  const takePicture = async () => {
    try {
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: false, // Changed to false as we'll send the image as form data
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setIsScanning(true);
        setImage(result.assets[0].uri);
        
        // Process the image using the ML API
        await analyzeImageWithML(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
      setIsScanning(false);
    }
  };
  
  // Select image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: false, // Changed to false
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setIsScanning(true);
        setImage(result.assets[0].uri);
        
        // Analyze image using the ML API
        await analyzeImageWithML(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image from gallery');
      setIsScanning(false);
    }
  };

  // Analyze image with the waste classification ML API
  // Analyze image with the waste classification ML API
  const analyzeImageWithML = async (imageUri) => {
    try {
      // Call the ML API
      console.log('Sending image to ML API...');
      const mlResult = await classifyWasteImage(imageUri);
      console.log('ML API response:', mlResult);
      
      // Map the ML category to a backend-compatible category
      const backendCategory = mapCategory(mlResult.category, mlResult.class_name);
      
      // Ensure disposal method matches backend enum values
      let disposalMethod = 'Landfill'; // Default to Landfill
      if (mlResult.category === 'compostable') {
        disposalMethod = 'Composted';
      } else if (mlResult.recyclable) {
        disposalMethod = 'Recycled';
      }
      
      // Format the result to match your app's expected format
      const formattedResult = {
        itemName: mlResult.class_name.replace(/_/g, ' '),
        // Use the mapped category for backend compatibility
        category: backendCategory,
        // Keep the original category from ML for display purposes
        mlCategory: mlResult.category || 'unknown',
        isRecyclable: mlResult.recyclable || false,
        confidence: mlResult.confidence / 100, // Convert from percentage to 0-1 scale
        disposalMethod: disposalMethod,
        disposalInstructions: mlResult.disposal_instructions,
        environmentalImpact: mlResult.environmental_impact,
        ecoScore: mlResult.eco_score,
        type: mlResult.class_name.split('_').slice(-1)[0], // Extract type from class name
        weightInGrams: 100, // Default, as ML API doesn't provide weight
        carbonFootprint: 0 // Default, as ML API doesn't provide carbon footprint
      };
      
      // Set scan result
      setScanResult(formattedResult);
      setIsScanning(false);
      
    } catch (error) {
      console.error('ML Analysis error:', error);
      Alert.alert(
        'Analysis Failed', 
        'Could not analyze the image. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      setIsScanning(false);
    }
  };

  // Original analyze function - keep this as fallback if needed
  const analyzeImage = async (imageUri, base64 = null) => {
    try {
      if (!base64) {
        // If base64 not provided, convert from URI
        base64 = await imageToBase64(imageUri);
        if (!base64) {
          throw new Error('Could not process image data');
        }
      }
      
      // Send to backend API for analysis
      const result = await wasteService.analyzeWasteItem(base64);
      
      // Set scan result
      setScanResult(result);
      setIsScanning(false);
      
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert(
        'Analysis Failed', 
        'Could not analyze the image. Please try again.',
        [{ text: 'OK' }]
      );
      setIsScanning(false);
    }
  };
  
  // Reset scanning process
  const resetScan = () => {
    setImage(null);
    setScanResult(null);
    setIsScanning(false);
  };
  
  // Convert image to base64 if needed
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
  
  // Submit waste item to backend
  const handleSubmitWasteItem = async () => {
    if (!scanResult) return;
    
    setSubmitting(true);
    
    try {
      // Ensure category is one of the allowed values
      let category = scanResult.category;
      if (!['Plastic', 'Paper', 'Glass', 'Metal', 'Organic', 'Electronic', 'Other', 'Compostable'].includes(category)) {
        category = 'Other'; // Default to 'Other' if not in the allowed list
      }
      
      // Ensure disposal method is one of the allowed values
      let disposalMethod = 'Landfill'; // Default to Landfill
      if (scanResult.disposalMethod === 'Composted') {
        disposalMethod = 'Composted';
      } else if (scanResult.isRecyclable) {
        disposalMethod = 'Recycled';
      }
      
      // Prepare waste item data with proper backend-compatible format
      const wasteItem = {
        itemName: scanResult.itemName,
        category: category,
        weightInGrams: scanResult.weightInGrams || 100,
        isRecyclable: scanResult.isRecyclable || false,
        carbonFootprint: scanResult.carbonFootprint || 0,
        disposalMethod: disposalMethod,
        itemImage: image ? await imageToBase64(image) : null,
        ecoScore: scanResult.ecoScore || 0
      };
      
      console.log('Submitting waste item to backend:', wasteItem);
      
      // 1. Initialize achievements if needed
      await initializeAchievements();
      
      // 2. Save to local history for offline access
      await saveScanToHistory(scanResult, image);
      
      // 3. Update achievement progress and check for new achievements
      const newAchievements = await updateProgressAfterScan(scanResult);
      
      // Show achievement notification if new achievements were unlocked
      if (newAchievements && newAchievements.length > 0) {
        // Show the first achievement notification
        setCurrentAchievement(newAchievements[0]);
        setAchievementNotificationVisible(true);
      }
      
      // 4. Then try to save to backend database
      try {
        await wasteService.addWasteItem(wasteItem);
      } catch (backendError) {
        console.error('Backend save error:', backendError);
        // If backend save fails, still show success since we saved locally
        console.log('Item saved locally but backend save failed');
      }
      
      // Reset states
      setSubmitting(false);
      
      // Show success message
      Alert.alert(
        'Success!',
        'Waste item logged successfully.',
        [
          { 
            text: 'View Dashboard', 
            onPress: () => {
              // Reset states before navigating
              resetScan();
              navigation.navigate('Dashboard');
            }
          },
          { 
            text: 'Scan Another', 
            onPress: () => resetScan()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting waste item:', error);
      Alert.alert('Error', 'Failed to log waste item. Please try again.');
      setSubmitting(false);
    }
  };

  // View more details about the scanned item
  const viewDetailedResults = () => {
    if (!scanResult) return;
    
    navigation.navigate('ScanResult', {
      scanResult,
      imageUri: image
    });
  };

  // If permissions not granted or still checking
  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.permissionText}>Requesting camera permissions...</Text>
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="no-photography" size={64} color={COLORS.textSecondary} />
        <Text style={styles.permissionText}>
          Camera and gallery permissions are required to scan waste items.
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Calculate bottom padding for Android navigation bar
  const bottomPadding = Math.max(
    Platform.OS === 'ios' ? 34 : 24,
    insets.bottom + 8
  );
  
  // Calculate submit button position to appear above navigation bar
  const submitButtonBottom = Math.max(
    Platform.OS === 'ios' ? 100 : 90,
    insets.bottom + 70
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="close" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Waste</Text>
        <View style={styles.spacer} />
      </View>
      
      {/* Main content */}
      <View style={styles.contentContainer}>
        {/* Instruction text */}
        <Text style={styles.instructionText}>
          {isScanning 
            ? "Scanning..." 
            : scanResult 
              ? "Item identified successfully" 
              : "Take a photo or upload an image of waste to identify it."
          }
        </Text>
        
        {/* Image Preview Area */}
        <View style={styles.scanAreaContainer}>
          {image ? (
            // Show captured image
            <View style={styles.scannerFrame}>
              <Image 
                source={{ uri: image }} 
                style={styles.scannerImage}
                resizeMode="cover"
              />
              
              {isScanning && (
                <View style={styles.scanOverlay}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.scanText}>Analyzing...</Text>
                </View>
              )}
            </View>
          ) : (
            // Show empty placeholder
            <View style={styles.scannerPlaceholder}>
              <MaterialIcons name="photo-camera" size={64} color={COLORS.textSecondary} />
              <Text style={styles.placeholderText}>
                No image selected
              </Text>
            </View>
          )}
        </View>
        
        {/* Results panel */}
        {scanResult && !isScanning && (
          <View style={styles.resultsPanel}>
            <View style={styles.resultsCard}>
              <Text style={styles.analysisLabel}>AI Analysis:</Text>
              <Text style={styles.itemName}>
                {scanResult.itemName} {scanResult.type ? `(${scanResult.type})` : ''}
              </Text>
              <View style={styles.resultDetails}>
                <View style={styles.resultDetailItem}>
                  <MaterialIcons 
                    name={scanResult.isRecyclable ? "check-circle" : "cancel"} 
                    size={18} 
                    color={scanResult.isRecyclable ? "#4CAF50" : "#F44336"} 
                  />
                  <Text style={styles.resultDetailText}>
                    {scanResult.isRecyclable ? 'Recyclable' : 'Not Recyclable'}
                  </Text>
                </View>
                
                {scanResult.confidence && (
                  <View style={styles.resultDetailItem}>
                    <MaterialIcons name="verified" size={18} color="#2196F3" />
                    <Text style={styles.resultDetailText}>
                      {Math.round(scanResult.confidence * 100)}% Confidence
                    </Text>
                  </View>
                )}
                
                {scanResult.ecoScore && (
                  <View style={styles.resultDetailItem}>
                    <MaterialIcons name="eco" size={18} color="#4CAF50" />
                    <Text style={styles.resultDetailText}>
                      EcoScore: {scanResult.ecoScore}
                    </Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.moreDetailsButton}
                onPress={viewDetailedResults}
              >
                <Text style={styles.moreDetailsText}>View Full Details</Text>
                <MaterialIcons name="arrow-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      {/* Action buttons - with dynamic padding for Android navigation */}
      <View style={[styles.buttonContainer, { paddingBottom: bottomPadding }]}>
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={pickImage}
          disabled={isScanning}
        >
          <MaterialIcons name="photo-library" size={24} color={COLORS.textPrimary} />
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.photoButton}
          onPress={image || scanResult ? resetScan : takePicture}
          disabled={isScanning}
        >
          <MaterialIcons 
            name={image || scanResult ? "refresh" : "camera-alt"} 
            size={24} 
            color={COLORS.background} 
          />
          <Text style={styles.photoButtonText}>
            {isScanning ? "Scanning..." : (image || scanResult ? "Reset" : "Take Photo")}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Submit button with dynamic positioning for Android navigation */}
      {scanResult && !submitting && !isScanning && (
        <TouchableOpacity
          style={[styles.submitButton, { bottom: submitButtonBottom }]}
          onPress={handleSubmitWasteItem}
        >
          <MaterialIcons name="check-circle" size={24} color={COLORS.background} />
          <Text style={styles.submitButtonText}>Log this item</Text>
        </TouchableOpacity>
      )}
      
      {/* Loading overlay */}
      {submitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Logging item...</Text>
        </View>
      )}
      
      {/* Achievement notification */}
      <AchievementNotification
        visible={achievementNotificationVisible}
        achievement={currentAchievement}
        onClose={() => {
          setAchievementNotificationVisible(false);
          setCurrentAchievement(null);
        }}
        onViewAchievements={() => {
          navigation.navigate('Achievements');
        }}
      />
    </View>
  );
};

// Keep existing styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    paddingBottom:70,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    backgroundColor: COLORS.background,
    marginTop: Platform.OS === 'android' ? 25:0, // Adjust for Android status bar
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  spacer: {
    width: 44,
  },
  instructionText: {
    color: COLORS.textSecondary,
    fontSize: 18, // Slightly reduced from 20
    textAlign: 'center',
    paddingVertical: 8, // Reduced from 12
    paddingHorizontal: 20,
    marginTop: 10, // Reduced from 20
  },
  scanAreaContainer: {
    flex: 0.8, // Reduce from 1 to take less vertical space
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0, // Remove top padding
    marginTop: -10, // Move up with negative margin
  },
  scannerFrame: {
    width: scannerWidth,
    height: scannerHeight,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: `${COLORS.secondary}`,
    borderStyle: 'dashed',
    position: 'relative',
    maxHeight: 300, // Add maximum height constraint
  },
  scannerPlaceholder: {
    width: scannerWidth,
    height: scannerHeight,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: `${COLORS.secondary}`,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${COLORS.secondary}50`,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  scannerImage: {
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
  },
  resultsPanel: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  resultsCard: {
    backgroundColor: `${COLORS.secondary}90`,
    borderRadius: 12,
    padding: 16,
  },
  analysisLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  itemName: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  resultDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultDetailText: {
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  moreDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
    gap: 6,
  },
  moreDetailsText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 0, // Was 8
    paddingBottom: 16, // Ensure buttons have bottom padding
    gap: 12,
    backgroundColor: COLORS.background,
    elevation: 4,
    zIndex: 10,
    position: 'absolute', // Position at the bottom
    bottom: Platform.OS === 'android' ? 120 : 0, // Account for Android navigation
    left: 0,
    right: 0,
  },
  uploadButton: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 25,
    gap: 8,
  },
  uploadButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  photoButton: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    gap: 8,
  },
  photoButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 8, // Higher elevation for Android
    zIndex: 100, // Ensure it's above other elements
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 33, 24, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontSize: 18,
    marginTop: 20,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default ScanScreen;