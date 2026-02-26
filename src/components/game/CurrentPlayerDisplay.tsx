import { useState } from "react";
import { useGameStore, selectCurrentPlayer } from "@/store";
import { GenreBadge } from "@/components/ui/GenreBadge";
import { getMaxValue } from "@/game-logic/dice/roller";
import { TRACK_EFFECT_DESCRIPTIONS } from "@/data/trackEffects";
import { DiceType } from "@/types";

const diceIcons: Record<DiceType, string> = {
  d4: "\u25B3",
  d6: "\u2684",
  d8: "\u2B21",
  d12: "\u2B22",
};

export function CurrentPlayerDisplay() {
  const currentPlayer = useGameStore(selectCurrentPlayer);
  const [hoveredSong, setHoveredSong] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!currentPlayer) return null;

  return (
    <div className="card-ornate p-3">
      <div className="flex items-center gap-4">
        {/* Player avatar */}
        <div
          className="player-avatar w-10 h-10 text-base flex-shrink-0"
          style={{ backgroundColor: currentPlayer.color }}
        >
          {currentPlayer.name.charAt(0)}
        </div>

        {/* Player name */}
        <div className="flex-shrink-0">
          <div className="font-medieval text-base font-bold text-gold-400">{currentPlayer.name}</div>
          <div className="text-xs text-parchment-400">Songs</div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 flex-shrink-0" style={{ background: "rgba(212, 168, 83, 0.2)" }} />

        {/* Songs display */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-2">
            {currentPlayer.songs.map((song) => (
              <div
                key={song.id}
                className="rounded-lg p-2 min-w-fit transition-all duration-150 hover:bg-tavern-600"
                style={{
                  background: "rgba(61, 48, 32, 0.5)",
                  border: "1px solid rgba(212, 168, 83, 0.12)",
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({ x: rect.left, y: rect.bottom + 8 });
                  setHoveredSong(song.id);
                }}
                onMouseLeave={() => setHoveredSong(null)}
              >
                <div className="h-5 text-sm font-bold text-parchment-400 mb-1 truncate max-w-[140px]">
                  {song.name}
                </div>
                <div className="flex gap-1">
                  {song.slots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="w-14 h-14 rounded flex flex-col items-center justify-center text-[10px]"
                      style={{
                        background: slot.dice
                          ? "rgba(212, 168, 83, 0.15)"
                          : "rgba(255, 255, 255, 0.03)",
                        border: slot.dice
                          ? "1px solid rgba(212, 168, 83, 0.25)"
                          : "1px dashed rgba(212, 168, 83, 0.1)",
                      }}
                    >
                      {slot.dice ? (
                        <>
                          <div className="text-gold-400 text-[24px] leading-none">
                            {diceIcons[slot.dice.type]}
                          </div>
                          <div className="font-bold text-[10px] text-parchment-300">
                            {slot.dice.genre}
                          </div>
                        </>
                      ) : (
                        <div className="text-parchment-500/30 text-[10px]">-</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating tooltip */}
      {hoveredSong && currentPlayer.songs.find((s) => s.id === hoveredSong) && (
        <div
          className="fixed z-[100] p-3 rounded-lg shadow-2xl w-64 pointer-events-none animate-fade-in"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            background: "linear-gradient(135deg, #2a2118, #1a1410)",
            border: "1px solid rgba(212, 168, 83, 0.3)",
          }}
        >
          {(() => {
            const song = currentPlayer.songs.find((s) => s.id === hoveredSong)!;
            return (
              <>
                <div className="font-medieval font-bold mb-2 text-gold-400">{song.name}</div>
                <div className="space-y-2 text-sm">
                  {/* Dice slots */}
                  {song.slots.map((slot, idx) => (
                    <div
                      key={`slot-${idx}`}
                      className="pb-1"
                      style={{
                        borderBottom: "1px solid rgba(212, 168, 83, 0.12)",
                      }}
                    >
                      <div className="font-bold text-parchment-400 text-xs">Slot {idx + 1}</div>
                      {slot.dice ? (
                        <div className="mt-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-parchment-300 text-xs">{slot.dice.type}</span>
                            <GenreBadge genre={slot.dice.genre} className="text-[9px] px-1 py-0" />
                          </div>
                          <div className="text-xs text-parchment-400">
                            Roll: 1-{getMaxValue(slot.dice.type)} (2x on max)
                          </div>
                        </div>
                      ) : (
                        <div className="text-parchment-500 text-xs">Empty slot</div>
                      )}
                    </div>
                  ))}
                  {/* Effects */}
                  {song.effects.length > 0 && (
                    <div className="pt-1">
                      <div className="font-bold text-parchment-400 text-xs mb-1">Effects</div>
                      {song.effects.map((effect, idx) => (
                        <div key={`fx-${idx}`} className="text-classical text-xs">
                          &#x2728; {TRACK_EFFECT_DESCRIPTIONS[effect.type] || effect.type}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
