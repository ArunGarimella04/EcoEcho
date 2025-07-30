import axios from 'axios';

// NOTE: This is the original version for the local Flask API.
// You must replace 'YOUR_COMPUTER_IP' with your actual local IP address.
const CLASSIFIER_API_URL = 'https://waste-classifier-api-production-a5bb.up.railway.app/'; // Default Flask port is 5000

/**
 * Classifies a waste image using the local Flask API.
 * @param {string} imageUri - The local URI of the image to classify
 * @returns {Promise<object>} - Classification result from the API
 */
export const classifyWasteImage = async (imageUri) => {
  try {
    const formData = new FormData();
    const fileName = imageUri.split('/').pop();
    const fileType = fileName.split('.').pop();

    // Append the file with the correct structure for React Native FormData.
    // The key 'image' must match the key used in the Flask backend (request.files['image']).
    formData.append('image', {
      uri: imageUri,
      name: fileName,
      type: `image/${fileType}`,
    });

    console.log('Sending image to local Flask API...');
    const response = await axios.post(`${CLASSIFIER_API_URL}/predict`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 20000, // Set a longer timeout for image uploads
    });

    console.log('Flask API success:', response.data);
    return response.data;

  } catch (error) {
    if (error.response) {
      console.error('Flask API error:', error.response.status, error.response.data);
    } else {
      console.error('Flask API request error:', error.message);
    }
    throw error;
  }
};

// The functions below are for the full application and interact with your other backend services.
// They are included here to match the structure of your later files.

/**
 * Maps ML model category to standardized category names for cleaner frontend grouping.
 */
const standardizeCategory = (mlCategory, materialName) => {
  const category = mlCategory?.toLowerCase() || '';
  const material = materialName?.toLowerCase() || '';

  if (category === 'compostable' || material.includes('food') || material.includes('coffee') || material.includes('egg') || material.includes('tea')) {
    return 'Organic';
  }
  if (material.includes('plastic') || material.includes('styrofoam')) {
    return 'Plastic';
  }
  if (material.includes('paper') || material.includes('cardboard') || material.includes('magazine') || material.includes('newspaper')) {
    return 'Paper';
  }
  if (material.includes('glass')) {
    return 'Glass';
  }
  if (material.includes('metal') || material.includes('aluminum') || material.includes('steel') || material.includes('aerosol')) {
    return 'Metal';
  }
  if (material.includes('clothing') || material.includes('shoes')) {
    return 'Textile';
  }

  return 'Other';
};

/**
 * Saves the classified item to your app backend.
 */
export const saveClassifiedWasteItem = async (classificationResult, imageUri) => {
  const { wasteService } = require('./api'); // Dynamic import

  try {
    // This function's implementation depends on how your main backend expects data.
    // For example, it might need a Base64 string, requiring a helper function.
    const wasteItem = {
      material: classificationResult.class_name,
      confidence: classificationResult.confidence,
      recyclable: classificationResult.recyclable,
      ecoScore: classificationResult.eco_score,
      // imageData: ... // This would need to be handled, e.g., by converting imageUri to Base64
      category: classificationResult.category,
      date: new Date().toISOString(),
    };

    return await wasteService.addWasteItem(wasteItem);
  } catch (error) {
    console.error('Failed to save waste item:', error);
    throw error;
  }
}