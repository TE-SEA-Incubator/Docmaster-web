export type ActorType = 'USER' | 'PARTENAIRE' | 'AUTORITE';

export interface Actor {
  type: ActorType;
  id: string;
}

/**
 * Les ids de `users` et `partenaires` coexistent dans des tables distinctes sans contrainte
 * d'unicité croisée : un identifiant technique doit donc toujours porter son type.
 */
export const actorKey = (type: ActorType, id: string): string => `${type}:${id}`;

export const actorFromJwt = (decoded: any): Actor => {
  if (decoded?.type === 'AUTORITE') return { type: 'AUTORITE', id: decoded.id };
  if (decoded?.role === 'PARTNER') return { type: 'PARTENAIRE', id: decoded.id };
  return { type: 'USER', id: decoded.id };
};

export const actorFromRequest = (req: any): Actor | null => {
  const user = req?.user;
  if (!user?.id) return null;
  return actorFromJwt(user);
};

export const isSameActor = (a: Actor, b: Actor): boolean =>
  a.type === b.type && a.id === b.id;
