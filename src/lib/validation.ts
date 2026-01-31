export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) return { valid: false, error: "Email is required." };
  if (!emailRegex.test(email)) return { valid: false, error: "Please enter a valid email address." };
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: "Password is required." };
  if (password.length < 8) return { valid: false, error: "Password must be at least 8 characters." };
  if (!/[A-Z]/.test(password)) return { valid: false, error: "Password must contain at least one uppercase letter." };
  if (!/[a-z]/.test(password)) return { valid: false, error: "Password must contain at least one lowercase letter." };
  if (!/[0-9]/.test(password)) return { valid: false, error: "Password must contain at least one number." };
  return { valid: true };
}

export function validatePhone(phone: string): ValidationResult {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,15}$/;
  if (!phone.trim()) return { valid: false, error: "Phone number is required." };
  if (!phoneRegex.test(phone)) return { valid: false, error: "Please enter a valid phone number." };
  return { valid: true };
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value.trim()) return { valid: false, error: `${fieldName} is required.` };
  return { valid: true };
}

export function validateBusinessNumber(bn: string): ValidationResult {
  if (!bn.trim()) return { valid: false, error: "Business Number is required." };
  if (!/^[a-zA-Z0-9]{9,15}$/.test(bn.replace(/\s/g, ""))) {
    return { valid: false, error: "Please enter a valid Business Number (9-15 alphanumeric characters)." };
  }
  return { valid: true };
}

export function validateOBR(obr: string): ValidationResult {
  if (!obr.trim()) return { valid: false, error: "Ontario Business Registry number is required." };
  if (!/^[a-zA-Z0-9]{5,20}$/.test(obr.replace(/\s/g, ""))) {
    return { valid: false, error: "Please enter a valid OBR number." };
  }
  return { valid: true };
}

export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) return { valid: false, error: "Please confirm your password." };
  if (password !== confirmPassword) return { valid: false, error: "Passwords do not match." };
  return { valid: true };
}

