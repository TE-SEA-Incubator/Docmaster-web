import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsEnum,
  MinLength,
  MaxLength,
  IsEmail,
  Matches,
  IsIn,
  IsObject,
  ValidateNested
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export type DeclarationType = 'LOST' | 'FOUND';
export type ReasonTypeType = 'DUPLICATE' | 'INCORRECT_DATA' | 'NO_LONGER_NEEDED' | 'PRIVACY' | 'OTHER';

export class LocationDTO {
  @IsString()
  @IsNotEmpty({ message: 'La ville de la localisation est requise' })
  city!: string;

  @IsNumber()
  @IsNotEmpty({ message: 'La latitude est requise' })
  lat!: number;

  @IsNumber()
  @IsNotEmpty({ message: 'La longitude est requise' })
  long!: number;
}

/**
 * DTO for creating a new declaration (LOST or FOUND)
 */
export class CreateDeclarationDTO {
  @IsString()
  @IsNotEmpty({ message: 'Le type de document est requis' })
  doc_type!: string; // cni, passeport, permis, acte, banque, titre, diplome, autre

  @IsString()
  @IsNotEmpty({ message: 'Le nom du titulaire est requis' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(200, { message: 'Le nom ne peut pas dépasser 200 caractères' })
  owner_name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Le numéro ne peut pas dépasser 100 caractères' })
  document_number?: string;

  @IsString()
  @IsNotEmpty({ message: 'La ville est requise' })
  @MinLength(2, { message: 'La ville doit contenir au moins 2 caractères' })
  ville!: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  region?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  pays?: string;

  @IsString()
  @IsOptional()
  @IsDateString({}, { message: 'date_expiration doit être au format ISO 8601 (YYYY-MM-DD)' })
  date_expiration?: string;

  @IsString()
  @IsOptional()
  @IsDateString({}, { message: 'date_naissance doit être au format ISO 8601 (YYYY-MM-DD)' })
  date_naissance?: string;

  @IsString()
  @IsOptional()
  @IsDateString({}, { message: 'date_perte doit être au format ISO 8601 (YYYY-MM-DD)' })
  date_perte?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['bon', 'abîmé', 'très abîmé', 'moyen', 'abime', 'bon état', 'moyen état'], { 
    message: "etat_physique doit être 'bon', 'moyen', 'abîmé', ou 'très abîmé'" 
  })
  etat_physique?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Basse', 'Modérée', 'Haute', 'Urgente'], {
    message: "urgence_niveau doit être 'Basse', 'Modérée', 'Haute', ou 'Urgente'"
  })
  urgence_niveau?: string;

  @IsNumber()
  @IsOptional()
  recompense_montant?: number;

  @IsString()
  @IsOptional()
  @IsIn(['APP_CHAT', 'EMAIL', 'PHONE'], {
    message: "mode_contact doit être 'APP_CHAT', 'EMAIL', ou 'PHONE'"
  })
  mode_contact?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9\s\-()]+$/, { message: 'Numéro de téléphone invalide' })
  @MaxLength(20)
  telephone_contact?: string;

  @IsString()
  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email_contact?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  transactions_id?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDTO)
  @Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value)
  found_location?: LocationDTO;
}

/**
 * DTO for updating a declaration
 */
export class UpdateDeclarationDTO {
  @IsString()
  @IsOptional()
  owner_name?: string;

  @IsString()
  @IsOptional()
  document_number?: string;

  @IsString()
  @IsOptional()
  ville?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  pays?: string;

  @IsString()
  @IsOptional()
  @IsDateString({}, { message: 'date_expiration doit être au format ISO 8601' })
  date_expiration?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['bon', 'abîmé', 'très abîmé'])
  etat_physique?: string;

  @IsString()
  @IsOptional()
  urgence_niveau?: string;

  @IsNumber()
  @IsOptional()
  recompense_montant?: number;

  @IsString()
  @IsOptional()
  mode_contact?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9\s\-()]+$/)
  telephone_contact?: string;

  @IsString()
  @IsOptional()
  @IsEmail()
  email_contact?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDTO)
  @Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value)
  found_location?: LocationDTO;
}

/**
 * DTO for requesting declaration deletion
 */
export class RequestDeleteDeclarationDTO {
  @IsString()
  @IsNotEmpty({ message: 'Le motif est requis' })
  @MinLength(10, { message: 'Le motif doit contenir au moins 10 caractères' })
  @MaxLength(500, { message: 'Le motif ne peut pas dépasser 500 caractères' })
  reason!: string;

  @IsEnum(['DUPLICATE', 'INCORRECT_DATA', 'NO_LONGER_NEEDED', 'PRIVACY', 'OTHER'], {
    message: "reason_type doit être 'DUPLICATE', 'INCORRECT_DATA', 'NO_LONGER_NEEDED', 'PRIVACY', ou 'OTHER'"
  })
  reason_type!: ReasonTypeType;
}

/**
 * DTO for admin approval/rejection of deletion requests
 */
export class ReviewDeleteionRequestDTO {
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Le commentaire ne peut pas dépasser 500 caractères' })
  admin_comment?: string;
}
