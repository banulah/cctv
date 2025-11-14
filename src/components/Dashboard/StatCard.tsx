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

export const StatCard = ({ title, value, subtitle, icon, trend, color = 'blue' }: StatCardProps) => {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/20',
      iconBg: 'bg-blue-50',
      iconText: 'text-blue-600',
      ring: 'ring-blue-500/10'
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      shadow: 'shadow-green-500/20',
      iconBg: 'bg-green-50',
      iconText: 'text-green-600',
      ring: 'ring-green-500/10'
    },
    purple: {
      gradient: 'from-purple-500 to-purple-600',
      shadow: 'shadow-purple-500/20',
      iconBg: 'bg-purple-50',
      iconText: 'text-purple-600',
      ring: 'ring-purple-500/10'
    },
    orange: {
      gradient: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/20',
      iconBg: 'bg-orange-50',
      iconText: 'text-orange-600',
      ring: 'ring-orange-500/10'
    },
    red: {
      gradient: 'from-red-500 to-red-600',
      shadow: 'shadow-red-500/20',
      iconBg: 'bg-red-50',
      iconText: 'text-red-600',
      ring: 'ring-red-500/10'
    },
    indigo: {
      gradient: 'from-indigo-500 to-indigo-600',
      shadow: 'shadow-indigo-500/20',
      iconBg: 'bg-indigo-50',
      iconText: 'text-indigo-600',
      ring: 'ring-indigo-500/10'
    },
    cyan: {
      gradient: 'from-cyan-500 to-cyan-600',
      shadow: 'shadow-cyan-500/20',
      iconBg: 'bg-cyan-50',
      iconText: 'text-cyan-600',
      ring: 'ring-cyan-500/10'
    }
  }

  const colors = colorClasses[color]

  return (
    <div className={`
      relative bg-white rounded-2xl shadow-lg ${colors.shadow}
      border border-gray-100 overflow-hidden
      hover:shadow-xl hover:scale-105
      transition-all duration-300 ease-out
      group
    `}>
      {/* Gradient accent bar at top */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${colors.gradient}`} />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {title}
            </p>
            <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-1 tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-600 font-medium">{subtitle}</p>
            )}
            {trend && (
              <div className={`
                flex items-center mt-3 text-sm font-semibold
                ${trend.isPositive ? 'text-green-600' : 'text-red-600'}
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
                <span className="text-gray-500 ml-1 font-normal">vs last hour</span>
              </div>
            )}
          </div>

          {/* Icon with gradient background */}
          <div className={`
            relative p-4 rounded-xl ${colors.iconBg}
            ring-4 ${colors.ring}
            group-hover:scale-110 transition-transform duration-300
          `}>
            <div className={colors.iconText}>
              {icon}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle hover effect overlay */}
      <div className={`
        absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0
        group-hover:opacity-5 transition-opacity duration-300 pointer-events-none
      `} />
    </div>
  )
}
