import { useEffect, useRef } from 'react';
import { driver, type Config, type DriveStep, type Driver } from 'driver.js';

export type DriverJsStep = DriveStep;

interface DriverJsOnboardingProps {
  enabled: boolean;
  steps: DriverJsStep[];
  options?: Partial<Config>;
  onComplete?: () => void | Promise<void>;
  onExit?: () => void | Promise<void>;
}

type DestroyReason = 'complete' | 'exit' | 'programmatic';

export const DriverJsOnboarding = ({
  enabled,
  steps,
  options,
  onComplete,
  onExit,
}: DriverJsOnboardingProps) => {
  const driverRef = useRef<Driver | null>(null);
  const destroyReasonRef = useRef<DestroyReason | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    if (!enabled) {
      if (driverRef.current?.isActive()) {
        destroyReasonRef.current = 'programmatic';
        driverRef.current.destroy();
      }
      driverRef.current = null;
      destroyReasonRef.current = null;
      return;
    }

    if (!steps || steps.length === 0) return;
    if (driverRef.current?.isActive()) return;

    destroyReasonRef.current = null;

    const instance = driver({
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayClickBehavior: 'close',
      overlayOpacity: 0.35,
      showProgress: false,
      showButtons: ['next', 'close'],
      disableActiveInteraction: true,
      stagePadding: 6,
      stageRadius: 10,
      ...options,
      steps,
      onNextClick: () => {
        destroyReasonRef.current = 'complete';
        driverRef.current?.destroy();
      },
      onCloseClick: () => {
        destroyReasonRef.current = 'exit';
        driverRef.current?.destroy();
      },
      onDestroyed: async () => {
        const reason = destroyReasonRef.current;
        destroyReasonRef.current = null;
        driverRef.current = null;

        if (reason === 'programmatic') return;

        if (reason === 'complete') {
          await onCompleteRef.current?.();
          return;
        }

        await onExitRef.current?.();
      },
    });

    driverRef.current = instance;
    instance.drive();

    return () => {
      if (driverRef.current?.isActive()) {
        destroyReasonRef.current = 'programmatic';
        driverRef.current.destroy();
      }
      driverRef.current = null;
      destroyReasonRef.current = null;
    };
  }, [enabled, options, steps]);

  return null;
};
