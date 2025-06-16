import React, { useState, useEffect, useRef } from 'react';

interface CronometroProps {
  startDate?: string;
}

const Cronometro: React.FC<CronometroProps> = ({ startDate }) => {
  const [timer, setTimer] = useState(0); // tempo em segundos
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let initial = 0;
    if (startDate) {
      const start = new Date(startDate).getTime();
      const now = Date.now();
      initial = Math.floor((now - start) / 1000);
      if (initial < 0) initial = 0;
    }
    setTimer(initial);
    intervalRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startDate]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <span>{formatTime(timer)}</span>
  );
};

export default Cronometro; 
