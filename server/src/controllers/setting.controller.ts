import { Request, Response } from 'express';
import { SettingRepository } from '../repositories/setting.repository.ts';
import { getPublicTiming } from '../config/timing.ts';

const settingRepo = new SettingRepository();

/**
 * Public timing contract. The front-end reads every polling interval and
 * phase threshold from this endpoint instead of hard-coding its own clocks.
 */
export const getTiming = (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=300');
  res.json({ success: true, data: getPublicTiming() });
};

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
    const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    const value = await settingRepo.getByKey(key);
    res.json({ success: true, data: value });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const updateSetting = async (req: Request, res: Response) => {
  try {
    const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    const { value } = req.body;
    await settingRepo.update(key, value);
    res.json({ success: true, message: 'Paramètre mis à jour avec succès.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
