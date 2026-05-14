import { Router } from 'express';
import * as SettingController from '../controllers/setting.controller.ts';

const router = Router();

router.get('/', SettingController.getSettings);
router.get('/:key', SettingController.getSettingByKey);
router.post('/:key', SettingController.updateSetting);

export default router;
