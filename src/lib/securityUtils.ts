// ABOUTME: Utilitários centralizados de segurança para validação e sanitização
// ABOUTME: Funções reutilizáveis para validação de entrada e prevenção de ataques

import { z } from 'zod';

// Schema para validação de telefone brasileiro
export const brazilianPhoneSchema = z.string()
  .regex(/^55[1-9][1-9][0-9]{8,9}$/, 'Formato de telefone brasileiro inválido')
  .optional();

// Schema para validação de nome/texto básico
export const nameSchema = z.string()
  .min(2, 'Deve ter pelo menos 2 caracteres')
  .max(100, 'Máximo de 100 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_.]+$/, 'Contém caracteres inválidos');

// Schema para validação de texto longo (temas, descrições)
export const longTextSchema = z.string()
  .max(500, 'Máximo de 500 caracteres')
  .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_.,;:!?\n\r]+$/, 'Contém caracteres inválidos');

// Schema para validação de instance name
export const instanceNameSchema = z.string()
  .regex(/^[a-z0-9_]+$/, 'Instance name deve conter apenas letras minúsculas, números e underscore')
  .min(3, 'Mínimo de 3 caracteres')
  .max(50, 'Máximo de 50 caracteres');

// Schema para validação de role
export const roleSchema = z.enum(['user', 'admin'], {
  errorMap: () => ({ message: 'Role deve ser "user" ou "admin"' })
});

// Lista de padrões suspeitos para detecção de ataques
const SUSPICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /alert\s*\(/i,
  /confirm\s*\(/i,
  /prompt\s*\(/i,
  /document\./i,
  /window\./i,
  /\.constructor/i,
  /prototype/i,
  /\[\s*['"]constructor['"]\s*\]/i,
  /data:/i,
  /vbscript:/i,
  /expression\(/i,
  /import\s*\(/i,
  /require\s*\(/i,
  /setTimeout/i,
  /setInterval/i
];

// Função para sanitizar entrada removendo caracteres perigosos
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/[<>"'`]/g, '') // Remove caracteres HTML/JS básicos
    .replace(/javascript:/gi, '') // Remove protocolo javascript
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data URLs
    .replace(/vbscript:/gi, '') // Remove vbscript
    .trim()
    .substring(0, maxLength);
};

// Função para validar entrada contra padrões suspeitos
export const validateInput = (input: string, maxLength: number = 1000): boolean => {
  if (!input || typeof input !== 'string') return false;

  if (input.length > maxLength) return false;

  // Verificar padrões suspeitos
  return !SUSPICIOUS_PATTERNS.some(pattern => pattern.test(input));
};

// Função para validar e sanitizar número de telefone brasileiro
export const validateAndSanitizeBrazilianPhone = (phone: string): {
  isValid: boolean;
  sanitized: string | null;
  error?: string;
} => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, sanitized: null, error: 'Telefone é obrigatório' };
  }

  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');

  if (!cleanPhone) {
    return { isValid: false, sanitized: null, error: 'Telefone inválido' };
  }

  // Adiciona código do país se não tiver
  let formattedPhone = cleanPhone;
  if (!cleanPhone.startsWith('55') && cleanPhone.length >= 10) {
    formattedPhone = '55' + cleanPhone;
  }

  // Valida usando o schema
  const result = brazilianPhoneSchema.safeParse(formattedPhone);

  if (!result.success) {
    return {
      isValid: false,
      sanitized: null,
      error: 'Formato de telefone brasileiro inválido (55 + DDD + número)'
    };
  }

  return { isValid: true, sanitized: formattedPhone };
};

// Função para detectar tentativas de bypass de segurança
export const detectSecurityBypass = (input: string): {
  isSuspicious: boolean;
  threats: string[];
} => {
  const threats: string[] = [];

  // Verificar encoding attempts
  if (/%[0-9a-f]{2}/i.test(input)) {
    threats.push('URL_ENCODING_DETECTED');
  }

  // Verificar unicode encoding
  if (/\\u[0-9a-f]{4}/i.test(input)) {
    threats.push('UNICODE_ENCODING_DETECTED');
  }

  // Verificar base64 suspeito
  if (/(?:data:|javascript:).*base64/i.test(input)) {
    threats.push('BASE64_SCRIPT_DETECTED');
  }

  // Verificar SQL injection patterns
  if (/(union|select|insert|update|delete|drop|create|alter)\s/i.test(input)) {
    threats.push('SQL_INJECTION_PATTERN');
  }

  // Verificar XSS patterns
  if (/<.*?(script|iframe|object|embed|form).*?>/i.test(input)) {
    threats.push('XSS_TAG_DETECTED');
  }

  // Verificar path traversal
  if (/\.\.\/|\.\.\\/.test(input)) {
    threats.push('PATH_TRAVERSAL_DETECTED');
  }

  return {
    isSuspicious: threats.length > 0,
    threats
  };
};

// Função para validação de perfil completo
export const validateProfileUpdates = (updates: Record<string, unknown>): {
  isValid: boolean;
  sanitized: Record<string, unknown>;
  errors: string[];
} => {
  const errors: string[] = [];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null) continue;

    switch (key) {
      case 'nome':
      case 'name': {
        const nameResult = nameSchema.safeParse(value);
        if (!nameResult.success) {
          errors.push(`${key}: ${nameResult.error.errors[0].message}`);
        } else {
          sanitized[key] = sanitizeInput(value as string, 100);
        }
        break;
      }

      case 'numero':
        if (typeof value === 'string') {
          const phoneResult = validateAndSanitizeBrazilianPhone(value);
          if (!phoneResult.isValid) {
            errors.push(`numero: ${phoneResult.error}`);
          } else {
            sanitized[key] = phoneResult.sanitized;
          }
        }
        break;

      case 'email':
        // Email não deve ser alterado por segurança
        errors.push('email: Alteração de email não permitida por segurança');
        break;

      case 'role': {
        const roleResult = roleSchema.safeParse(value);
        if (!roleResult.success) {
          errors.push(`role: ${roleResult.error.errors[0].message}`);
        } else {
          sanitized[key] = value; // Role validation is handled separately
        }
        break;
      }

      case 'temas_importantes':
      case 'temas_urgentes':
        if (typeof value === 'string') {
          const textResult = longTextSchema.safeParse(value);
          if (!textResult.success) {
            errors.push(`${key}: ${textResult.error.errors[0].message}`);
          } else {
            const securityCheck = detectSecurityBypass(value);
            if (securityCheck.isSuspicious) {
              errors.push(`${key}: Conteúdo suspeito detectado (${securityCheck.threats.join(', ')})`);
            } else {
              sanitized[key] = sanitizeInput(value, 500);
            }
          }
        }
        break;

      case 'instance_name':
        if (typeof value === 'string' && value.length > 0) {
          const instanceResult = instanceNameSchema.safeParse(value);
          if (!instanceResult.success) {
            errors.push(`instance_name: ${instanceResult.error.errors[0].message}`);
          } else {
            sanitized[key] = value;
          }
        } else {
          sanitized[key] = null;
        }
        break;

      default:
        // Para campos booleanos, numéricos e outros tipos simples
        if (typeof value === 'boolean' || typeof value === 'number') {
          sanitized[key] = value;
        } else if (typeof value === 'string') {
          // Campos de string genéricos
          if (validateInput(value, 200)) {
            sanitized[key] = sanitizeInput(value, 200);
          } else {
            errors.push(`${key}: Contém caracteres ou padrões inválidos`);
          }
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
};

// Rate limiting helper (client-side tracking)
export const isRateLimited = (key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const storageKey = `rate_limit_${key}`;

  try {
    const stored = localStorage.getItem(storageKey);
    const data = stored ? JSON.parse(stored) : { attempts: 0, resetTime: now + windowMs };

    // Reset if window expired
    if (now > data.resetTime) {
      data.attempts = 1;
      data.resetTime = now + windowMs;
    } else {
      data.attempts++;
    }

    localStorage.setItem(storageKey, JSON.stringify(data));

    return data.attempts > maxAttempts;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return false; // Fail open
  }
};

// CSP violation detector (for monitoring)
export const setupCSPMonitoring = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('securitypolicyviolation', (event) => {
      console.warn('CSP Violation:', {
        directive: event.violatedDirective,
        uri: event.blockedURI,
        source: event.sourceFile,
        line: event.lineNumber
      });

      // Could send to security monitoring service
    });
  }
};