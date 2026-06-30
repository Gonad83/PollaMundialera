import { CheckCircle2, XCircle } from 'lucide-react'

// Calcula las filas del desglose de puntos de un pronóstico vs el resultado real.
// Misma fórmula que el backend (calculatePredictionPoints): exacto 5 · ganador/empate 2 ·
// ambos marcan 1 · over/under 1 · penales 1. Se computa del marcador para no depender
// de campos guardados, y sirve igual en la Comparativa (modal) y en el detalle de partido.
export function buildChecklist(pred, match) {
  if (!pred || !match || match.scoreHome == null || match.scoreAway == null) return []
  const sh = match.scoreHome, sa = match.scoreAway
  const isDraw = sh === sa
  const exact = pred.predHome === sh && pred.predAway === sa
  const sameSide = !exact && Math.sign(pred.predHome - pred.predAway) === Math.sign(sh - sa)

  const rows = []
  if (exact) {
    rows.push({ ok: true, pts: 5, max: '5', label: 'Marcador exacto', sub: `apostó ${pred.predHome}-${pred.predAway} · clavó el marcador` })
  } else if (sameSide) {
    rows.push({ ok: true, pts: 2, max: '2', label: isDraw ? 'Empate acertado' : 'Ganador acertado', sub: `apostó ${pred.predHome}-${pred.predAway} · fue ${sh}-${sa}` })
  } else {
    rows.push({ ok: false, pts: 0, max: '5 / 2', label: 'Resultado', sub: `apostó ${pred.predHome}-${pred.predAway} · fue ${sh}-${sa}${isDraw ? ' (empate)' : ''}` })
  }
  if (pred.predBtts != null) {
    const real = sh > 0 && sa > 0
    rows.push({ ok: pred.predBtts === real, pts: 1, max: '1', label: 'Ambos marcan', sub: `apostó ${pred.predBtts ? 'sí' : 'no'} · real ${real ? 'sí' : 'no'}` })
  }
  if (pred.predOverUnder) {
    const real = (sh + sa) > 2.5 ? 'over' : 'under'
    rows.push({ ok: pred.predOverUnder === real, pts: 1, max: '1', label: 'Goles +2.5', sub: `apostó ${pred.predOverUnder === 'over' ? 'más' : 'menos'} · fueron ${sh + sa}` })
  }
  if (pred.predPenalties != null) {
    const real = !!match.wentToPenalties
    rows.push({ ok: pred.predPenalties === real, pts: 1, max: '1', label: '¿Va a penales?', sub: `apostó ${pred.predPenalties ? 'sí' : 'no'} · real ${real ? 'sí' : 'no'}` })
  }
  return rows
}

// Lista del checklist: una fila por criterio, con tilde verde (ganó) o cruz roja (no ganó).
export default function PointsChecklist({ pred, match }) {
  const rows = buildChecklist(pred, match)
  if (!rows.length) return null
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${r.ok ? 'border-emerald-500/20 bg-emerald-500/[0.08]' : 'border-white/8 bg-white/[0.03]'}`}>
          {r.ok
            ? <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            : <XCircle size={16} className="shrink-0 text-red-400/70" />}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black leading-tight text-white">
              {r.label} <span className="text-zinc-600">· {r.max}</span>
            </p>
            <p className="text-[9px] font-bold leading-tight text-zinc-500">{r.sub}</p>
          </div>
          <span className={`shrink-0 font-display text-sm ${r.ok ? 'text-emerald-400' : 'text-zinc-600'}`}>
            {r.ok ? `+${r.pts}` : '0'}
          </span>
        </div>
      ))}
    </div>
  )
}
