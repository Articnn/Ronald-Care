import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Clock3, ListTodo, UserCheck2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useAppState } from '../../context/AppContext'
import { createStaffTask, getAdminUsers, getStaffTasks, type BackendUser, type StaffTaskRecord } from '../../lib/api'

const priorityOptions = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
] as const

function formatDate(value?: string | null) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function cleanLatinText(value: string) {
  return value
    .replace(/\u00c3\u0081/g, 'Á')
    .replace(/\u00c3\u0089/g, 'É')
    .replace(/\u00c3\u008d/g, 'Í')
    .replace(/\u00c3\u0093/g, 'Ó')
    .replace(/\u00c3\u009a/g, 'Ú')
    .replace(/\u00c3\u0091/g, 'Ñ')
    .replace(/\u00c3\u00a1/g, 'á')
    .replace(/\u00c3\u00a9/g, 'é')
    .replace(/\u00c3\u00ad/g, 'í')
    .replace(/\u00c3\u00b3/g, 'ó')
    .replace(/\u00c3\u00ba/g, 'ú')
    .replace(/\u00c3\u00b1/g, 'ñ')
    .replace(/\u00e2\u0080\u0093/g, '–')
    .replace(/\u00e2\u0080\u00a2/g, '•')
    .replace(/\u00c2/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function TaskManagementPage() {
  const { authToken, currentUser, site, availableSites, pushToast } = useAppState()
  const [tasks, setTasks] = useState<StaffTaskRecord[]>([])
  const [assignableUsers, setAssignableUsers] = useState<BackendUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedUserId: '',
    dueDate: '',
    priority: 'media' as 'baja' | 'media' | 'alta',
  })

  const selectedSiteId =
    currentUser?.role === 'superadmin'
      ? site === 'Todas las sedes'
        ? null
        : availableSites.findIndex((item) => item === site) + 1 || null
      : currentUser?.siteId || null

  const scopedSiteId = currentUser?.role === 'admin' ? currentUser.siteId : selectedSiteId

  const eligibleUsers = useMemo(() => {
    return assignableUsers.filter((user) => {
      const roleCode = String(user.RoleCode || '').toLowerCase()
      return ['staff', 'admin'].includes(roleCode) && user.IsActive && Number(user.SiteId) === Number(scopedSiteId)
    })
  }, [assignableUsers, scopedSiteId])

  const groupedTasks = useMemo(
    () => ({
      pendiente: tasks.filter((task) => task.Status === 'pendiente'),
      en_proceso: tasks.filter((task) => task.Status === 'en_proceso'),
      completada: tasks.filter((task) => task.Status === 'completada'),
    }),
    [tasks],
  )

  useEffect(() => {
    if (!authToken) return
    if (!scopedSiteId) {
      setAssignableUsers([])
      setIsLoadingUsers(false)
      return
    }

    let active = true
    setIsLoadingUsers(true)

    void getAdminUsers(authToken, scopedSiteId)
      .then((usersList) => {
        if (!active) return
        const filteredUsers = usersList.filter((user) => {
          const roleCode = String(user.RoleCode || '').toLowerCase()
          return ['staff', 'admin'].includes(roleCode) && user.IsActive && Number(user.SiteId) === Number(scopedSiteId)
        })
        console.log('Usuarios cargados para asignar:', filteredUsers)
        setAssignableUsers(filteredUsers)
      })
      .catch((usersError) => {
        if (!active) return
        setAssignableUsers([])
        setError(usersError instanceof Error ? usersError.message : 'No pudimos cargar el equipo de la sede')
      })
      .finally(() => {
        if (!active) return
        setIsLoadingUsers(false)
      })

    return () => {
      active = false
    }
  }, [authToken, scopedSiteId])

  useEffect(() => {
    if (!authToken) return
    let active = true
    setIsLoading(true)
    setError(null)

    void getStaffTasks(authToken, { siteId: scopedSiteId })
      .then((data) => {
        if (!active) return
        setTasks(data)
      })
      .catch((taskError) => {
        if (!active) return
        setError(taskError instanceof Error ? taskError.message : 'No pudimos cargar las tareas')
      })
      .finally(() => {
        if (!active) return
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [authToken, scopedSiteId])

  useEffect(() => {
    if (!eligibleUsers.length) {
      setForm((current) => ({ ...current, assignedUserId: '' }))
      return
    }
    if (!eligibleUsers.some((item) => String(item.UserId) === form.assignedUserId)) {
      setForm((current) => ({ ...current, assignedUserId: String(eligibleUsers[0].UserId) }))
    }
  }, [eligibleUsers, form.assignedUserId])

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!authToken) return

    if (!scopedSiteId) {
      pushToast({ type: 'info', message: 'Selecciona una sede específica para asignar tareas.' })
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const created = await createStaffTask(authToken, {
        siteId: scopedSiteId,
        title: cleanLatinText(form.title.trim()),
        description: cleanLatinText(form.description.trim()),
        assignedUserId: Number(form.assignedUserId),
        dueDate: form.dueDate,
        priority: form.priority,
      })
      setTasks((current) => [created, ...current])
      setForm({
        title: '',
        description: '',
        assignedUserId: eligibleUsers[0] ? String(eligibleUsers[0].UserId) : '',
        dueDate: '',
        priority: 'media',
      })
      pushToast({ type: 'success', message: 'Tarea creada y asignada correctamente' })
    } catch (taskError) {
      const message = taskError instanceof Error ? taskError.message : 'No pudimos crear la tarea'
      setError(message)
      pushToast({ type: 'error', message })
    } finally {
      setIsSaving(false)
    }
  }

  const disableCreation = currentUser?.role === 'superadmin' && !scopedSiteId

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Gestión de Tareas"
        subtitle="Crea tareas operativas con muro por sede: Dirección Ejecutiva trabaja sobre la sede activa y Gerencia de Sede solo sobre su operación local."
      />

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-500">Nueva tarea</p>
            <h2 className="text-2xl font-bold text-warm-900">Asignación operativa</h2>
            <p className="text-sm text-warm-600">
              {currentUser?.role === 'admin'
                ? 'Esta vista ya está bloqueada a tu sede y solo te deja asignar al equipo local.'
                : disableCreation
                  ? 'Selecciona una sede específica en el header para habilitar la creación.'
                  : 'El equipo disponible se filtra automáticamente por la sede activa.'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleCreateTask}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-warm-800">Título</label>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-sm text-warm-900 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
                placeholder="Ej. Confirmar kit de llegada"
                maxLength={160}
                disabled={disableCreation}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-warm-800">Descripción</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-[120px] w-full rounded-2xl border border-warm-200 px-4 py-3 text-sm text-warm-900 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
                placeholder="Describe qué debe hacer el equipo y el resultado esperado."
                disabled={disableCreation}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-warm-800">Asignar a</label>
                <select
                  value={form.assignedUserId}
                  onChange={(event) => setForm((current) => ({ ...current, assignedUserId: event.target.value }))}
                  className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-sm text-warm-900 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
                  disabled={disableCreation || isLoadingUsers || eligibleUsers.length === 0}
                >
                  {isLoadingUsers ? <option value="">Cargando equipo de la sede...</option> : null}
                  {!isLoadingUsers && eligibleUsers.length === 0 ? <option value="">Sin equipo disponible en esta sede</option> : null}
                  {eligibleUsers.map((user) => (
                    <option key={user.UserId} value={user.UserId}>
                      {cleanLatinText(user.FullName)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-warm-800">Fecha límite</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                  className="w-full rounded-2xl border border-warm-200 px-4 py-3 text-sm text-warm-900 focus:border-warm-400 focus:outline-none focus:ring-4 focus:ring-warm-100"
                  disabled={disableCreation}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-warm-800">Prioridad</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, priority: option.value }))}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                      form.priority === option.value
                        ? 'border-warm-700 bg-warm-700 text-white'
                        : 'border-warm-200 bg-white text-warm-700 hover:bg-warm-50'
                    }`}
                    disabled={disableCreation}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{cleanLatinText(error)}</div> : null}

            <Button type="submit" fullWidth isLoading={isSaving} disabled={disableCreation || isLoadingUsers || eligibleUsers.length === 0}>
              Crear tarea
            </Button>
          </form>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-50 text-warm-700"><ListTodo className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold text-warm-900">Pendientes</h3>
                <p className="text-sm text-warm-600">{groupedTasks.pendiente.length} activas por iniciar</p>
              </div>
            </div>
            <div className="space-y-3">
              {groupedTasks.pendiente.map((task) => (
                <TaskCard key={task.StaffTaskId} task={task} />
              ))}
              {!isLoading && groupedTasks.pendiente.length === 0 ? <EmptyColumn label="No hay tareas pendientes" /> : null}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><Clock3 className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold text-warm-900">En curso</h3>
                <p className="text-sm text-warm-600">{groupedTasks.en_proceso.length} tareas avanzando</p>
              </div>
            </div>
            <div className="space-y-3">
              {groupedTasks.en_proceso.map((task) => (
                <TaskCard key={task.StaffTaskId} task={task} />
              ))}
              {!isLoading && groupedTasks.en_proceso.length === 0 ? <EmptyColumn label="No hay tareas en curso" /> : null}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold text-warm-900">Finalizadas</h3>
                <p className="text-sm text-warm-600">{groupedTasks.completada.length} tareas cerradas</p>
              </div>
            </div>
            <div className="space-y-3">
              {groupedTasks.completada.map((task) => (
                <TaskCard key={task.StaffTaskId} task={task} />
              ))}
              {!isLoading && groupedTasks.completada.length === 0 ? <EmptyColumn label="Aún no hay tareas finalizadas" /> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: StaffTaskRecord }) {
  return (
    <div className="min-w-0 rounded-2xl border border-warm-100 bg-warm-50/70 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-warm-700 shadow-sm">
          <UserCheck2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-warm-900" title={cleanLatinText(task.Title)}>
            {cleanLatinText(task.Title)}
          </p>
          <p className="truncate text-sm text-warm-700" title={cleanLatinText(task.AssignedUserName || 'Sin asignación')}>
            {cleanLatinText(task.AssignedUserName || 'Sin asignación')}
          </p>
          <p className="mt-2 break-words text-sm text-warm-600">
            {cleanLatinText(task.Instructions)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-warm-500">
            <span>Vence {formatDate(task.DueDate || task.CreatedAt)}</span>
            <span>·</span>
            <span>{cleanLatinText(task.Priority)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyColumn({ label }: { label: string }) {
  return <div className="rounded-2xl bg-warm-50 px-4 py-5 text-sm text-warm-600">{label}</div>
}
