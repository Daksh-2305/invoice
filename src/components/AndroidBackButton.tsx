import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Toast } from '@capacitor/toast';

export function AndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastPressRef = useRef<number>(0);

  useEffect(() => {
    const handleBackButton = async () => {
      // Check if we are at the root (Dashboard)
      if (location.pathname === '/') {
        const now = Date.now();
        if (now - lastPressRef.current < 2000) {
          // Double press within 2 seconds
          CapacitorApp.exitApp();
        } else {
          lastPressRef.current = now;
          await Toast.show({
            text: 'Press back again to exit',
            duration: 'short',
            position: 'bottom'
          });
        }
      } else {
        // Not at root, go back in history
        navigate(-1);
      }
    };

    const listener = CapacitorApp.addListener('backButton', () => {
      handleBackButton();
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [navigate, location]);

  return null;
}
