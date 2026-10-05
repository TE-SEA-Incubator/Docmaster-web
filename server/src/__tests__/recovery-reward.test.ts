import { describe, it, expect } from 'vitest';
import { numOr, resolveFinderRewardBasis } from '../utils/recovery.utils.ts';

const docType = { nom: 'Carte Grise', prix_retrouvaille: 5000, finder_percent: 80, points_recompense: 75 };

describe("resolveFinderRewardBasis — récompense indexée sur l'encaissement", () => {
  it('utilise le montant payé enregistré sur le claim', () => {
    expect(resolveFinderRewardBasis({ amount: 2500, currency: 'XAF' }, docType)).toEqual({
      amount: 2500,
      source: 'claim',
    });
  });

  it('conserve un tarif à 0 FCFA explicite au lieu de le remplacer par un défaut', () => {
    const basis = resolveFinderRewardBasis({ amount: null }, { ...docType, prix_retrouvaille: 0 });
    expect(basis).toEqual({ amount: 0, source: 'docType' });
    expect((basis!.amount * numOr(docType.finder_percent, 80)) / 100).toBe(0);
  });

  it('retombe sur le tarif seulement pour les claims antérieurs à la persistance du paiement', () => {
    expect(resolveFinderRewardBasis({ amount: undefined }, docType)).toEqual({
      amount: 5000,
      source: 'docType',
    });
  });

  it('refuse de calculer sans aucune base de paiement', () => {
    expect(resolveFinderRewardBasis({ amount: null }, { prix_retrouvaille: null })).toBeNull();
    expect(resolveFinderRewardBasis({ amount: 'abc' }, {})).toBeNull();
  });
});

describe('numOr', () => {
  it('ne remplace jamais un 0 légitime', () => {
    expect(numOr(0, 80)).toBe(0);
    expect(numOr('0.00', 80)).toBe(0);
  });

  it('applique le défaut pour null, undefined et NaN', () => {
    expect(numOr(null, 80)).toBe(80);
    expect(numOr(undefined, 80)).toBe(80);
    expect(numOr('abc', 80)).toBe(80);
  });
});
