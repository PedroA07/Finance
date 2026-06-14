import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import buildInfo from '../buildInfo.json';

const VERSION_URL = 'https://github.com/PedroA07/Finance/releases/latest/download/version.json';
const APK_URL = 'https://github.com/PedroA07/Finance/releases/latest/download/fiance.apk';
const RELEASES_URL = 'https://github.com/PedroA07/Finance/releases/latest';

const UpdatesContext = createContext(null);

// Há atualização se o build publicado for mais novo que o instalado.
const isNewer = (remote) => {
  if (!remote || !remote.builtAt) return false;
  return String(remote.builtAt) > String(buildInfo.builtAt);
};

export function UpdatesProvider({ children }) {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remote, setRemote] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState(null);
  const promptedRef = useRef(false);

  const openInstall = useCallback(() => {
    Linking.openURL(APK_URL).catch(() => Linking.openURL(RELEASES_URL).catch(() => {}));
  }, []);

  const checkNow = useCallback(async ({ silent = true } = {}) => {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(`${VERSION_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setRemote(data);
      setLastChecked(new Date());
      const newer = isNewer(data);
      setUpdateAvailable(newer);
      if (newer && !promptedRef.current) {
        promptedRef.current = true;
        Alert.alert(
          'Atualização disponível',
          `Há uma versão mais nova do Fiance${data.version ? ' (v' + data.version + ')' : ''}. Deseja baixar e instalar agora?`,
          [
            { text: 'Depois', style: 'cancel' },
            { text: 'Atualizar agora', onPress: openInstall },
          ],
        );
      }
      return newer;
    } catch (e) {
      setError(e.message || 'Falha ao verificar');
      if (!silent) Alert.alert('Sem conexão', 'Não foi possível verificar atualizações agora. Tente novamente mais tarde.');
      return false;
    } finally {
      setChecking(false);
    }
  }, [openInstall]);

  // Verifica automaticamente ao abrir o app.
  useEffect(() => { checkNow({ silent: true }); }, [checkNow]);

  return (
    <UpdatesContext.Provider value={{
      current: buildInfo, checking, updateAvailable, remote, lastChecked, error,
      checkNow, openInstall,
    }}>
      {children}
    </UpdatesContext.Provider>
  );
}

export const useUpdates = () => {
  const ctx = useContext(UpdatesContext);
  if (!ctx) throw new Error('useUpdates must be used within UpdatesProvider');
  return ctx;
};
