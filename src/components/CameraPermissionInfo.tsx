import React from 'react';

interface CameraPermissionInfoProps {
  onReload?: () => void;
}

const CameraPermissionInfo: React.FC<CameraPermissionInfoProps> = ({ onReload }) => (
  <div className="camera-permission-info" style={{ maxWidth: 400, margin: '2rem auto', padding: '1.5rem', background: '#232323', borderRadius: 12, color: '#fff', textAlign: 'center' }}>
    <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Kamera-Berechtigung benötigt</h2>
    <p style={{ marginBottom: '1rem' }}>
      Diese App benötigt Zugriff auf die Kamera, um Produkt-Inhaltsstoffe zu scannen. Bitte erlauben Sie den Kamerazugriff in den Einstellungen Ihres Browsers.
    </p>
    <ul style={{ textAlign: 'left', margin: '0 auto 1rem auto', padding: 0, listStyle: 'disc inside', fontSize: '1rem' }}>
      <li>Prüfen Sie das Kamera-Symbol in der Adressleiste.</li>
      <li>Erlauben Sie den Zugriff auf die Kamera.</li>
      <li>Laden Sie die Seite danach neu.</li>
    </ul>
    <button onClick={onReload || (() => window.location.reload())} style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: '#4ecdc4', color: '#222', fontWeight: 600, cursor: 'pointer' }}>
      Seite neu laden
    </button>
  </div>
);

export default CameraPermissionInfo; 