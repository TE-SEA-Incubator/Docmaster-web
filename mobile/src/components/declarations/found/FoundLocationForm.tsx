import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface FoundLocationFormProps {
  city: string;
  dateFound: Date;
  onChangeCity: (v: string) => void;
  onChangeDate: (v: Date) => void;
}

export function FoundLocationForm({ city, dateFound, onChangeCity, onChangeDate }: FoundLocationFormProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState(city);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const fetchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    try {
      const res = await fetch(
        `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(q)}&countrycodes=cm&limit=5&accept-language=fr`
      );
      const data: SearchResult[] = await res.json();
      setResults(data);
      setShowResults(data.length > 0);
    } catch {
      setResults([]);
      setShowResults(false);
    }
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setDetected(false);
    setResults([]);
    setShowResults(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      fetchResults(text).finally(() => setSearching(false));
    }, 400);
  };

  const handleSearchBlur = () => {
    setTimeout(() => setShowResults(false), 200);
  };

  const selectResult = (item: SearchResult) => {
    const cityName = item.display_name.split(',')[0];
    onChangeCity(cityName);
    setSearchQuery(cityName);
    setShowResults(false);
    setDetected(true);
    setTimeout(() => setDetected(false), 2500);
    inputRef.current?.blur();
  };

  const detectCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      Alert.alert('Non disponible', 'La géolocalisation n\'est pas supportée.');
      return;
    }
    setDetecting(true);
    setDetected(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `${REVERSE_URL}?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=fr`
          );
          const json = await res.json();
          const cityName =
            json.address?.city ||
            json.address?.town ||
            json.address?.village ||
            json.address?.suburb ||
            json.address?.county ||
            '';
          if (cityName) {
            onChangeCity(cityName);
            setSearchQuery(cityName);
            setDetected(true);
            setTimeout(() => setDetected(false), 2500);
          }
        } catch {
          /* silent */
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setDetecting(false);
        Alert.alert('Erreur', 'Impossible de détecter votre position. Vérifiez les autorisations.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [onChangeCity]);

  const handleDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) onChangeDate(selected);
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  return (
    <View style={{ gap: 16 }}>
      <View style={{
        flexDirection: 'row', gap: 12, alignItems: 'center',
        backgroundColor: detected ? '#F0FDF4' : '#FAFAFA',
        borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: detected ? '#BBF7D0' : '#F0F0F0',
      }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: detected ? '#FFFFFF' : '#F0F0F0',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {detecting ? (
            <ActivityIndicator size="small" color="#F5A64B" />
          ) : (
            <Ionicons
              name={detected ? 'checkmark-circle' : 'location-outline'}
              size={20}
              color={detected ? '#16A34A' : '#9CA3AF'}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: detected ? '#16A34A' : '#9CA3AF', textTransform: 'uppercase' }}>
            {detecting ? 'Détection en cours...' : detected ? 'Position détectée' : 'Zone de découverte'}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }}>
            {city || 'Utilisez la recherche ou la géolocalisation'}
          </Text>
        </View>
        {!detecting && !detected && (
          <Pressable
            onPress={detectCurrentLocation}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFF3E0' }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#F5A64B' }}>Détecter</Text>
          </Pressable>
        )}
      </View>

      <View>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 14, borderRadius: 12,
          backgroundColor: '#FAFAFA', borderWidth: 1,
          borderColor: detected ? '#BBF7D0' : '#F0F0F0',
        }}>
          <Ionicons name="search-outline" size={18} color={detected ? '#16A34A' : '#9CA3AF'} />
          <TextInput
            ref={inputRef}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onBlur={handleSearchBlur}
            placeholder="Rechercher un lieu au Cameroun..."
            placeholderTextColor="#D1D5DB"
            autoCorrect={false}
            style={{ flex: 1, paddingVertical: 14, fontSize: 14, color: '#1A1A1A' }}
          />
          {searching && <ActivityIndicator size="small" color="#F5A64B" />}
          {!searching && searchQuery ? (
            <Pressable onPress={() => { setSearchQuery(''); onChangeCity(''); setResults([]); setShowResults(false); setDetected(false); }}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        {showResults && results.length > 0 && (
          <View style={{
            marginTop: 6,
            backgroundColor: '#FFFFFF', borderRadius: 12,
            borderWidth: 1, borderColor: '#E5E7EB',
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
          }}>
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 200 }}>
              {results.map((item, i) => (
                <Pressable
                  key={`${item.lat}-${item.lon}-${i}`}
                  onPress={() => selectResult(item)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    padding: 14,
                    borderBottomWidth: i < results.length - 1 ? 1 : 0,
                    borderBottomColor: '#F0F0F0',
                  }}
                >
                  <Ionicons name="location-sharp" size={16} color="#F5A64B" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }} numberOfLines={1}>
                      {item.display_name.split(',')[0]}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }} numberOfLines={1}>
                      {item.display_name.split(',').slice(1, 3).join(',')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6 }}>
          Ville / Quartier <Text style={{ fontWeight: '400', color: '#9CA3AF' }}>(saisie manuelle)</Text>
        </Text>
        <TextInput
          value={city}
          onChangeText={onChangeCity}
          placeholder="Ex: Douala, Bonanjo"
          placeholderTextColor="#D1D5DB"
          autoCorrect={false}
          style={{
            padding: 14, borderRadius: 12, fontSize: 14, color: '#1A1A1A',
            backgroundColor: '#FAFAFA', borderWidth: 1,
            borderColor: detected ? '#BBF7D0' : '#F0F0F0',
          }}
        />
      </View>

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6 }}>
          Date à laquelle vous avez trouvé le document
        </Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            padding: 14, borderRadius: 12,
            backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0',
          }}
        >
          <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', flex: 1 }}>
            {formatDate(dateFound)}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={dateFound}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
      </View>
    </View>
  );
}