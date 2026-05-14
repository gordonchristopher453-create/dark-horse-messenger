import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const UserQRCode = ({ userId, username }) => {
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 });
    scanner.render((result) => {
      const scannedId = result.replace('darkhorse://adduser/', '');
      scanner.clear();
      setScanning(false);
      window.location.href = `/chat/${scannedId}`;
    });
    return () => scanner.clear();
  }, [scanning]);

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h3 style={{ marginBottom: '16px' }}>My QR Code</h3>
      <QRCodeSVG
        value={`darkhorse://adduser/${userId}`}
        size={200}
        bgColor="#000000"
        fgColor="#7c3aed"
        style={{ borderRadius: '12px', padding: '12px', background: '#000' }}
      />
      <p style={{ marginTop: '12px', fontSize: '14px', color: '#888' }}>
        @{username}
      </p>
      <button
        onClick={() => setScanning(!scanning)}
        style={{
          marginTop: '16px',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          padding: '10px 24px',
          cursor: 'pointer',
          fontSize: '15px'
        }}
      >
        {scanning ? 'Cancel Scan' : '📷 Scan QR Code'}
      </button>
      {scanning && (
        <div id="qr-reader" style={{ marginTop: '16px', borderRadius: '12px', overflow: 'hidden' }} />
      )}
    </div>
  );
};

export default UserQRCode;
