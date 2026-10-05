import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_PATH = path.join(__dirname, '../docs/cameroon_administrative_divisions.json');

interface Department {
  name: string;
  arrondissements: string[];
}

interface Region {
  region: string;
  departments: Department[];
}

export class LocationService {
  private regions: Region[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const data = readFileSync(JSON_PATH, 'utf8');
      this.regions = JSON.parse(data);
    } catch (err) {
      console.error('❌ [LocationService] Failed to load administrative divisions:', err);
    }
  }

  getArrondissementsByRegion(regionName: string): string[] {
    const region = this.regions.find(r => r.region.toLowerCase() === regionName.toLowerCase());
    if (!region) return [];

    const arrondissements: string[] = [];
    region.departments.forEach(dept => {
      arrondissements.push(...dept.arrondissements);
    });
    return arrondissements;
  }

  /**
   * Find all context locations for a given city/arrondissement name
   */
  getRelatedLocations(cityName: string): string[] {
    const name = cityName.toLowerCase();
    const locations: Set<string> = new Set([name]);

    for (const region of this.regions) {
      for (const dept of region.departments) {
        if (dept.arrondissements.some(arr => arr.toLowerCase().includes(name) || name.includes(arr.toLowerCase()))) {
          locations.add(dept.name.toLowerCase());
          dept.arrondissements.forEach(arr => locations.add(arr.toLowerCase()));
        }
      }
    }
    return Array.from(locations);
  }
}
