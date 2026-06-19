export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verificationPinSchema,
  emailPinSchema,
} from './auth.schema';
export type {
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  VerificationPinFormData,
  EmailPinFormData,
} from './auth.schema';

export {
  lostDeclarationSchema,
  foundDeclarationSchema,
} from './declaration.schema';
export type {
  LostDeclarationFormData,
  FoundDeclarationFormData,
} from './declaration.schema';

export {
  registerDocumentSchema,
  shareDocumentSchema,
} from './document.schema';
export type {
  RegisterDocumentFormData,
  ShareDocumentFormData,
} from './document.schema';
