import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'cyan'
}

export const StatCard = ({ title, value, subtitle, icon, trend }: StatCardProps) => {
  return (
    <div className="
      relative bg-white/80 backdrop-blur-sm
      rounded-xl shadow-sm
      border border-slate-200/80
      overflow-hidden
      hover:shadow-md hover:border-slate-300
      transition-all duration-300
      group
    ">
      {/* Subtle top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-slate-400 via-slate-600 to-slate-400" />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 truncate">
              {title}
            </p>
            <p className="text-3xl font-bold text-slate-900 mb-1.5 tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-slate-600 font-medium">{subtitle}</p>
            )}
            {trend && (
              <div className={`
                flex items-center mt-3 text-sm font-semibold
                ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}
              `}>
                <svg
                  className={`w-4 h-4 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>{Math.abs(trend.value)}%</span>
                <span className="text-slate-500 ml-1 font-normal">vs last hour</span>
              </div>
            )}
          </div>

          {/* Icon with professional styling */}
          <div className="
            relative p-3.5 rounded-lg
            bg-gradient-to-br from-slate-50 to-slate-100/50
            border border-slate-200/50
            group-hover:scale-105 group-hover:shadow-sm
            transition-all duration-300
          ">
            <div className="text-slate-700">
              {icon}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle hover effect */}
      <div className="
        absolute inset-0 bg-gradient-to-br from-slate-500/0 to-slate-600/0
        group-hover:from-slate-500/[0.02] group-hover:to-slate-600/[0.02]
        transition-all duration-300 pointer-events-none
      " />
    </div>
  )
}
