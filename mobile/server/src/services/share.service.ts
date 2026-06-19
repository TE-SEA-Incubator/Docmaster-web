import { ShareRepository, DocumentShare } from '../repositories/share.repository.ts';
import crypto from 'crypto';
import { encodeMediaFields } from '../utils/media.utils.ts';

export class ShareService {
  private shareRepository: ShareRepository;

  constructor() {
    this.shareRepository = new ShareRepository();
  }

  /**
   * Create a shareable link
   */
  async createShareLink(documentId: string, userId: string, daysValid?: number): Promise<DocumentShare> {
    const share_token = crypto.randomBytes(32).toString('hex');
    
    let expires_at = null;
    if (daysValid) {
      expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + daysValid);
    }

    return await this.shareRepository.createShare({
      document_id: documentId,
      user_id: userId,
      share_token,
      expires_at
    });
  }

  /**
   * Get shared document info
   */
  async getSharedDocument(token: string): Promise<any> {
    const share = await this.shareRepository.findByToken(token);
    
    if (share && share.id) {
      await this.shareRepository.incrementViewCount(share.id);
    }
    
    return await encodeMediaFields(share);
  }

  /**
   * List shares for a document
   */
  async getDocumentShares(documentId: string, userId: string): Promise<DocumentShare[]> {
    const shares = await this.shareRepository.findByDocumentId(documentId, userId);
    return await encodeMediaFields(shares);
  }

  /**
   * Revoke a share link
   */
  async revokeShare(shareId: string, userId: string): Promise<boolean> {
    return await this.shareRepository.revokeShare(shareId, userId);
  }
}
