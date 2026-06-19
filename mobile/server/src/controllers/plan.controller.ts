import { Request, Response } from 'express';
import { planService } from '../services/plan.service.ts';

export const getAllPlans = async (req: Request, res: Response) => {
  try {
    const plans = await planService.getAllPlans();
    res.status(200).json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlanById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const plan = await planService.getPlanById(id);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.status(200).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePlan = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    const updated = await planService.updatePlan(id, data);
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPlan = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const created = await planService.createPlan(data);
    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeatureDefinitions = async (req: Request, res: Response) => {
  try {
    const definitions = await planService.getFeatureDefinitions();
    res.status(200).json({ success: true, data: definitions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
