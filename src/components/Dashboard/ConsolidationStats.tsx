

interface ConsolidationStatsProps {
    totalObservations: number
    uniquePersons: number
    lastConsolidated?: string
}

export default function ConsolidationStats({
    totalObservations,
    uniquePersons,
    lastConsolidated
}: ConsolidationStatsProps) {
    const reductionRate = totalObservations > 0
        ? ((1 - uniquePersons / totalObservations) * 100).toFixed(0)
        : '0'

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <span>🤖</span> Automatic Consolidation Active
                </h3>
                {lastConsolidated && (
                    <span className="text-xs text-blue-600">
                        Last consolidated: {new Date(lastConsolidated).toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/50 rounded p-2">
                    <div className="text-blue-600 font-medium text-xs uppercase tracking-wide">Total Detections</div>
                    <div className="text-2xl font-bold text-blue-900">{totalObservations}</div>
                    <p className="text-xs text-blue-500 mt-1">Raw observations</p>
                </div>

                <div className="bg-white/50 rounded p-2">
                    <div className="text-blue-600 font-medium text-xs uppercase tracking-wide">Unique Persons</div>
                    <div className="text-2xl font-bold text-blue-900">{uniquePersons}</div>
                    <p className="text-xs text-blue-500 mt-1">After merging</p>
                </div>

                <div className="bg-white/50 rounded p-2">
                    <div className="text-blue-600 font-medium text-xs uppercase tracking-wide">Duplicate Reduction</div>
                    <div className="text-2xl font-bold text-green-700">{reductionRate}%</div>
                    <p className="text-xs text-green-600 mt-1">Efficiency gain</p>
                </div>
            </div>
        </div>
    )
}
