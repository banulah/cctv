type TabType = 'provisional' | 'known'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  provisionalCount?: number
  knownCount?: number
  reviewCount?: number // Keep for backwards compatibility, but not used
}

export default function TabNavigation({
  activeTab,
  onTabChange,
  provisionalCount = 0,
  knownCount = 0
}: TabNavigationProps) {
  const tabs = [
    { id: 'provisional' as TabType, name: 'Unknown Persons', count: provisionalCount },
    { id: 'known' as TabType, name: 'Known Identities', count: knownCount }
  ]

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === tab.id
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.name}
            {tab.count > 0 && (
              <span className={`
                ml-2 py-0.5 px-2 rounded-full text-xs font-medium
                ${activeTab === tab.id
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
