// src/components/GameBanPickPanel.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { heroListData } from './HeroList';

// Type definitions (manteniendo los tuyos y añadiendo los nuevos)
interface Hero {
  id: number;
  chineseName: string;
  englishName: string;
  occupation: string;
  altOccupation?: string;
  combo?: number[];
  counter?: number[];
  beCountered?: number[];
}

interface Role {
  id: string;
  name: string;
  englishName: string;
}

interface Phase {
  team: 'blue' | 'red';
  action: 'ban' | 'pick';
  text: string;
}

interface SelectedHeroes {
  blueBans: number[];
  redBans: number[];
  bluePicks: number[];
  redPicks: number[];
}

interface HistoryState {
  selectedHeroes: SelectedHeroes;
  currentPhase: number;
}

interface Recommendations {
  combos: number[];
  counters: number[];
  beCountered: number[];
  enemyBeCountered: number[];
}

// =====================================================================
// NUEVOS TIPOS para los props de GameBanPickPanel
// =====================================================================
interface GlobalBanPickState {
  blueBans: number[];
  redBans: number[];
  bluePicks: number[];
  redPicks: number[];
}

interface GameBanPickPanelProps {
  phases: Phase[];
  globalBannedPicks: GlobalBanPickState; // Los bans y picks que persisten a lo largo de la serie
  onDraftComplete: (picks: { bluePicks: number[], redPicks: number[] }) => void; // Callback al finalizar el draft
}
// =====================================================================


const GameBanPickPanel = ({
  phases,
  globalBannedPicks, // Recibimos los bans/picks globales
  onDraftComplete     // Recibimos el callback
}: GameBanPickPanelProps) => { // Usamos la nueva interfaz de props
  const [language, setLanguage] = useState<'esp' | 'zh' | 'eng'>('eng');
  const [userTeam, setUserTeam] = useState<'blue' | 'red'>('blue');
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedHeroes, setSelectedHeroes] = useState<SelectedHeroes>({
    blueBans: [],
    redBans: [],
    bluePicks: [],
    redPicks: [],
  });
  const [history, setHistory] = useState<HistoryState[]>([]);
  // const [resetCounter, setResetCounter] = useState(0); // Ya no es necesario aquí, Dashboard lo maneja con 'key'

  const roles: Role[] = [
    { id: 'Jungla', name: '打野', englishName: 'Jungla' },
    { id: 'Top', name: '对抗路', englishName: 'Top' },
    { id: 'Mid', name: '中路', englishName: 'Mid' },
    { id: 'Support', name: '游走', englishName: 'Support' },
    { id: 'ADC', name: '发育路', englishName: 'ADC' },
    { id: 'all', name: '所有', englishName: 'All' },
  ];
  const roleOrder = ['ADC', 'Mid', 'Support', 'Jungla', 'Top'];
  const handleLanguage = () => {
    setLanguage(prevLanguage => (prevLanguage === 'eng' ? 'zh' : 'eng'));
  };

  useEffect(() => {
    if (currentPhase < phases.length) {
      setUserTeam(phases[currentPhase].team);
    } else {
      // El draft ha terminado, notificar al componente padre (Dashboard)
      onDraftComplete({
        bluePicks: selectedHeroes.bluePicks,
        redPicks: selectedHeroes.redPicks
      });
      // Opcional: Podríamos aquí agregar un estado local para "draftTerminado"
      // para mostrar un mensaje de "Draft Completado, esperando siguiente ronda..."
    }
  }, [currentPhase, phases, onDraftComplete, selectedHeroes.bluePicks, selectedHeroes.redPicks]); // Añadir dependencias necesarias


  const handleChampionClick = (championId: number): void => {
    if (currentPhase >= phases.length) return; // Ya terminó el draft actual

    const currentAction = phases[currentPhase];
    const { team, action } = currentAction;

    // Verificar si el héroe ya está globalmente baneado o pickeado
    const isGloballySelected = (id: number): boolean => {
  const { team, action } = phases[currentPhase];

  // Para los bans, siempre aplica para ambos equipos
  if (action === 'ban') {
    return globalBannedPicks.blueBans.includes(id) || globalBannedPicks.redBans.includes(id);
  }

  // Para picks, solo se bloquean los héroes ya pickeados globalmente por el MISMO equipo
  if (team === 'blue') {
    return globalBannedPicks.bluePicks.includes(id);
  } else {
    return globalBannedPicks.redPicks.includes(id);
  }
};
    if (isGloballySelected(championId)) {
        console.warn(`Hero ${championId} is already globally banned/picked.`);
        return; // No permitir selección si ya está globalmente inhabilitado
    }


    setHistory(prev => [...prev, {
      selectedHeroes: { ...selectedHeroes },
      currentPhase
    }]);

    setSelectedHeroes(prev => {
      const key = `${team}${action === 'ban' ? 'Bans' : 'Picks'}` as keyof SelectedHeroes;
      // Asegurarse de que el héroe no se agregue si ya está en la lista (evitar duplicados)
      if (prev[key].includes(championId)) {
          return prev;
      }
      return {
        ...prev,
        [key]: [...prev[key], championId]
      };
    });

    setCurrentPhase(prev => prev + 1);
  };

  const handleUndo = (): void => {
    if (history.length === 0) return;

    const lastState = history[history.length - 1];
    setSelectedHeroes(lastState.selectedHeroes);
    setCurrentPhase(lastState.currentPhase);
    setHistory(prev => prev.slice(0, -1));
  };

  const resetDraft = (): void => {
    // Este reset ahora solo reinicia la ronda actual del draft
    setCurrentPhase(0);
    setSelectedHeroes({
      blueBans: [],
      redBans: [],
      bluePicks: [],
      redPicks: [],
    });
    setSelectedRole('all');
    setHistory([]);
    // Ya no usamos setResetCounter, porque Dashboard maneja el reinicio con el 'key'
  };

  const getHeroById = useCallback((id: number): Hero | undefined => {
    return heroListData.find(hero => hero.id === id);
  }, []);

  const getTeamPicks = useCallback((team: 'blue' | 'red'): number[] => {
    return team === 'blue' ? selectedHeroes.bluePicks : selectedHeroes.redPicks;
  }, [selectedHeroes]);

  const recommendations = useMemo(() => {
    const currentTeamPicks = getTeamPicks(userTeam);
    const enemyTeamPicks = getTeamPicks(userTeam === 'blue' ? 'red' : 'blue');
    const bannedHeroes = [
      ...selectedHeroes.blueBans,
      ...selectedHeroes.redBans,
      // Considerar también los bans globales para las recomendaciones
      ...globalBannedPicks.blueBans,
      ...globalBannedPicks.redBans
    ];
    // Y los picks globales para que no recomiende picks ya hechos en rondas anteriores
    const pickedHeroes = [
        ...selectedHeroes.bluePicks,
        ...selectedHeroes.redPicks,
        ...globalBannedPicks.bluePicks,
        ...globalBannedPicks.redPicks
    ];


    if (currentTeamPicks.length === 0 && enemyTeamPicks.length === 0) {
      return {
        combos: [],
        counters: [],
        beCountered: [],
        enemyBeCountered: []
      };
    }

    const recs: Recommendations = {
      combos: [],
      counters: [],
      beCountered: [],
      enemyBeCountered: []
    };

    const addedCombos = new Set<number>();
    const addedCounters = new Set<number>();
    const addedBeCountered = new Set<number>();
    const addedEnemyBeCountered = new Set<number>();

    currentTeamPicks.forEach(heroId => {
      const hero = getHeroById(heroId);
      if (hero) {
        if (hero.combo) {
          hero.combo.forEach(id => {
            if (!bannedHeroes.includes(id) && !pickedHeroes.includes(id) && !addedCombos.has(id)) { // <-- Añadido pickedHeroes
              recs.combos.push(id);
              addedCombos.add(id);
            }
          });
        }
        if (hero.counter) {
          hero.counter.forEach(id => {
            if (!bannedHeroes.includes(id) && !pickedHeroes.includes(id) && !addedCounters.has(id)) { // <-- Añadido pickedHeroes
              recs.counters.push(id);
              addedCounters.add(id);
            }
          });
        }
        if (hero.beCountered) {
          hero.beCountered.forEach(id => {
            if (!bannedHeroes.includes(id) && !pickedHeroes.includes(id) && !addedBeCountered.has(id)) { // <-- Añadido pickedHeroes
              recs.beCountered.push(id);
              addedBeCountered.add(id);
            }
          });
        }
      }
    });

    enemyTeamPicks.forEach(heroId => {
      const hero = getHeroById(heroId);
      if (hero && hero.beCountered) {
        hero.beCountered.forEach(id => {
          if (!bannedHeroes.includes(id) && !pickedHeroes.includes(id) && !addedEnemyBeCountered.has(id)) { // <-- Añadido pickedHeroes
            recs.enemyBeCountered.push(id);
            addedEnemyBeCountered.add(id);
          }
        });
      }
    });

    return recs;
  }, [selectedHeroes, userTeam, getHeroById, getTeamPicks, globalBannedPicks]); // <-- Añadir globalBannedPicks a las dependencias


  const isChampionSelected = (championId: number): boolean => {
  if (currentPhase >= phases.length) return true;

  const { team, action } = phases[currentPhase];

  // Bloqueo de bans hechos en esta ronda
  const isBannedThisRound =
    selectedHeroes.blueBans.includes(championId) ||
    selectedHeroes.redBans.includes(championId);

  // Bloqueo de picks hechos en esta ronda
  const isPickedThisRound =
    selectedHeroes.bluePicks.includes(championId) ||
    selectedHeroes.redPicks.includes(championId);

  // Bloqueo de picks globales del mismo equipo
  const isGloballyPickedBySameTeam = team === 'blue'
    ? globalBannedPicks.bluePicks.includes(championId)
    : globalBannedPicks.redPicks.includes(championId);

  if (action === 'ban') {
    // Durante ban, no puedes banear algo ya baneado o pickeado en esta misma ronda
    return isBannedThisRound || isPickedThisRound;
  }

  if (action === 'pick') {
    // Durante pick, no puedes pickear si fue baneado, pickeado en esta ronda, o pickeado por ti en rondas anteriores
    return isBannedThisRound || isPickedThisRound || isGloballyPickedBySameTeam;
  }

  return false;
};

  const getCurrentActionText = (): string => {
    if (currentPhase >= phases.length) return 'Draft Finalizado'; // Mensaje de finalización
    return phases[currentPhase]?.text || 'Loading Phase...';
  };

  const isUserTurn = (): boolean => {
    if (currentPhase >= phases.length) return false;
    return phases[currentPhase]?.team === userTeam;
  };

  const getBackgroundColor = (): string => {
    if (currentPhase >= phases.length) return 'from-stone-900 to-stone-800';
    return phases[currentPhase]?.team === 'blue'
      ? 'from-slate-900 to-slate-800'
      : 'from-rose-950 to-gray-900';
  };

  const filteredHeroes = useMemo(() => {
    return heroListData.filter(item =>
      selectedRole === 'all' || item.occupation === selectedRole || item.altOccupation === selectedRole
    );
  }, [selectedRole, heroListData]);

  const getRecommendationSources = useCallback((heroId: number, teamPicks: number[]): string[] => {
    return teamPicks
      .map(pickId => {
        const hero = getHeroById(pickId);
        if (hero) {
          // Revisa si el héroe `heroId` está en las propiedades de recomendación del `hero`
          if (language === 'zh') {
            if (hero.combo?.includes(heroId)) return hero.chineseName;
            if (hero.counter?.includes(heroId)) return hero.chineseName;
            if (hero.beCountered?.includes(heroId)) return hero.chineseName;
          } else { // language === 'eng'
            if (hero.combo?.includes(heroId)) return hero.englishName;
            if (hero.counter?.includes(heroId)) return hero.englishName;
            if (hero.beCountered?.includes(heroId)) return hero.englishName;
          }
        }
        return null;
      })
      .filter((name): name is string => name !== null);
  }, [getHeroById, language]);
  const getHeroesByRole = (ids: number[]) => {
  const grouped: { [role: string]: typeof heroListData } = {};
  
  ids.forEach(id => {
    const hero = getHeroById(id);
    if (hero) {
      const role = hero.occupation || 'Others';
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push(hero as any);

    }
  });

  return grouped;
};
const isBanPhase = phases[currentPhase]?.action === 'ban';
const isPickPhase = phases[currentPhase]?.action === 'pick';

  return (
    <div className={`min-h-screen bg-gradient-to-b ${getBackgroundColor()} p-4 transition-all duration-500 w-[100vw] flex flex-row`}>
      <div className='w-[80%]'>
        {/* Header Controls */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUserTeam('blue')}
              className={`px-4 py-2 rounded transition-colors duration-300 ${
                userTeam === 'blue' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {language === 'eng' ? 'Blue Team' : '蓝色方'}
            </button>
            <button
              onClick={() => setUserTeam('red')}
              className={`px-4 py-2 rounded transition-colors duration-300 ${
                userTeam === 'red' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {language === 'eng' ? 'Red Team' : '红色方'}
            </button>
          </div>
          <div className="text-white text-xl font-bold">
            {getCurrentActionText()}
          </div>
          <div className="flex gap-4">
            <button className={`px-4 py-2 rounded transition-colors duration-300 bg-blue-600`} onClick={handleLanguage}> <span className={`${language === 'eng' ? 'text-black' : 'text-gray-700'}`}>English</span> / <span className={`${language === 'zh' ? 'text-black' : 'text-gray-700'}`}>中文</span></button>

            <button
              onClick={handleUndo}
              disabled={history.length === 0 || currentPhase >= phases.length} // Deshabilitar si el draft terminó
              className={`px-4 py-2 rounded transition-colors duration-300 ${
                history.length > 0 && currentPhase < phases.length
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {language === 'eng' ? 'Undo' : '撤销'}
            </button>
            <button
              onClick={resetDraft} // Este botón ahora solo reinicia la ronda actual
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors duration-300"
            >
              {language === 'eng' ? 'Reset Current Round' : '重置本轮'}
            </button>
          </div>
        </div>

        {/* Role Filter Buttons */}
        <div className="flex justify-center gap-4 mb-4">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`px-4 py-2 rounded transition-colors duration-300 ${
                selectedRole === role.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {language === 'eng' ? role.englishName : role.name}
            </button>
          ))}
        </div>

        {/* Main Layout */}
        <div className="flex gap-4">
          {/* Blue Team Side Panel */}
          <div className="w-32 space-y-4">
            <div className="bg-blue-900/30 p-4 rounded border-2 border-blue-500/40 shadow-sm">
              <h3 className="text-blue-400 font-bold mb-4">{language === 'eng' ? 'Blue Team' : '蓝方'}
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-red-500 font-bold mb-2">{language === 'eng' ? 'Bans' : '禁用 (本轮)'}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedHeroes.blueBans.map(id => {
                      const hero = getHeroById(id);
                      return hero && (
                        <div key={id} className="aspect-square bg-gray-700 rounded overflow-hidden opacity-50">
                          <img src={`/heroesImg/${hero.id}.png`}
                            alt={hero.englishName} className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-green-500 font-bold mb-2">{language === 'eng' ? 'Picks' : '选择 (本轮)'} </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedHeroes.bluePicks.map(id => {
                      const hero = getHeroById(id);
                      return hero && (
                        <div key={id} className="w-[48px] h-[48px] rounded-md border border-white shadow-sm">
                          <img src={`/heroesImg/${hero.id}.png`} alt={hero.englishName} className="w-full h-full object-cover" />
                        </div>)
                    })}
                  </div>
                </div>
                {/* Global Bans Display */}
                <div>
                  <h4 className="text-red-300 font-bold mb-2">{language === 'eng' ? '' : ''}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {globalBannedPicks.blueBans.map(id => {
                      const hero = getHeroById(id);
                      return hero && (
                        <div key={id} className="aspect-square bg-gray-700 rounded overflow-hidden opacity-30 border border-yellow-500">
                          <img src={`/heroesImg/${hero.id}.png`}
                            alt={hero.englishName} className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Global Picks Display (if needed for visual feedback) */}
                <div>
                  <h4 className="text-green-300 font-bold mb-2">
                    {language === 'eng' ? 'Global Picks' : '全局选择'}
                  </h4>
                  {Object.entries(getHeroesByRole(globalBannedPicks.bluePicks))
  .sort(([a], [b]) => roleOrder.indexOf(a) - roleOrder.indexOf(b))
  .map(([role, heroes]) => (

                    <div key={role} className="mb-3">
                      <p className="text-xs text-white font-semibold mb-1">{role}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {heroes.map(hero => (
                          <div
                            key={hero.id}
                            className="aspect-square w-[48px] h-[48px] rounded-md border border-gray-400 opacity-80"
                          >
                            <img
                              src={`/heroesImg/${hero.id}.png`}
                              alt={hero.englishName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Champion Grid */}
          <div className="flex-1">
            <div className={`grid grid-cols-9 gap-1 p-2 rounded transition-all duration-300
  ${isBanPhase ? 'bg-black-900/20 ring-2 ring-gray-500' : ''}
  ${isPickPhase ? 'bg-black-900/20 ring-2 ring-orange-400' : ''}
`}>
              {filteredHeroes.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    // Solo permitir clic si no está seleccionado globalmente y es el turno del usuario
                    if (!isChampionSelected(item.id) && isUserTurn() && currentPhase < phases.length) {
                      handleChampionClick(item.id);
                    }
                  }}
                  className="flex flex-col items-center space-y-1 cursor-pointer"
                >
                  <div
                    className={`
                      relative w-[85px] h-[85px] transition-all
                      ${isChampionSelected(item.id)
                        ? 'opacity-10 cursor-not-allowed grayscale brightness-75'
                        : isUserTurn() && currentPhase < phases.length // Solo permite hover si es turno y no ha terminado
                          ? 'cursor-pointer hover:ring-2 hover:ring-yellow-500'
                          : 'cursor-not-allowed '
                      }
                    `}
                  >
                    <img
                      src={`/heroesImg/${item.id}.png`}
                      alt={language === 'eng' ? item.englishName : item.chineseName} // Usar language para alt
                      className="w-full h-full object-cover rounded-full border border-gray-600"
                    />
                    {isChampionSelected(item.id) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <span className="text-red-500 text-4xl font-bold">×</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-white text-center font-semibold w-[56px] leading-tight">
                    {language === 'eng' ? item.englishName : item.chineseName}
                  </span>
                </div>
              ))}
            </div>
            {/* Current Phase Display */}
            <div className="mt-4 flex justify-center">
              <div className={`px-6 py-3 rounded-lg ${
                phases[currentPhase]?.team === 'blue' ? '' : ''
              }`}>
                <span
  className={`text-white font-bold text-xl uppercase px-4 py-2 rounded transition-all duration-300
    ${phases[currentPhase]?.action === 'ban' 
      ? 'bg-brown-600 animate-pulse ring-2 ring-brown-400' 
      : ''}`}
>
  {phases[currentPhase]?.action === 'ban' ? '🚫 ' : ''}{getCurrentActionText()}
</span>
              </div>
            </div>
          </div>
          {/* Red Team Side Panel */}
          <div className="w-32 space-y-4">
            <div className="bg-rose-900/40 p-4 rounded border-2 border-rose-500/40 shadow-sm">
              <h3 className="text-rose-300 font-bold mb-4">{language === 'eng' ? 'Red Team' : '红方'} </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-red-500 font-bold mb-2">{language === 'eng' ? 'Bans' : '禁用 (本轮)'} </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedHeroes.redBans.map(id => {
                      const hero = getHeroById(id);
                      return hero && (
                        <div key={id} className="aspect-square bg-gray-700 rounded overflow-hidden opacity-50">
                          <img src={`/heroesImg/${hero.id}.png`}
                            alt={hero.englishName} className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-green-500 font-bold mb-2">{language === 'eng' ? 'Picks' : '选择 (本轮)'} </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedHeroes.redPicks.map(id => {
                      const hero = getHeroById(id);
                      return hero && (
                        <div key={id} className="w-[48px] h-[48px] rounded-md border border-white shadow-sm">
                          <img src={`/heroesImg/${hero.id}.png`} alt={hero.englishName} className="w-full h-full object-cover" />
                        </div>)
                    })}
                  </div>
                </div>
                {/* Global Bans Display */}
                <div>
                  <h4 className="text-red-300 font-bold mb-2">{language === 'eng' ? '' : ''}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {globalBannedPicks.redBans.map(id => {
                      const hero = getHeroById(id);
                      return hero && (
                        <div key={id} className="aspect-square bg-gray-700 rounded overflow-hidden opacity-30 border border-yellow-500">
                          <img src={`/heroesImg/${hero.id}.png`}
                            alt={hero.englishName} className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Global Picks Display (if needed for visual feedback) */}
                <div>
                  <h4 className="text-green-300 font-bold mb-2">
                    {language === 'eng' ? 'Global Picks' : '全局选择'}
                  </h4>
                  {Object.entries(getHeroesByRole(globalBannedPicks.redPicks))
    .sort(([a], [b]) => roleOrder.indexOf(a) - roleOrder.indexOf(b))
    .map(([role, heroes]) => (
                    <div key={role} className="mb-3">
                      <p className="text-xs text-white font-semibold mb-1">{role}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {heroes.map(hero => (
                          <div
                            key={hero.id}
                            className="aspect-square w-[48px] h-[48px] rounded-md border border-gray-400 opacity-80"
                          >
                            <img
                              src={`/heroesImg/${hero.id}.png`}
                              alt={hero.englishName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Recommendation Panel */}
      <div className="w-[260px] ml-auto mr-6 bg-gray-800/50 rounded-lg p-2">
        <h2 className="text-white font-bold text-xl mb-4">Recommendations</h2>
        {(recommendations.combos.length > 0 ||
          recommendations.counters.length > 0 ||
          recommendations.beCountered.length > 0 ||
          recommendations.enemyBeCountered.length > 0) ? (
          <div className="space-y-6">
            {recommendations.enemyBeCountered.length > 0 && (
              <div>
                <h3 className="text-purple-400 font-bold mb-2">{language === 'eng' ? `Enemigo contrarrestado por` : '对方英雄被以下英雄克制'}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {recommendations.enemyBeCountered.map(heroId => {
                    const hero = getHeroById(heroId);
                    const enemyTeam = userTeam === 'blue' ? 'red' : 'blue';
                    const sources = getRecommendationSources(heroId, getTeamPicks(enemyTeam));
                    return hero && (
                      <div key={heroId} className="flex flex-col items-center">
                        <div className="aspect-square w-[64px] bg-gray-700/50 rounded overflow-hidden">
                          <img
                            src={`/heroesImg/${hero.id}.png`}
                            alt={hero.englishName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="mt-1 text-xs text-gray-300 text-center">
                          <div>{language === 'eng' ? hero.englishName : hero.chineseName}</div>
                          <div className="text-purple-400">
                            {language === 'eng' ? `Counter: ${sources.join(', ')}` : `克制: ${sources.join(', ')}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {recommendations.beCountered.length > 0 && (
              <div>
                <h3 className="text-red-400 font-bold mb-2">{language === 'eng' ? 'Cuidado con' : '我方被以下英雄克制'}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {recommendations.beCountered.map(heroId => {
                    const hero = getHeroById(heroId);
                    const sources = getRecommendationSources(heroId, getTeamPicks(userTeam));
                    return hero && (
                      <div key={heroId} className="flex flex-col items-center">
                        <div className="aspect-square w-[64px] bg-gray-700/50 rounded overflow-hidden">
                          <img
                            src={`/heroesImg/${hero.id}.png`}
                            alt={hero.englishName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="mt-1 text-xs text-gray-300 text-center">
                          {language === 'eng' ? <div>{hero.englishName}</div> : <div>{hero.chineseName}</div>}
                          <div className="text-red-400">
                            {language === 'eng' ? `Counter: ${sources.join(', ')}` : `克制: ${sources.join(', ')}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {recommendations.combos.length > 0 && (
              <div>
                <h3 className="text-green-400 font-bold mb-2">{language === 'eng' ? 'Combos y Sinergias' : '好配合'}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {recommendations.combos.map(heroId => {
                    const hero = getHeroById(heroId);
                    const sources = getRecommendationSources(heroId, getTeamPicks(userTeam));
                    return hero && (
                      <div key={heroId} className="flex flex-col items-center">
                        <div className="aspect-square w-[64px] bg-gray-700/50 rounded overflow-hidden">
                          <img
                            src={`/heroesImg/${hero.id}.png`}
                            alt={hero.englishName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="mt-1 text-xs text-gray-300 text-center">
                          {language === 'eng' ? <div>{hero.englishName}</div> : <div>{hero.chineseName}</div>}
                          <div className="text-green-400">
                            {language === 'eng' ? `With ${sources.join(', ')}` : `和${sources.join(', ')}配合`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="text-gray-400">
            Select heroes to see recommendations
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBanPickPanel;