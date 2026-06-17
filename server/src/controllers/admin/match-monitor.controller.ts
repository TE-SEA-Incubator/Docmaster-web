import { Request, Response } from 'express';
import { query } from '../../database/db.ts';

export const getRecentMatches = async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        m.id,
        m.lost_declaration_id,
        m.found_declaration_id,
        m.score,
        m.status,
        m.created_at,
        m.details,
        ld.identifiant_doc_dm AS lost_identifiant,
        ld.owner_name AS lost_owner_name,
        ld.doc_type AS lost_doc_type,
        ld.ville AS lost_ville,
        ld.quartier AS lost_quartier,
        fd.identifiant_doc_dm AS found_identifiant,
        fd.owner_name AS found_owner_name,
        fd.doc_type AS found_doc_type,
        fd.ville AS found_ville,
        fd.quartier AS found_quartier
      FROM matches m
      LEFT JOIN declarations ld ON ld.id = m.lost_declaration_id
      LEFT JOIN declarations fd ON fd.id = m.found_declaration_id
      ORDER BY m.created_at DESC
      LIMIT 100
    `);

    res.status(200).json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMatchingStats = async (req: Request, res: Response) => {
  try {
    const totalMatches = await query(`SELECT COUNT(*)::int AS count FROM matches`);
    const highConfidence = await query(`SELECT COUNT(*)::int AS count FROM matches WHERE status = 'CONFIRMED'`);
    const potential = await query(`SELECT COUNT(*)::int AS count FROM matches WHERE status = 'PENDING'`);
    const avgScore = await query(`SELECT COALESCE(ROUND(AVG(score)), 0)::int AS avg FROM matches`);

    res.status(200).json({
      success: true,
      data: {
        totalMatches: totalMatches.rows[0].count,
        highConfidence: highConfidence.rows[0].count,
        potential: potential.rows[0].count,
        averageScore: avgScore.rows[0].avg,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
