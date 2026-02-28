import React from 'react';
import { CheckCircle2, Circle, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SetupProgressBannerProps {
    whatsappConnected: boolean;
    hasPreferencesSet: boolean;
    onGoToWhatsApp: () => void;
    onGoToPreferences: () => void;
}

export const SetupProgressBanner: React.FC<SetupProgressBannerProps> = ({
    whatsappConnected,
    hasPreferencesSet,
    onGoToWhatsApp,
    onGoToPreferences,
}) => {
    const isComplete = whatsappConnected && hasPreferencesSet;

    if (isComplete) {
        return (
            <Card className="bg-green-50 border-green-200 mb-6">
                <CardContent className="pt-6 pb-6 flex items-center gap-4">
                    <div className="bg-green-100 p-2 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-green-900">Configuração Concluída!</h3>
                        <p className="text-sm text-green-700">Sua Summi está pronta para trabalhar por você.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-orange-200 bg-orange-50/30 mb-6 overflow-hidden">
            <div className="bg-orange-100 px-6 py-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Passos para Concluir sua Configuração</span>
            </div>
            <CardContent className="pt-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Step 1: Connect WhatsApp */}
                    <div className={cn(
                        "flex flex-col gap-3 p-4 rounded-xl border transition-all",
                        whatsappConnected ? "bg-white/50 border-green-100" : "bg-white border-orange-100 shadow-sm"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {whatsappConnected ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Circle className="w-5 h-5 text-orange-300" />
                                )}
                                <span className={cn("font-medium", whatsappConnected ? "text-green-700" : "text-slate-700")}>
                                    1. Conectar WhatsApp
                                </span>
                            </div>
                            {!whatsappConnected && (
                                <Button variant="ghost" size="sm" onClick={onGoToWhatsApp} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-1 h-8 px-2">
                                    Conectar <ArrowRight className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            {whatsappConnected ? "WhatsApp conectado com sucesso." : "Escaneie o QR Code no Dashboard para ativar a Summi."}
                        </p>
                    </div>

                    {/* Step 2: Set Preferences */}
                    <div className={cn(
                        "flex flex-col gap-3 p-4 rounded-xl border transition-all",
                        hasPreferencesSet ? "bg-white/50 border-green-100" : "bg-white border-orange-100 shadow-sm"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {hasPreferencesSet ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Circle className="w-5 h-5 text-orange-300" />
                                )}
                                <span className={cn("font-medium", hasPreferencesSet ? "text-green-700" : "text-slate-700")}>
                                    2. Definir Preferências
                                </span>
                            </div>
                            {!hasPreferencesSet && (
                                <Button variant="ghost" size="sm" onClick={onGoToPreferences} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-1 h-8 px-2">
                                    Configurar <ArrowRight className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            {hasPreferencesSet ? "Preferências básicas configuradas." : "Ajuste os horários e frequência dos seus relatórios."}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
