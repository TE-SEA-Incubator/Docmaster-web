import type { UserProfile } from './api';

export type LoginInput = {
  email: string;
  mot_de_passe: string;
};

export type RegisterInput = {
  nom: string;
  prenom: string;
  email: string;
  mot_de_passe: string;
  telephone?: string;
  pays?: string;
  ville?: string;
  code_parrainage?: string;
};

export type AuthResponse = {
  token: string;
  user: UserProfile;
};

export type { UserProfile };

