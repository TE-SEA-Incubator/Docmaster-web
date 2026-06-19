import { deviceRepository, Device } from '../repositories/device.repository.ts';
import { UserService } from '../services/auth.service.ts';
import { subscriptionService } from './subscription.service.ts';
import { encodeMediaFields } from '../utils/media.utils.ts';

const userService = new UserService();

type UploadedPhotosByField = {
  photo_facture?: string[];
  photo_face?: string[];
  photo_serial?: string[];
};

type DeviceUpdatePayload = Device & {
  uploadedPhotos?: UploadedPhotosByField;
};

function normalizePhotosByField(existingPhotos: string[]) {
  const byField = {
    photo_facture: [] as string[],
    photo_face: [] as string[],
    photo_serial: [] as string[],
    extra: [] as string[]
  };

  existingPhotos.forEach((photo, index) => {
    const fileName = photo.split('/').pop()?.toLowerCase() || '';
    if (fileName.startsWith('photo_facture-')) byField.photo_facture.push(photo);
    else if (fileName.startsWith('photo_face-')) byField.photo_face.push(photo);
    else if (fileName.startsWith('photo_serial-')) byField.photo_serial.push(photo);
    else if (index === 0) byField.photo_facture.push(photo);
    else if (index === 1) byField.photo_face.push(photo);
    else if (index === 2) byField.photo_serial.push(photo);
    else byField.extra.push(photo);
  });

  return byField;
}

class DeviceService {
  async registerDevice(deviceData: Device) {
    // 0. Check Subscription Limits
    // Log minimal payload for debugging (avoid exposing sensitive fields)
    try {
      console.log('🔧 [Service] registerDevice called for user:', deviceData.user_id, {
        brand: deviceData.brand,
        model: deviceData.model,
        serial: deviceData.serial_number_imei,
        color: deviceData.color,
        assurance: deviceData.assurance
      });
    } catch (e) {
      console.warn('Failed to log registerDevice payload summary', e);
    }
    const validation = await subscriptionService.validateAction(deviceData.user_id, 'REGISTER_OBJECT');
    if (!(validation as any).allowed) {
      throw new Error((validation as any).reason);
    }

    if (deviceData.serial_number_imei && deviceData.serial_number_imei.trim() !== '') {
      const existing = await deviceRepository.findAnyByIdentifier(deviceData.serial_number_imei);
      if (existing) {
        throw new Error('Un appareil avec ce numéro IMEI/Série est déjà enregistré sur la plateforme.');
      }
    }
    const created = await deviceRepository.create(deviceData);
    try {
      console.log('✅ [Service] device created with id:', created?.id || created?.ID || '<unknown>');
    } catch (e) {}
    return await encodeMediaFields(created);
  }

  async updateDevice(id: string, userId: string, deviceData: DeviceUpdatePayload) {
    const existing = await deviceRepository.findById(id);
    if (!existing || existing.user_id !== userId) {
      throw new Error('Appareil non trouvé ou accès refusé');
    }

    if (deviceData.serial_number_imei && deviceData.serial_number_imei.trim() !== '') {
      const duplicate = await deviceRepository.findAnyByIdentifier(deviceData.serial_number_imei);
      if (duplicate && duplicate.id !== id) {
        throw new Error('Un appareil avec ce numéro IMEI/Série est déjà enregistré sur la plateforme.');
      }
    }

    const existingPhotos = Array.isArray((existing as any).photos)
      ? (existing as any).photos
      : (() => {
          try { return JSON.parse((existing as any).photos || '[]'); } catch { return []; }
        })();
    const existingByField = normalizePhotosByField(existingPhotos);
    const uploaded = deviceData.uploadedPhotos || {};

    const photos = [
      ...(uploaded.photo_facture?.length ? uploaded.photo_facture : existingByField.photo_facture),
      ...(uploaded.photo_face?.length ? uploaded.photo_face : existingByField.photo_face),
      ...(uploaded.photo_serial?.length ? uploaded.photo_serial : existingByField.photo_serial),
      ...existingByField.extra
    ];

    const updated = await deviceRepository.update(id, {
      ...deviceData,
      photos
    });

    return await encodeMediaFields(updated);
  }

  async getUserDevices(userId: string) {
    const devices = await deviceRepository.findByUserId(userId);
    return await encodeMediaFields(devices);
  }

  async getDeviceById(id: string, options: { encode?: boolean } = { encode: true }) {
    const device = await deviceRepository.findById(id);
    if (options.encode) {
      return await encodeMediaFields(device);
    }
    return device;
  }

  async reportLost(id: string, userId: string, password?: string, status: string = 'LOST') {
    const device = await deviceRepository.findById(id);
    if (!device || device.user_id !== userId) {
      throw new Error('Appareil non trouvé ou accès refusé');
    }

    // Verify password if provided (for extra security)
    if (password) {
      const user = await userService.getUserById(userId);
      if (!user) throw new Error('Utilisateur non trouvé');
      
      const isPasswordValid = await userService.verifyPassword(user.mot_de_passe, password);
      if (!isPasswordValid) {
        throw new Error('Mot de passe incorrect');
      }
    }

    // 1. Update status in my_devices
    return await deviceRepository.updateStatus(id, status);
  }

  async reportFound(id: string, userId: string, password?: string) {
    const device = await deviceRepository.findById(id);
    if (!device || device.user_id !== userId) {
      throw new Error('Appareil non trouvé ou accès refusé');
    }

    if (password) {
      const user = await userService.getUserById(userId);
      if (!user) throw new Error('Utilisateur non trouvé');
      const isPasswordValid = await userService.verifyPassword(user.mot_de_passe, password);
      if (!isPasswordValid) throw new Error('Mot de passe incorrect');
    }

    // 1. Update status in my_devices
    return await deviceRepository.updateStatus(id, 'SAFE');
  }

  async deleteDevice(id: string, userId: string) {
    return await deviceRepository.delete(id, userId);
  }

  async verifyDevice(identifier: string) {
    const device = await deviceRepository.findAnyByIdentifier(identifier);
    if (!device) return null;

    // Obfuscate owner name for privacy if needed, or return relevant info
    return {
      id: device.id,
      brand: device.brand,
      model: device.model,
      category: device.category,
      status: device.status,
      owner: `${device.owner_first_name} ${device.owner_last_name.substring(0, 1)}.`,
      is_reported: ['LOST', 'STOLEN', 'PERDU', 'VOLE'].includes(device.status?.toUpperCase())
    };
  }
}

export const deviceService = new DeviceService();
