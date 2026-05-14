import { Request, Response } from 'express';
import { SettingRepository } from '../repositories/setting.repository.ts';

const settingRepo = new SettingRepository();

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await settingRepo.getAll();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSettingByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const value = await settingRepo.getByKey(key);
    res.json({ success: true, data: value });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const updateSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await settingRepo.update(key, value);
    res.json({ success: true, message: 'Paramètre mis à jour avec succès.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
