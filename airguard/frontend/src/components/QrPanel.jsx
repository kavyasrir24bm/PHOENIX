import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function QrPanel({ zoneId }) {
  const canvasRef = useRef(null);
  const url = `${window.location.origin}/zone/${zoneId}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 120,
        margin: 1,
        color: { dark: "#101822", light: "#ffffff" }
      });
    }
  }, [url]);

  return (
    <div className="qr-box">
      <canvas ref={canvasRef} />
      <div className="qr-caption">Scan for field access</div>
      <div className="qr-url">{url}</div>
    </div>
  );
}
