// src/pages/Dashboard.tsx
import React, { useState, useCallback, useMemo } from 'react';
import GameBanPickPanel from '../components/GameBanPickPanel';

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
  const [startsFirst, setStartsFirst] = useState(true); // 👈 Nuevo estado: quién comienza
  
  // Fases base
  const commonPhases: Phase[] = [
    { team: 'blue', action: 'ban', text: 'Blue Ban' },
    { team: 'red', action: 'ban', text: 'Red Ban' },
    { team: 'blue', action: 'ban', text: 'Blue Ban' },
    { team: 'red', action: 'ban', text: 'Red Ban' },
    { team: 'blue', action: 'pick', text: 'Blue Pick' },
    { team: 'red', action: 'pick', text: 'Red Pick' },
    { team: 'red', action: 'pick', text: 'Red Pick' },
    { team: 'blue', action: 'pick', text: 'Blue Pick' },
    { team: 'blue', action: 'pick', text: 'Blue Pick' },
    { team: 'red', action: 'pick', text: 'Red Pick' },
    { team: 'red', action: 'ban', text: 'Red Ban' },
    { team: 'blue', action: 'ban', text: 'Blue Ban' },
    { team: 'red', action: 'ban', text: 'Red Ban' },
    { team: 'blue', action: 'ban', text: 'Blue Ban' },
    { team: 'red', action: 'pick', text: 'Red Pick' },
    { team: 'blue', action: 'pick', text: 'Blue Pick' },
    { team: 'blue', action: 'pick', text: 'Blue Pick' },
    { team: 'red', action: 'pick', text: 'Red Pick' },
  ];

  // 🔁 Fases invertidas si el rojo empieza
  const phases = useMemo(() => {
  return startsFirst
    ? commonPhases
    : commonPhases.map(phase => ({
        ...phase,
        team: (phase.team === 'blue' ? 'red' : 'blue') as 'blue' | 'red', // ← 👈 Arreglo aquí
        text: phase.text.includes('Blue')
          ? phase.text.replace('Blue', 'Red')
          : phase.text.replace('Red', 'Blue'),
      }));
}, [startsFirst]);

  
  const [matchKey, setMatchKey] = useState(0);
  const [globalBannedPicks, setGlobalBannedPicks] = useState<GlobalBanPickState>({
    blueBans: [],
    redBans: [],
    bluePicks: [],
    redPicks: [],
  });
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [bestOfType, setBestOfType] = useState<'bo1' | 'bo3' | 'bo5'>('bo1');
  const [isDraftComplete, setIsDraftComplete] = useState(false);

  const startNewRound = useCallback(
    (type: 'bo1' | 'bo3' | 'bo5') => {
      setBestOfType(type);
      setCurrentRound(1);
      setMatchResults([]);
      setGlobalBannedPicks({
        blueBans: [],
        redBans: [],
        bluePicks: [],
        redPicks: [],
      });
      setMatchKey(prevKey => prevKey + 1); // 👈 Usamos las fases correctas según quién empieza
      setMatchKey(prevKey => prevKey + 1);
      setIsDraftComplete(false);
    },
    [phases]
  );

  const handleDraftComplete = useCallback(
    (picks: { bluePicks: number[]; redPicks: number[] }) => {
      setMatchResults(prevResults => [...prevResults, picks]);

      const nextRound = currentRound + 1;
      const maxRounds = bestOfType === 'bo3' ? 3 : bestOfType === 'bo5' ? 5 : 1;

      if (nextRound <= maxRounds) {
        setCurrentRound(nextRound);
        if (bestOfType !== 'bo1') {
          setGlobalBannedPicks(prev => ({
            blueBans: [],
            redBans: [],
            bluePicks: [...prev.bluePicks, ...picks.bluePicks],
            redPicks: [...prev.redPicks, ...picks.redPicks],
          }));
        }
        setMatchKey(prevKey => prevKey + 1);
      } else {
        console.log(`Serie BO${bestOfType.slice(2)} terminada.`, matchResults.concat(picks));
        setIsDraftComplete(true);
      }
    },
    [currentRound, bestOfType, matchResults, globalBannedPicks]
  );

  return (
  <div className='min-h-screen bg-gray-900'>
    {/* HEADER superior con botones de control */}
    <div className='flex justify-between items-center p-4 bg-blue-800 text-white flex-row'>
      <h3></h3>
      <div className='gap-4 flex flex-row items-center'>
        {/* CINNAMOROLL */}
        <div className="absolute top-1 right-0">
          <img 
            src="/heroesImg/cinnamoroll.png" 
            alt="Cinnamoroll" 
            className="w-16 h-16"
          />
        </div>

        {/* Botones de modo */}
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

        {/* NUEVO: Botones Blue / Red al lado */}
        <button
          onClick={() => setStartsFirst(true)}
          className={`ml-4 px-3 py-1.5 text-sm rounded-lg transition-all duration-300 ${
            startsFirst ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-700 text-gray-300'
          }`}
        >
          1st
        </button>
        <button
          onClick={() => setStartsFirst(false)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-300 ${
            !startsFirst ? 'bg-red-500 text-white shadow-md' : 'bg-gray-700 text-gray-300'
          }`}
        >
          2nd
        </button>
      </div>

      {/* Ícono GitHub */}
      <img src='/github-mark-white.png' className='w-8 h-8' alt="GitHub" />
    </div>

    {/* CUERPO de la página */}
    <div className="p-4">
      {bestOfType !== 'bo1' && !isDraftComplete && (
        <h2 className="text-white text-center text-2xl mb-4">
          Round {currentRound} of {bestOfType === 'bo3' ? '3' : '5'}
        </h2>
      )}

      <GameBanPickPanel
        key={matchKey}
        phases={phases}
        globalBannedPicks={globalBannedPicks}
        onDraftComplete={handleDraftComplete}
        
      />

      {isDraftComplete && (
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
