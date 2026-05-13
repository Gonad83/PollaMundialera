export default function RulesPage() {
  return (
    <div className="animate-slide-up max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="font-display text-3xl text-zinc-100">REGLAS DE LA POLLA</h1>
        <span className="badge badge-blue">📖</span>
      </div>

      {/* Intro */}
      <div className="card p-6 mb-6 border-l-4 border-field-600">
        <p className="text-zinc-300 leading-relaxed">
          Bienvenido a la <strong className="text-field-400">Polla del Mundial 2026</strong>. 
          El objetivo es acumular la mayor cantidad de puntos posible prediciendo los resultados 
          de los 104 partidos del torneo y realizando pronósticos sobre el campeonato en general.
        </p>
      </div>

      {/* Puntos por partido */}
      <section className="mb-8">
        <h2 className="font-display text-xl text-zinc-200 mb-4 flex items-center gap-2">
          ⚽ <span>PREDICCIONES POR PARTIDO</span>
        </h2>
        <div className="space-y-3">
          <ScoreRow
            pts={5}
            color="gold"
            title="Resultado Exacto"
            desc="Aciertas el marcador exacto (ej: Argentina 2-1 Brasil)"
          />
          <ScoreRow
            pts={2}
            color="field"
            title="Ganador o Empate"
            desc="Aciertas quién gana o si termina en empate, pero no el marcador exacto"
          />
          <ScoreRow
            pts={2}
            color="blue"
            title="Primer Goleador"
            desc="Aciertas quién abre el marcador en el partido (bonus adicional)"
          />
          <ScoreRow
            pts={1}
            color="blue"
            title="Ambos Equipos Anotan (BTTS)"
            desc="Aciertas si ambos equipos logran al menos un gol"
          />
          <ScoreRow
            pts={1}
            color="blue"
            title="Over/Under 2.5"
            desc="Aciertas si el partido tendrá más o menos de 2.5 goles en total"
          />
          <ScoreRow
            pts={1}
            color="blue"
            title="Penales (Eliminatoria)"
            desc="Aciertas si el partido se definirá en penales"
          />
        </div>
      </section>

      {/* Bonos */}
      <section className="mb-8">
        <h2 className="font-display text-xl text-zinc-200 mb-4 flex items-center gap-2">
          🔥 <span>BONIFICACIONES ESPECIALES</span>
        </h2>
        <div className="space-y-3">
          <ScoreRow
            pts={5}
            color="gold"
            title="Racha de 3 Exactos"
            desc="Si aciertas el resultado exacto en 3 partidos consecutivos, ¡ganas 5 puntos extra!"
          />
        </div>
      </section>

      {/* Pronosticos del torneo */}
      <section className="mb-8">
        <h2 className="font-display text-xl text-zinc-200 mb-4 flex items-center gap-2">
          🏆 <span>PRONÓSTICOS DEL TORNEO</span>
        </h2>
        <p className="text-zinc-500 text-sm mb-4">
          Antes del inicio del torneo podrás realizar pronósticos sobre el desarrollo del campeonato. 
          <strong className="text-zinc-400"> Solo puedes enviarlos una vez</strong>, ¡así que piénsalos bien!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TournamentRow icon="🥇" label="Campeón del mundo" pts={30} />
          <TournamentRow icon="🥈" label="Finalista (cada uno)" pts={15} />
          <TournamentRow icon="⬆️" label="Semifinalista (cada uno)" pts={8} />
          <TournamentRow icon="📋" label="Cuartofinalista (cada uno)" pts={4} />
          <TournamentRow icon="🗂️" label="Clasificado a 2da ronda (c/u)" pts={1} />
          <TournamentRow icon="👟" label="Goleador del torneo" pts={20} />
          <TournamentRow icon="⭐" label="Mejor jugador (Balón de Oro)" pts={15} />
          <TournamentRow icon="🧤" label="Mejor portero (Guante de Oro)" pts={12} />
          <TournamentRow icon="🌟" label="Mejor joven del torneo" pts={10} />
          <TournamentRow icon="⚽" label="Total de goles (exacto)" pts={8} />
          <TournamentRow icon="💥" label="Equipo más goleador" pts={6} />
          <TournamentRow icon="🛡️" label="Equipo menos goleado" pts={6} />
          <TournamentRow icon="🇺🇸" label="Sede anfitriona más lejos" pts={5} />
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          * Si aciertas el equipo del goleador/mejor jugador/portero/joven pero no exactamente al jugador, obtienes 3-4 pts.
        </p>
      </section>

      {/* Tips */}
      <div className="card p-5 bg-zinc-900/50 border-zinc-800">
        <h3 className="font-display text-zinc-300 mb-3">💡 CONSEJOS</h3>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li>• Puedes modificar tus predicciones hasta que el partido comience.</li>
          <li>• Una vez que el árbitro da el pitazo inicial, tus predicciones quedan bloqueadas.</li>
          <li>• Los pronósticos del torneo se bloquean al inicio del primer partido.</li>
          <li>• Crea o únete a un grupo privado para competir con tus amigos.</li>
        </ul>
      </div>
    </div>
  )
}

function ScoreRow({ pts, color, title, desc }) {
  const colors = {
    gold:  'bg-yellow-900/30 border-yellow-700/50 text-yellow-400',
    field: 'bg-field-900/30 border-field-700/50 text-field-400',
    blue:  'bg-blue-900/30 border-blue-700/50 text-blue-400',
  }
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${colors[color]}`}>
      <div className="shrink-0 w-12 h-12 rounded-xl bg-zinc-900/50 flex items-center justify-center">
        <span className="font-display text-xl">{pts}</span>
        <span className="text-xs ml-0.5">pts</span>
      </div>
      <div>
        <p className="font-medium text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function TournamentRow({ icon, label, pts }) {
  return (
    <div className="flex items-center justify-between p-3 card">
      <span className="text-zinc-300 text-sm flex items-center gap-2">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
      <span className="font-display text-field-400 shrink-0 ml-3">{pts} pts</span>
    </div>
  )
}
