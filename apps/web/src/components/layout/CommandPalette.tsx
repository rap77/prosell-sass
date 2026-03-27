'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import Image from 'next/image'
import { Car, Upload, Plus, Search } from 'lucide-react'
import type { Vehicle } from '@/components/datagrid/DataGrid'

interface CommandPaletteProps {
  vehicles?: Vehicle[]
}

export function CommandPalette({ vehicles = [] }: CommandPaletteProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        setOpen(open => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Filter vehicles by search (React 19 Compiler handles optimization)
  const filteredVehicles = !search
    ? vehicles.slice(0, 5) // Show 5 recent when empty
    : vehicles.filter(v => {
        const searchLower = search.toLowerCase()
        return (
          v.title.toLowerCase().includes(searchLower) ||
          v.id.toLowerCase().includes(searchLower) ||
          v.vin?.toLowerCase().includes(searchLower)
        )
      }).slice(0, 10) // Show 10 results max

  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Content className="bg-background border shadow-lg rounded-lg max-w-md mx-auto mt-[20vh]">
        <Command.Input
          placeholder="Search vehicles by VIN, make, model..."
          value={search}
          onValueChange={setSearch}
          className="px-4 py-3 border-b focus:outline-none"
        />

        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          {filteredVehicles.length === 0 ? (
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No vehicles found.
            </Command.Empty>
          ) : (
            <>
              <Command.Group heading="Vehicles" className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                {filteredVehicles.map(vehicle => (
                  <Command.Item
                    key={vehicle.id}
                    onSelect={() => {
                      router.push(`/catalog/${vehicle.id}`)
                      setOpen(false)
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-accent aria-selected:bg-accent"
                  >
                    {vehicle.photo_url ? (
                      <Image
                        src={vehicle.photo_url}
                        alt={vehicle.title}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Car className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{vehicle.title}</div>
                      <div className="text-xs text-muted-foreground">
                        ${vehicle.price.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">
                      {vehicle.status}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>

              {/* Actions section */}
              <Command.Group
                heading="Actions"
                className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2"
              >
                <Command.Item
                  onSelect={() => {
                    router.push('/catalog/new?publish=true')
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-accent aria-selected:bg-accent"
                >
                  <Upload className="w-4 h-4" />
                  <span>Publish vehicle...</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => {
                    router.push('/catalog/new')
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-accent aria-selected:bg-accent"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create new vehicle</span>
                </Command.Item>
              </Command.Group>
            </>
          )}
        </Command.List>

        {/* Footer with keyboard hints */}
        <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">↵</kbd> select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">esc</kbd> close
          </span>
        </div>
      </Command.Content>
    </Command.Dialog>
  )
}
