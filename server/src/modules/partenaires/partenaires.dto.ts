import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export type PartenaireStatut = 'ACTIF' | 'SUSPENDU' | 'INACTIF';
export type WalletAdjustType = 'CREDIT' | 'DEBIT';

/**
 * DTO for admin creating a new partner (organisation account)
 */
export class CreatePartenaireDTO {
  @IsString()
  @IsNotEmpty({ message: 'Le nom de l\'organisation est requis' })
  @MaxLength(150, { message: 'Le nom de l\'organisation ne peut pas dépasser 150 caractères' })
  nom_organisation!: string;

  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le téléphone ne peut pas dépasser 20 caractères' })
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le nom du contact ne peut pas dépasser 100 caractères' })
  nom_contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le prénom du contact ne peut pas dépasser 100 caractères' })
  prenom_contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'L\'adresse ne peut pas dépasser 500 caractères' })
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La ville ne peut pas dépasser 100 caractères' })
  ville?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La région ne peut pas dépasser 100 caractères' })
  region?: string;
}

/**
 * DTO for partner login
 */
export class LoginPartenaireDTO {
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  mot_de_passe!: string;
}

/**
 * DTO for refreshing access token
 */
export class RefreshTokenPartenaireDTO {
  @IsString()
  @IsNotEmpty({ message: 'Le refresh token est requis' })
  refresh_token!: string;
}

/**
 * DTO for changing password (first login)
 */
export class ChangePasswordPartenaireDTO {
  @IsString()
  @IsNotEmpty({ message: 'L\'ancien mot de passe est requis' })
  ancien_mot_de_passe!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MaxLength(72, { message: 'Le mot de passe ne peut pas dépasser 72 caractères' })
  nouveau_mot_de_passe!: string;
}

/**
 * DTO for requesting a password reset link
 */
export class ForgotPasswordPartenaireDTO {
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email!: string;
}

/**
 * DTO for resetting the password with a token
 */
export class ResetPasswordPartenaireDTO {
  @IsString()
  @IsNotEmpty({ message: 'Le token est requis' })
  token!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MaxLength(72, { message: 'Le mot de passe ne peut pas dépasser 72 caractères' })
  nouveau_mot_de_passe!: string;
}

/**
 * DTO for admin updating a partner
 */
export class UpdatePartenaireDTO {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nom_organisation?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom_contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  prenom_contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ville?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsEnum(['ACTIF', 'SUSPENDU', 'INACTIF'], { message: 'Le statut doit être ACTIF, SUSPENDU ou INACTIF' })
  statut?: PartenaireStatut;
}

/**
 * DTO for admin wallet adjustment (credit/debit)
 */
export class WalletAdjustDTO {
  @IsEnum(['CREDIT', 'DEBIT'], { message: 'Le type doit être CREDIT ou DEBIT' })
  type!: WalletAdjustType;

  @IsNumber()
  @Min(0.01, { message: 'Le montant doit être supérieur à 0' })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motif?: string;
}

/**
 * DTO for partner updating their own organisation profile.
 * Email, statut and wallet are managed by the admin.
 */
export class UpdateProfilPartenaireDTO {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nom_organisation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom_contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  prenom_contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ville?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;
}
