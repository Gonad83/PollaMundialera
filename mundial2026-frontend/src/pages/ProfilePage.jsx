import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { predictionApi } from '../lib/api'

export default function ProfilePage() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const isMe = id === me?.id

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.get(`/users/${id}/profile`).then(r => r.data),
  })

  const { data: predictions = [] } = useQuery({
    queryKey: ['predictions-history', id],
    queryFn: () => predictionApi.my({ status: 'FINISHED' }).then(r => r.data),
    enabled: isMe,
  })

  if (isLoading) return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-40 card bg-zinc-800/50" />
      <div className="h-32 card bg-zinc-800/50" />
    </div>
  )

  if (!profile) return <p className="text-zinc-500">Usuario no encontrado</p>

  const accuracy = profile.played > 0
    ? Math.round((profile.exactHits / profile.played) * 100)
    : 0

  const recentFinished = predictions.slice(0, 10)

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Profile card */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-field-900 border border-field-700 flex items-center justify-center text-2xl font-display text-field-400">
            {profile.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl text-zinc-100">{profile.username}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Miembro desde {new Date(profile.createdAt).toLocaleDateString('es', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl text-gold-400">{profile.totalPoints}</p>
            <p className="text-xs text-zinc-500">puntos totales</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Partidos apostados" value={profile.played} />
        <StatCard label="Exactos" value={profile.exactHits} color="text-field-400" />
        <StatCard label="Precisión exacta" value={`${accuracy}%`} color="text-gold-400" />
      </div>

      {/* Accuracy bar */}
      {profile.played > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex justify-between text-xs text-zinc-500 mb-2">
            <span>Distribución de aciertos</span>
            <span>{profile.played} partidos</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-field-600 rounded-full transition-all"
              style={{ width: `${accuracy}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-zinc-600">0%</span>
            <span className="text-field-500">{accuracy}% exactos</span>
            <span className="text-zinc-600">100%</span>
          </div>
        </div>
      )}

      {/* Recent predictions (solo el propio usuario) */}
      {isMe && recentFinished.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="font-display text-lg text-zinc-100">ÚLTIMAS APUESTAS</h2>
          </div>
          <div>
            {recentFinished.map((pred) => {
              const m = pred.match
              return (
                <Link
                  key={pred.id}
                  to={`/matches/${pred.matchId}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 truncate">
                      {m?.teamHome?.name} vs {m?.teamAway?.name}
                    </p>
                    <p className="text-xs text-zinc-600">
                      Real: {m?.scoreHome}–{m?.scoreAway} · Aposté: {pred.predHome}–{pred.predAway}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono font-medium ${pred.pointsTotal > 0 ? 'text-gold-400' : 'text-zinc-600'}`}>
                      +{pred.pointsTotal} pts
                    </p>
                    <p className="text-xs text-zinc-600">
                      {pred.pointsExact >= 5 ? '🔥 Exacto' : pred.pointsWinner > 0 ? '✓ Ganador' : '—'}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {isMe && recentFinished.length === 0 && (
        <div className="card p-6 text-center text-zinc-600">
          <p>Aún no tienes partidos finalizados</p>
          <Link to="/matches" className="text-field-500 text-sm mt-2 inline-block">Ver partidos →</Link>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color = 'text-zinc-100' }) {
  return (
    <div className="card p-4 text-center">
      <p className={`font-display text-3xl ${color}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  )
}
