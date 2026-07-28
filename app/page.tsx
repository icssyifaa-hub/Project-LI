import Image from 'next/image'
import Link from 'next/link'
import { CalendarClock, CircleAlert, Clock3, LogIn, Mail, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'

const maintenanceItems = [
  {
    icon: Clock3,
    label: 'Estimated Window',
    value: 'Temporary maintenance',
  },
  {
    icon: ShieldCheck,
    label: 'System Access',
    value: 'Limited while updates are applied',
  },
  {
    icon: CalendarClock,
    label: 'Calendar Data',
    value: 'Existing records remain protected',
  },
]

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="flex min-h-screen items-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800">
                <Image
                  src="/logoics.png"
                  alt="ICS Logo"
                  width={48}
                  height={48}
                  className="h-full w-full object-contain p-1"
                  priority
                />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  ICS Consulting Sdn. Bhd.
                </p>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Calendar Management System
                </p>
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-200">
                <CircleAlert className="h-4 w-4" />
                System Maintenance
              </div>

              <h1 className="text-4xl font-extrabold leading-tight tracking-normal text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
                We are improving the system for a smoother workflow.
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Maintenance Status
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    CMS service update in progress
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {maintenanceItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                Thank you for your patience while we update the system.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
