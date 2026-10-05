import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

export type AutoriteNiveau = 'HAUTE' | 'NORMAL';

/**
 * DTO for admin creating a new authority
 */
export class CreateAutoriteDTO {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  nom!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @MaxLength(100, { message: 'Le prénom ne peut pas dépasser 100 caractères' })
  prenom!: string;

  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le téléphone ne peut pas dépasser 20 caractères' })
  telephone?: string;

  @IsOptional()
  @IsEnum(['HAUTE', 'NORMAL'], { message: 'Le niveau doit être HAUTE ou NORMAL' })
  niveau?: AutoriteNiveau;

  @IsString()
  @IsNotEmpty({ message: 'La ville est requise' })
  @MaxLength(100, { message: 'La ville ne peut pas dépasser 100 caractères' })
  ville!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La région ne peut pas dépasser 100 caractères' })
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Le département ne peut pas dépasser 100 caractères' })
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "L'arrondissement ne peut pas dépasser 100 caractères" })
  arrondissement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Le bureau ne peut pas dépasser 255 caractères' })
  bureau?: string;
}

/**
 * DTO for authority login
 */
export class LoginAutoriteDTO {
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  mot_de_passe!: string;
}

/**
 * DTO for changing password (first login)
 */
export class ChangePasswordAutoriteDTO {
  @IsString()
  @IsNotEmpty({ message: 'L\'ancien mot de passe est requis' })
  ancien_mot_de_passe!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  nouveau_mot_de_passe!: string;
}

/**
 * DTO for requesting a password reset link
 */
export class ForgotPasswordAutoriteDTO {
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email!: string;
}

/**
 * DTO for resetting the password with a token
 */
export class ResetPasswordAutoriteDTO {
  @IsString()
  @IsNotEmpty({ message: 'Le token est requis' })
  token!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  nouveau_mot_de_passe!: string;
}

/**
 * DTO for admin updating an authority
 */
export class UpdateAutoriteDTO {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  prenom?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telephone?: string;

  @IsOptional()
  @IsEnum(['HAUTE', 'NORMAL'], { message: 'Le niveau doit être HAUTE ou NORMAL' })
  niveau?: AutoriteNiveau;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ville?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  arrondissement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bureau?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
