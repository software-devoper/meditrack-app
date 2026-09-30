import { useState, useEffect, useCallback } from 'react';

export interface VersionInfo {
  version: string;
  buildTime: number;
  builtAt?: string;
}

export function useAppUpdate() {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [newVersionInfo, setNewVersionInfo] = useState<VersionInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const localBuildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? Number(__APP_BUILD_TIME__) : 0;
  const localVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

  const checkForUpdate = useCallback(async () => {
    // Check if simulation mode is turned on for testing
    if (localStorage.getItem('meditrack_simulate_update') === 'true') {
      setHasUpdate(true);
      setNewVersionInfo({
        version: 'v-new-update',
        buildTime: Date.now(),
        builtAt: new Date().toISOString(),
      });
      setIsDismissed(false);
      return;
    }

    setIsChecking(true);
    try {
      // Bust browser & proxy caches
      const response = await fetch(`/version.json?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (response.ok) {
        const data: VersionInfo = await response.json();
        setLastChecked(new Date());

        // An update is detected if:
        // 1) remote buildTime is greater than our current local buildTime, OR
        // 2) remote version string differs from our local version (and not in local dev)
        const isNewer = data.buildTime && localBuildTime > 0 ? data.buildTime > localBuildTime : false;
        const isDifferentVersion = data.version && localVersion !== 'dev' ? data.version !== localVersion : false;

        if (isNewer || isDifferentVersion) {
          setNewVersionInfo(data);
          setHasUpdate(true);
        }
      }
    } catch (err) {
      // Quietly handle network errors during polling
      console.debug('Update check failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, [localBuildTime, localVersion]);

  useEffect(() => {
    // 1. Initial check after 4 seconds
    const initialTimer = setTimeout(() => {
      checkForUpdate();
    }, 4000);

    // 2. Periodic poll every 45 seconds
    const interval = setInterval(() => {
      checkForUpdate();
    }, 45000);

    // 3. Immediate check when user returns/switches back to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };

    const handleFocus = () => {
      checkForUpdate();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkForUpdate]);

  const refreshApp = () => {
    localStorage.removeItem('meditrack_simulate_update');
    window.location.reload();
  };

  const dismissNotification = () => {
    setIsDismissed(true);
  };

  const simulateUpdate = () => {
    localStorage.setItem('meditrack_simulate_update', 'true');
    setHasUpdate(true);
    setNewVersionInfo({
      version: `v${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`,
      buildTime: Date.now(),
      builtAt: new Date().toISOString(),
    });
    setIsDismissed(false);
  };

  const clearSimulation = () => {
    localStorage.removeItem('meditrack_simulate_update');
    setHasUpdate(false);
    setNewVersionInfo(null);
    setIsDismissed(false);
  };

  return {
    hasUpdate,
    newVersionInfo,
    isDismissed,
    lastChecked,
    isChecking,
    checkForUpdate,
    refreshApp,
    dismissNotification,
    simulateUpdate,
    clearSimulation,
    localVersion,
    localBuildTime,
  };
}
