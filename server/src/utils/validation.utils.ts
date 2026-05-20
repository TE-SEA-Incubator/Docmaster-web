import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

/**
 * Format validation errors in a readable way, including nested objects
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  const extractErrors = (errorList: ValidationError[], parentPath = '') => {
    for (const error of errorList) {
      // Construit le chemin de la clé (ex: "found_location.city" au lieu de juste "city")
      const fieldName = parentPath ? `${parentPath}.${error.property}` : error.property;
      
      // Si l'erreur contient des contraintes directes à ce niveau
      if (error.constraints) {
        const constraints = Object.values(error.constraints);
        formatted[fieldName] = constraints.map(c => c.toString());
      }
      
      // Si c'est un objet imbriqué (@ValidateNested), on descend récursivement dans les "children"
      if (error.children && error.children.length > 0) {
        // Optionnel : si vous voulez aussi garder une trace sur la clé parente elle-même
        if (!formatted[fieldName]) {
          formatted[fieldName] = [];
        }
        extractErrors(error.children, fieldName);
        
        // Nettoyage : Si la clé parente n'a pas d'erreurs directes mais que ses enfants en ont,
        // on supprime le tableau vide de la clé parente pour ne pas polluer le log.
        if (formatted[fieldName].length === 0) {
          delete formatted[fieldName];
        }
      }
    }
  };

  extractErrors(errors);
  return formatted;
}

/**
 * Validate a DTO class
 * Returns formatted errors or null if valid.
 * Also mutates the passed 'dto' object so the controller receives parsed numbers/objects.
 */
export async function validateDTO<T extends object>(dto: any, dtoClass: any): Promise<Record<string, string[]> | null> {
  // 1. Transforme l'objet brut en instance (ce qui active les @Transform et @Type du DTO)
  const instance = plainToClass(dtoClass, dto, { enableImplicitConversion: true }) as T;
  
  // 2. Exécute la validation sur l'instance propre
  const errors = await validate(instance as object, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false
  });

  if (errors.length > 0) {
    return formatValidationErrors(errors);
  }

  // 🔥 CRUCIAL : On réinjecte l'instance transformée (avec le JSON parsé et les nombres convertis)
  // directement dans l'objet 'dto' (qui est req.body dans le contrôleur).
  Object.assign(dto, instance);

  return null;
}

/**
 * Map FormData fields to DTO object
 * Extracts text fields and ignores files
 */
export function mapFormDataToObject(formData: FormData): Record<string, any> {
  const obj: Record<string, any> = {};

  for (const [key, value] of formData.entries()) {
    // Skip file fields - they're handled separately by multer
    if (value instanceof File) {
      continue;
    }

    // Convert empty strings to undefined
    if (value === '') {
      obj[key] = undefined;
    } else {
      obj[key] = value;
    }
  }

  return obj;
}