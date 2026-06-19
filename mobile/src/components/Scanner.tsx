import React from 'react';
import { Button, Alert } from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';

interface ScannerProps {
  onScanComplete: (images: string[]) => void;
}

export const DocumentScannerButton: React.FC<ScannerProps> = ({ onScanComplete }) => {
  const scanDocument = async () => {
    try {
      // Démarrage du scan
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        maxNumDocuments: 2,
        croppedImageQuality: 85,
        documentScannerOptions: {
          detectionMode: 'auto',
          enableAutoCrop: true,
        },
      });

      if (status === 'success' && scannedImages && scannedImages.length > 0) {
        onScanComplete(scannedImages);
      } else if (status === 'cancel') {
        console.log('Scan annulé par l\'utilisateur');
      } else {
        Alert.alert('Erreur', 'Une erreur est survenue lors du scan.');
      }
    } catch (error) {
      console.error('Erreur scan:', error);
      Alert.alert('Erreur', 'Impossible de lancer le scanner.');
    }
  };

  return <Button title="Scanner le document" onPress={scanDocument} />;
};

// Fonction utilitaire pour préparer le FormData (à utiliser dans vos services)
export const prepareDocumentForUpload = (imageUris: string[]) => {
  const formData = new FormData();
  
  imageUris.forEach((uri, index) => {
    formData.append(`photo_${index + 1}`, {
      uri,
      type: 'image/jpeg',
      name: `document_page_${index + 1}.jpg`,
    } as any);
  });
  
  return formData;
};
