import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Serviço de Criptografia para Dados Sensíveis (LGPD)
 * 
 * Utiliza AES-256-GCM para criptografia simétrica com autenticação.
 * 
 * Campos a serem criptografados:
 * - CPF, RG, CNH
 * - Dados de saúde (susNumber, healthPlan, etc.)
 * - Informações de contato de emergência
 * - Endereço completo
 * - Dados bancários (se houver)
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  private readonly keyLength = 32; // 256 bits

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY não configurada nas variáveis de ambiente');
    }

    // Validar tamanho da chave (deve ser 64 caracteres hex = 32 bytes)
    if (encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY deve ter 64 caracteres hexadecimais (32 bytes)');
    }

    this.key = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * Criptografa um texto usando AES-256-GCM
   * 
   * @param text - Texto a ser criptografado
   * @returns String no formato: iv:authTag:encrypted ou null se texto vazio
   */
  encrypt(text: string): string | null {
    if (!text) return null;

    try {
      // Gerar IV aleatório (16 bytes)
      const iv = crypto.randomBytes(16);

      // Criar cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Criptografar
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Obter authentication tag
      const authTag = cipher.getAuthTag();

      // Retornar: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Erro ao criptografar:', error);
      throw new Error('Falha na criptografia de dados');
    }
  }

  /**
   * Descriptografa um texto criptografado
   * 
   * @param encryptedData - String no formato: iv:authTag:encrypted
   * @returns Texto descriptografado ou null se dados vazios
   */
  decrypt(encryptedData: string): string | null {
    if (!encryptedData) return null;

    try {
      // Separar componentes
      const parts = encryptedData.split(':');

      if (parts.length !== 3) {
        throw new Error('Formato de dados criptografados inválido');
      }

      const [ivHex, authTagHex, encrypted] = parts;

      // Converter de hex para Buffer
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Criar decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Descriptografar
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar:', error);
      throw new Error('Falha na descriptografia de dados');
    }
  }

  /**
   * Cria um hash SHA-256 de um texto (one-way)
   * Útil para comparações sem armazenar o valor original
   * 
   * @param text - Texto a ser hasheado
   * @returns Hash SHA-256 em hexadecimal ou null se texto vazio
   */
  hash(text: string): string | null {
    if (!text) return null;

    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  }

  /**
   * Criptografa um objeto, processando apenas campos sensíveis
   * 
   * @param data - Objeto com dados
   * @param sensitiveFields - Array de campos a serem criptografados
   * @returns Objeto com campos sensíveis criptografados
   */
  encryptObject<T extends Record<string, any>>(
    data: T,
    sensitiveFields: (keyof T)[],
  ): T {
    const encrypted = { ...data };

    sensitiveFields.forEach((field) => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(String(encrypted[field])) as any;
      }
    });

    return encrypted;
  }

  /**
   * Descriptografa um objeto, processando apenas campos sensíveis
   * 
   * @param data - Objeto com dados criptografados
   * @param sensitiveFields - Array de campos a serem descriptografados
   * @returns Objeto com campos sensíveis descriptografados
   */
  decryptObject<T extends Record<string, any>>(
    data: T,
    sensitiveFields: (keyof T)[],
  ): T {
    const decrypted = { ...data };

    sensitiveFields.forEach((field) => {
      if (decrypted[field]) {
        try {
          decrypted[field] = this.decrypt(String(decrypted[field])) as any;
        } catch (error) {
          console.error(`Erro ao descriptografar campo ${String(field)}:`, error);
          decrypted[field] = null as any;
        }
      }
    });

    return decrypted;
  }

  /**
   * Valida se uma chave de criptografia é válida
   * 
   * @param key - Chave em hexadecimal
   * @returns true se válida
   */
  static validateKey(key: string): boolean {
    if (!key || key.length !== 64) {
      return false;
    }

    // Verificar se é hexadecimal válido
    return /^[0-9a-f]{64}$/i.test(key);
  }

  /**
   * Gera uma nova chave de criptografia segura
   * ATENÇÃO: Use apenas para gerar chaves iniciais, não em produção
   * 
   * @returns Chave de 32 bytes em hexadecimal
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
