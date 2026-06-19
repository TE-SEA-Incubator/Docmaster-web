import React from 'react';
import { View, Text, Pressable, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface FoundPhotoUploadProps {
  photoRecto: string | null;
  photoVerso: string | null;
  onChangeRecto: (uri: string | null) => void;
  onChangeVerso: (uri: string | null) => void;
}

interface PhotoSlotProps {
  label: string;
  sublabel?: string;
  value: string | null;
  onPick: () => void;
  onRemove: () => void;
}

function PhotoSlot({ label, sublabel, value, onPick, onRemove }: PhotoSlotProps) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6 }}>{label}</Text>
      <Pressable
        onPress={onPick}
        style={{
          borderRadius: 14, borderWidth: 2, borderStyle: 'dashed',
          borderColor: value ? '#BBF7D0' : '#E5E7EB',
          backgroundColor: value ? '#F0FDF4' : '#FAFAFA',
          height: 160, justifyContent: 'center', alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {value ? (
          <View style={{ width: '100%', height: '100%' }}>
            <Image source={{ uri: value }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            <Pressable
              onPress={onRemove}
              style={{
                position: 'absolute', top: 8, right: 8,
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: 'rgba(0,0,0,0.5)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Ionicons name="cloud-upload-outline" size={32} color="#D1D5DB" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF' }}>Ajouter une photo</Text>
            {sublabel && <Text style={{ fontSize: 10, color: '#D1D5DB' }}>{sublabel}</Text>}
          </View>
        )}
      </Pressable>
    </View>
  );
}

export function FoundPhotoUpload({ photoRecto, photoVerso, onChangeRecto, onChangeVerso }: FoundPhotoUploadProps) {
  const handlePick = async (side: 'recto' | 'verso') => {
    Alert.alert(
      "Source de l'image",
      "Voulez-vous prendre une photo ou choisir dans la galerie ?",
      [
        {
          text: "Prendre une photo",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission requise', "L'accès à l'appareil photo est nécessaire.");
              return;
            }
            let result = await ImagePicker.launchCameraAsync({
              quality: 0.7,
              allowsEditing: true,
              aspect: [4, 3],
            });
            if (!result.canceled && result.assets?.[0]) {
              const uri = result.assets[0].uri;
              if (side === 'recto') onChangeRecto(uri);
              else onChangeVerso(uri);
            }
          }
        },
        {
          text: "Choisir dans la galerie",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission requise', "L'accès à la galerie est nécessaire.");
              return;
            }
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsMultipleSelection: true,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.7,
            });
            if (!result.canceled && result.assets?.[0]) {
              const uri = result.assets[0].uri;
              if (side === 'recto') onChangeRecto(uri);
              else onChangeVerso(uri);
            }
          }
        },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <PhotoSlot
          label="Photo recto"
          value={photoRecto}
          onPick={() => handlePick('recto')}
          onRemove={() => onChangeRecto(null)}
        />
        <PhotoSlot
          label="Photo verso"
          sublabel="Optionnel"
          value={photoVerso}
          onPick={() => handlePick('verso')}
          onRemove={() => onChangeVerso(null)}
        />
      </View>
      <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 4 }}>
        Les photos aident à identifier le document plus rapidement
      </Text>
    </View>
  );
}