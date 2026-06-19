import { Request, Response } from 'express';
import { DocumentTypeRepository } from '../repositories/document-type.repository.ts';

const docTypeRepo = new DocumentTypeRepository();

export class DocumentTypeController {
  /**
   * Get all document types (Admin only usually)
   */
  async getAll(req: Request, res: Response) {
    try {
      const types = await docTypeRepo.findAll();
      res.json({ success: true, data: types });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get all active document types (Public)
   */
  async getActive(req: Request, res: Response) {
    try {
      const types = await docTypeRepo.findAllActive();
      res.json({ success: true, data: types });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Create a new document type
   */
  async create(req: Request, res: Response) {
    try {
      const newType = await docTypeRepo.create(req.body);
      res.status(201).json({ success: true, data: newType });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Update a document type
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updatedType = await docTypeRepo.update(id as string, req.body as any);
      if (!updatedType) {
        return res.status(404).json({ success: false, error: 'Document type not found' });
      }
      res.json({ success: true, data: updatedType });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Delete a document type
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await docTypeRepo.delete(id as string);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Document type not found' });
      }
      res.json({ success: true, message: 'Document type deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Toggle active status
   */
  async toggleActive(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updatedType = await docTypeRepo.toggleActive(id as string);
      if (!updatedType) {
        return res.status(404).json({ success: false, error: 'Document type not found' });
      }
      res.json({ success: true, data: updatedType });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
