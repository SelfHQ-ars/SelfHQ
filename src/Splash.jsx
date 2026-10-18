import React, { useState, useEffect } from 'react';

// Заставка с логотипом: показывается один раз за сессию (около 1,8 секунды)
export default function Splash() {
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem('selfhq_splash') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!show) return undefined;
    try {
      sessionStorage.setItem('selfhq_splash', '1');
    } catch {
      /* без sessionStorage заставка просто покажется снова */
    }
    const t = setTimeout(() => setShow(false), 1900);
    return () => clearTimeout(t);
  }, [show]);
  if (!show) return null;
  return (
    <div className="fx-splash" aria-hidden="true">
      <span className="ring" />
      <img className="logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="" />
    </div>
  );
}
