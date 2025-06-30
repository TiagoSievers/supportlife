import React, { useState, useEffect, useRef } from 'react';

interface CronometroProps {
  startDate?: string;
}

const Cronometro: React.FC<CronometroProps> = ({ startDate }) => {
  const [timer, setTimer] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const chamadoId = localStorage.getItem('chamadoId');
    if (!chamadoId || !startDate) return;

    // Recupera o último tempo salvo ou calcula a partir do startDate
    const lastTimeKey = `cronometro_start_time_${chamadoId}_last`;
    const lastSavedTime = localStorage.getItem(lastTimeKey);
    
    let initial = 0;
    if (lastSavedTime) {
      // Se temos um tempo salvo, usamos ele
      initial = parseInt(lastSavedTime, 10);
    } else {
      // Se não temos tempo salvo, calculamos a partir do startDate
      const start = new Date(startDate).getTime();
      const now = Date.now();
      initial = Math.floor((now - start) / 1000);
      if (initial < 0) initial = 0;
      localStorage.setItem(lastTimeKey, String(initial));
    }

    setTimer(initial);
    
    // Inicia o intervalo a partir do tempo recuperado
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        const newValue = prev + 1;
        localStorage.setItem(lastTimeKey, String(newValue));
        return newValue;
      });
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
