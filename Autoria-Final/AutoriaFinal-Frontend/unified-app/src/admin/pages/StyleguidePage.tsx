import { useState } from 'react'
import { 
  Palette, 
  Type, 
  Layout, 
  MousePointer, 
  Info
} from 'lucide-react'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { TagChip } from '../components/common/TagChip'
import { Avatar } from '../components/common/Avatar'
import { KPICard } from '../components/ui/KPICard'
import { TrendingUp, Users, Car, Gavel } from 'lucide-react'

export function StyleguidePage() {
  const [activeTab, setActiveTab] = useState('colors')

  const tabs = [
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'components', label: 'Components', icon: Layout },
    { id: 'interactions', label: 'Interactions', icon: MousePointer }
  ]

  const colorPalette = [
    { name: 'Midnight Base', value: '#0B1221', usage: 'Primary backgrounds, text' },
    { name: 'Electric Cobalt', value: '#1767FF', usage: 'Primary actions, accents' },
    { name: 'Royal Indigo', value: '#2563EB', usage: 'Secondary actions' },
    { name: 'Warm Gold', value: '#E6B800', usage: 'Premium accents, highlights' },
    { name: 'Soft Lilac', value: '#F3F0FF', usage: 'Muted backgrounds' },
    { name: 'Success', value: '#22C55E', usage: 'Success states' },
    { name: 'Danger', value: '#EF4444', usage: 'Error states' },
    { name: 'Warning', value: '#F59E0B', usage: 'Warning states' },
    { name: 'Info', value: '#06B6D4', usage: 'Information states' }
  ]

  const typographyExamples = [
    { level: 'H1', class: 'text-h1', example: 'Dashboard Overview' },
    { level: 'H2', class: 'text-h2', example: 'Recent Activity' },
    { level: 'Body', class: 'text-body', example: 'This is regular body text for content areas.' },
    { level: 'Body Small', class: 'text-body-sm', example: 'This is smaller text for captions and labels.' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-midnight-900 mb-2">Style Guide</h1>
        <p className="text-midnight-600">Design system components and guidelines for Əlimyandi.az Admin Panel</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-midnight-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-electric-cobalt text-electric-cobalt'
                  : 'border-transparent text-midnight-600 hover:text-midnight-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* Colors */}
        {activeTab === 'colors' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-h2 text-midnight-900 mb-4">Color Palette</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {colorPalette.map((color) => (
                  <div key={color.name} className="card">
                    <div 
                      className="w-full h-20 rounded-xl mb-3 border border-midnight-200"
                      style={{ backgroundColor: color.value }}
                    />
                    <h3 className="font-medium text-midnight-900 mb-1">{color.name}</h3>
                    <p className="text-sm text-midnight-600 mb-2 font-mono">{color.value}</p>
                    <p className="text-xs text-midnight-500">{color.usage}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-midnight-900 mb-4">Status Colors</h3>
              <div className="flex flex-wrap gap-4">
                <Badge variant="success">Success</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="neutral">Neutral</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Typography */}
        {activeTab === 'typography' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-h2 text-midnight-900 mb-4">Typography Scale</h2>
              <div className="space-y-6">
                {typographyExamples.map((example) => (
                  <div key={example.level} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-midnight-600">{example.level}</span>
                      <span className="text-xs font-mono text-midnight-500">{example.class}</span>
                    </div>
                    <div className={example.class}>
                      {example.example}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-midnight-900 mb-4">Font Families</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <h4 className="font-medium text-midnight-900 mb-2">Headings - Poppins</h4>
                  <p className="text-sm text-midnight-600 mb-2">Used for all headings and titles</p>
                  <div className="font-heading text-lg">Əlimyandi.az Admin Panel</div>
                </div>
                <div className="card">
                  <h4 className="font-medium text-midnight-900 mb-2">Body - Inter</h4>
                  <p className="text-sm text-midnight-600 mb-2">Used for all body text and UI elements</p>
                  <div className="font-body text-lg">The quick brown fox jumps over the lazy dog</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Components */}
        {activeTab === 'components' && (
          <div className="space-y-8">
            {/* Buttons */}
            <div>
              <h2 className="text-h2 text-midnight-900 mb-4">Buttons</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-midnight-900 mb-3">Button Variants</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="danger">Danger</Button>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-midnight-900 mb-3">Button Sizes</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary" size="sm">Small</Button>
                    <Button variant="primary" size="md">Medium</Button>
                    <Button variant="primary" size="lg">Large</Button>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-midnight-900 mb-3">Button States</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary">Normal</Button>
                    <Button variant="primary" loading>Loading</Button>
                    <Button variant="primary" disabled>Disabled</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div>
              <h2 className="text-h2 text-midnight-900 mb-4">Badges</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-midnight-900 mb-3">Badge Variants</h3>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="success">Success</Badge>
                    <Badge variant="danger">Danger</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="info">Info</Badge>
                    <Badge variant="neutral">Neutral</Badge>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-midnight-900 mb-3">Badge Sizes</h3>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="success" size="sm">Small</Badge>
                    <Badge variant="success" size="md">Medium</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h2 className="text-h2 text-midnight-900 mb-4">Tag Chips</h2>
              <div className="flex flex-wrap gap-3">
                <TagChip label="Toyota" />
                <TagChip label="BMW" />
                <TagChip label="Mercedes" variant="primary" />
                <TagChip label="Audi" variant="secondary" />
                <TagChip label="Removable" onRemove={() => {}} />
              </div>
            </div>

            {/* Avatars */}
            <div>
              <h2 className="text-h2 text-midnight-900 mb-4">Avatars</h2>
              <div className="flex items-center space-x-4">
                <Avatar fallback="AU" size="sm" />
                <Avatar fallback="AU" size="md" />
                <Avatar fallback="AU" size="lg" />
                <Avatar fallback="AU" size="xl" />
              </div>
            </div>

            {/* KPI Cards */}
            <div>
              <h2 className="text-h2 text-midnight-900 mb-4">KPI Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title="Total Revenue"
                  value="$2,847,392"
                  subtitle="This month"
                  icon={TrendingUp}
                  trend={{ value: 12.5, isPositive: true, label: "vs last month" }}
                />
                <KPICard
                  title="Active Users"
                  value="8,429"
                  subtitle="Currently online"
                  icon={Users}
                  trend={{ value: 5.7, isPositive: true, label: "vs last month" }}
                />
                <KPICard
                  title="Vehicles"
                  value="1,247"
                  subtitle="In inventory"
                  icon={Car}
                  trend={{ value: 3.1, isPositive: true, label: "vs last month" }}
                />
                <KPICard
                  title="Auctions"
                  value="24"
                  subtitle="Currently running"
                  icon={Gavel}
                  trend={{ value: 8.2, isPositive: true, label: "vs last week" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Interactions */}
        {activeTab === 'interactions' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-h2 text-midnight-900 mb-4">Interactive States</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-midnight-900 mb-3">Hover Effects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card-premium group cursor-pointer">
                      <h4 className="font-medium text-midnight-900 group-hover:text-electric-cobalt transition-colors duration-200">
                        Card Hover Effect
                      </h4>
                      <p className="text-sm text-midnight-600 mt-2">
                        Hover over this card to see the elevation and color transition effects.
                      </p>
                    </div>
                    <div className="card group cursor-pointer">
                      <h4 className="font-medium text-midnight-900 group-hover:text-electric-cobalt transition-colors duration-200">
                        Standard Card
                      </h4>
                      <p className="text-sm text-midnight-600 mt-2">
                        This card has a subtle hover effect with color transition.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-midnight-900 mb-3">Focus States</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Focus on this input to see the focus ring"
                      className="input"
                    />
                    <Button variant="primary">Focus me</Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-midnight-900 mb-3">Loading States</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary" loading>Loading Button</Button>
                    <div className="card">
                      <div className="animate-pulse">
                        <div className="h-4 bg-midnight-200 rounded mb-2"></div>
                        <div className="h-4 bg-midnight-200 rounded mb-2 w-3/4"></div>
                        <div className="h-4 bg-midnight-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-midnight-900 mb-3">Empty States</h3>
                  <div className="card text-center py-12">
                    <div className="w-16 h-16 bg-midnight-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info className="w-8 h-8 text-midnight-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-midnight-900 mb-2">No Data Available</h4>
                    <p className="text-midnight-600 mb-6 max-w-md mx-auto">
                      This is an example of an empty state with an icon, title, and description.
                    </p>
                    <Button variant="primary" disabled>Add New Item</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
