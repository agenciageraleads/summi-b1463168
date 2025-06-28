
// ABOUTME: Componente orquestrador principal que gerencia todos os estados da conexão WhatsApp
// ABOUTME: Implementa a máquina de estados visual e delega para componentes específicos
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import { useProfile } from '@/hooks/useProfile';
import { NoConnectionState } from './ConnectionStates/NoConnectionState';
import { AwaitingConnectionState } from './ConnectionStates/AwaitingConnectionState';
import { ConnectedState } from './ConnectionStates/ConnectedState';
import { ErrorState } from './ConnectionStates/ErrorState';

export const WhatsAppManager = () => {
  const { profile } = useProfile();
  const { connectionData, connect, disconnect, generateNewCode, reset } = useWhatsAppConnection();

  const hasValidProfile = Boolean(profile?.nome && profile?.numero);

  const handlePreferences = () => {
    // TODO: Implementar abertura de modal de preferências
    console.log('Abrir preferências');
  };

  // Renderizar componente baseado no estado atual
  switch (connectionData.state) {
    case 'NO_CONNECTION':
      return (
        <NoConnectionState
          onConnect={connect}
          isLoading={connectionData.isLoading}
          message={connectionData.message}
          hasValidProfile={hasValidProfile}
        />
      );

    case 'AWAITING_CONNECTION':
      return (
        <AwaitingConnectionState
          pairingCode={connectionData.pairingCode}
          qrCode={connectionData.qrCode}
          message={connectionData.message}
          isLoading={connectionData.isLoading}
          onGenerateNewCode={generateNewCode}
        />
      );

    case 'CONNECTED':
      return (
        <ConnectedState
          instanceName={connectionData.instanceName}
          phoneNumber={profile?.numero || null}
          message={connectionData.message}
          onDisconnect={disconnect} // Agora implementado
          onPreferences={handlePreferences}
          isLoading={connectionData.isLoading}
        />
      );

    case 'ERROR':
      return (
        <ErrorState
          error={connectionData.error || 'Erro desconhecido'}
          message={connectionData.message}
          onRetry={connect}
          onReset={reset}
          isLoading={connectionData.isLoading}
        />
      );

    default:
      return null;
  }
};
