
// ABOUTME: Componente para logging de eventos de segurança no frontend
// ABOUTME: Captura e registra ações do usuário para auditoria de segurança
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityEvent {
  user_id: string;
  event_type: string;
  details: Record<string, any>;
  timestamp: string;
  user_agent?: string;
  url?: string;
}

class SecurityAuditLogger {
  private static instance: SecurityAuditLogger;
  private events: SecurityEvent[] = [];
  private maxEvents = 100;

  private constructor() {}

  static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger();
    }
    return SecurityAuditLogger.instance;
  }

  logEvent(userId: string, eventType: string, details: Record<string, any> = {}) {
    const event: SecurityEvent = {
      user_id: userId,
      event_type: eventType,
      details,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href
    };

    console.log('[SECURITY AUDIT]', eventType, details);

    this.events.push(event);

    // Manter apenas os eventos mais recentes
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Salvar no localStorage para persistência local
    try {
      localStorage.setItem('security_audit_log', JSON.stringify(this.events));
    } catch (error) {
      console.warn('[SECURITY AUDIT] Erro ao salvar no localStorage:', error);
    }
  }

  getEvents(): SecurityEvent[] {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
    localStorage.removeItem('security_audit_log');
  }

  // Carregar eventos do localStorage na inicialização
  loadStoredEvents() {
    try {
      const stored = localStorage.getItem('security_audit_log');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[SECURITY AUDIT] Erro ao carregar eventos do localStorage:', error);
    }
  }
}

export const SecurityAuditLogger_Component: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    const logger = SecurityAuditLogger.getInstance();
    logger.loadStoredEvents();

    if (user) {
      logger.logEvent(user.id, 'page_load', {
        page: window.location.pathname,
        referrer: document.referrer
      });
    }

    // Log quando o usuário sai da página
    const handleBeforeUnload = () => {
      if (user) {
        logger.logEvent(user.id, 'page_unload', {
          page: window.location.pathname,
          duration: Date.now() - performance.timeOrigin
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  return null; // Componente invisível
};

// Hook para usar o logger
export const useSecurityAuditLogger = () => {
  const { user } = useAuth();
  const logger = SecurityAuditLogger.getInstance();

  const logSecurityEvent = (eventType: string, details: Record<string, any> = {}) => {
    if (user) {
      logger.logEvent(user.id, eventType, details);
    }
  };

  return {
    logSecurityEvent,
    getEvents: () => logger.getEvents(),
    clearEvents: () => logger.clearEvents()
  };
};

export default SecurityAuditLogger;
