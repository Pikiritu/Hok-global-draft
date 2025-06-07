// src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import GameBanPickPanel from '../components/GameBanPickPanel';

// Definiciones de tipos (asegúrate de que estas también estén en tu archivo)
interface Phase {
  team: 'blue' | 'red';
  action: 'ban' | 'pick';
  text: string;
}

interface GlobalBanPickState {
  blueBans: number[];
  redBans: number[];
  bluePicks: number[];
  redPicks: number[];
}

interface MatchResult {
  bluePicks: number[];
  redPicks: number[];
}

const Dashboard: React.FC = () => {
  // Definiciones de fases con el orden correcto (18 fases)
  const commonPhases: Phase[] = [
    { team: 'blue', action: 'ban', text: 'Blue Ban 1' },
    { team: 'red', action: 'ban', text: 'Red Ban 1' },
    { team: 'blue', action: 'ban', text: 'Blue Ban 2' },
    { team: 'red', action: 'ban', text: 'Red Ban 2' },
    { team: 'blue', action: 'pick', text: 'Blue Pick 1' },
    { team: 'red', action: 'pick', text: 'Red Pick 1' },
    { team: 'red', action: 'pick', text: 'Red Pick 2' },
    { team: 'blue', action: 'pick', text: 'Blue Pick 2' },
    { team: 'blue', action: 'pick', text: 'Blue Pick 3' },
    { team: 'red', action: 'pick', text: 'Red Pick 3' },
    { team: 'red', action: 'ban', text: 'Red Ban 3' },
    { team: 'blue', action: 'ban', text: 'Blue Ban 3' },
    { team: 'red', action: 'ban', text: 'Red Ban 4' },
    { team: 'blue', action: 'ban', text: 'Blue Ban 4' },
    { team: 'red', action: 'pick', text: 'Red Pick 4' },
    { team: 'blue', action: 'pick', text: 'Blue Pick 4' },
    { team: 'blue', action: 'pick', text: 'Blue Pick 5' },
    { team: 'red', action: 'pick', text: 'Red Pick 5' },
  ];

  // Ambas variables de fases ahora usan la misma lista para consistencia
  const normalPhases = commonPhases;
  const matchPhases = commonPhases;

  // =====================================================================
  // ESTADOS NUEVOS Y CRÍTICOS para manejar el sistema BO3/BO5 y el final del draft
  // =====================================================================
  const [currentMatchPhases, setCurrentMatchPhases] = useState<Phase[]>(normalPhases);
  const [matchKey, setMatchKey] = useState(0); // Para forzar el re-render de GameBanPickPanel
  const [globalBannedPicks, setGlobalBannedPicks] = useState<GlobalBanPickState>({
    blueBans: [],
    redBans: [],
    bluePicks: [],
    redPicks: [],
  });
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]); // Historial de picks por ronda
  const [currentRound, setCurrentRound] = useState(1);
  const [bestOfType, setBestOfType] = useState<'bo1' | 'bo3' | 'bo5'>('bo1'); // Tipo de serie
  const [isDraftComplete, setIsDraftComplete] = useState(false); // NUEVO: Para saber si el draft finalizó
  //const [finalPicks, setFinalPicks] = useState<GlobalBanPickState | null>(null); // NUEVO: Para guardar los picks finales

  // Función para manejar el inicio de una nueva ronda o la selección del tipo de partida
  const startNewRound = useCallback((type: 'bo1' | 'bo3' | 'bo5') => {
    setBestOfType(type);
    setCurrentRound(1);
    setMatchResults([]); // Reiniciar resultados de rondas anteriores
    setGlobalBannedPicks({ // Reiniciar bans globales para la nueva serie
      blueBans: [],
      redBans: [],
      bluePicks: [],
      redPicks: [],
    });
    // Siempre establecemos las commonPhases para cualquier tipo de juego
    setCurrentMatchPhases(commonPhases);
    setMatchKey(prevKey => prevKey + 1); // Fuerza el re-render de GameBanPickPanel
    setIsDraftComplete(false); // Resetear al iniciar nueva serie
    //setFinalPicks(null); // Limpiar picks finales anteriores
  }, [commonPhases]);

  // Callback cuando una ronda (draft) ha terminado
  const handleDraftComplete = useCallback((picks: { bluePicks: number[], redPicks: number[] }) => {
    setMatchResults(prevResults => [...prevResults, picks]);

    const nextRound = currentRound + 1;
    let maxRounds: number;

    if (bestOfType === 'bo3') {
      maxRounds = 3;
    } else if (bestOfType === 'bo5') {
      maxRounds = 5;
    } else {
      maxRounds = 1; // Para BO1
    }

    if (nextRound <= maxRounds) {
      setCurrentRound(nextRound);
      // Acumular los picks SOLO SI NO ES BO1
      if (bestOfType !== 'bo1') {
        setGlobalBannedPicks(prev => ({
          ...prev,
          bluePicks: [...prev.bluePicks, ...picks.bluePicks],
          redPicks: [...prev.redPicks, ...picks.redPicks],
        }));
      }
      setMatchKey(prevKey => prevKey + 1); // Re-render GameBanPickPanel para la nueva ronda
    } else {
      // La serie ha terminado
      console.log(`Serie BO${bestOfType.slice(2)} terminada. Resultados:`, matchResults.concat(picks));

      setIsDraftComplete(true); // Marcar el draft como completado
     
      // Ya NO reseteamos aquí los estados ni incrementamos matchKey.
      // El reseteo COMPLETO ocurrirá cuando el usuario presione un botón de nueva serie.
    }
  }, [currentRound, bestOfType, matchResults, globalBannedPicks]); // Asegúrate de tener globalBannedPicks aquí

  return (
    <div className='min-h-screen bg-gray-900'>
      <div className='flex justify-between items-center p-4 bg-blue-800 text-white flex-row'>
        <h3>Honor of Kings Ban/Pick Simulator</h3>
        <div className='gap-4 flex flex-row'>
          {/* BOTONES PARA SELECCIONAR TIPO DE PARTIDA (BO1, BO3, BO5) */}
          <button
            className={`px-4 py-2 rounded transition-colors duration-300 ${bestOfType === 'bo1' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            onClick={() => startNewRound('bo1')}
          >
            Ranking (BO1)
          </button>
          <button
            className={`px-4 py-2 rounded transition-colors duration-300 ${bestOfType === 'bo3' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            onClick={() => startNewRound('bo3')}
          >
            BO3 Match
          </button>
          <button
            className={`px-4 py-2 rounded transition-colors duration-300 ${bestOfType === 'bo5' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            onClick={() => startNewRound('bo5')}
          >
            BO5 Match
          </button>
        </div>
        <img src='/github-mark-white.png' className='w-8 h-8' alt="GitHub" />
      </div>

      <div className="p-4">
        {bestOfType !== 'bo1' && !isDraftComplete && ( // Muestra progreso solo si no es BO1 y no ha terminado el draft
          <h2 className="text-white text-center text-2xl mb-4">
            Round {currentRound} of {bestOfType === 'bo3' ? '3' : '5'}
          </h2>
        )}
          <GameBanPickPanel
            key={matchKey} // Usa la key para forzar el re-render y reinicio de estado de GameBanPickPanel
            phases={currentMatchPhases} // Pasa las fases para la ronda actual
            globalBannedPicks={globalBannedPicks} // Los bans y picks que persisten a lo largo de la serie
            onDraftComplete={handleDraftComplete} // Callback para cuando una ronda termina
          />
        {/* Mensaje de completado, solo si el draft está completo, y se muestra abajo del panel */}
        {isDraftComplete && ( // <--- AÑADIR ESTE BLOQUE COMPLETO DESPUÉS DEL GameBanPickPanel
          <div className="text-white text-center text-3xl font-bold py-4 mt-4">
            ¡DRAFT COMPLETADO!
            <p className="mt-2 text-lg">Inicia una nueva serie con los botones de arriba.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;