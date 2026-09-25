import { useState, useEffect, JSX, useMemo, useCallback } from 'react'
import { api, BudgetCategory, Expense } from '../services'
import { useUser } from './UserContext'
import { useModal } from './ModalContext'
import { Dropdown } from './ui/Dropdown'

export function Budgetizer(): JSX.Element {
  const { t, userRole } = useUser()
  const { showModal } = useModal()

  const [mode, setMode] = useState<'expense' | 'income'>('expense')
  const [filter, setFilter] = useState<'month' | '3months' | '6months' | 'year'>('month')
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [newCat, setNewCat] = useState('')
  const [amount, setAmount] = useState('')
  const [desc, setDescription] = useState('')
  const [catId, setCatId] = useState<string>('')

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const [cats, allExps] = await Promise.all([api.getCategories(mode), api.getAllExpenses()])
      setCategories(cats)
      setAllExpenses(allExps)
    } catch (error: unknown) {
      console.error('Failed to load budget data:', error)
      const errorMessage = error instanceof Error ? error.message : t.budget.modalErrorLoad
      showModal({
        title: t.login.modalErrorTitle,
        message: errorMessage,
        type: 'alert'
      })
    }
  }, [mode, t.budget.modalErrorLoad, t.login.modalErrorTitle, showModal])

  useEffect(() => {
    let mounted = true

    const fetchInitialData = async (): Promise<void> => {
      await Promise.resolve()
      if (mounted) {
        await loadData()
      }
    }
    fetchInitialData()
    return () => {
      mounted = false
    }
  }, [loadData])

  const handleAddCategory = async (): Promise<void> => {
    if (!newCat.trim()) {
      showModal({ title: t.login.modalOops, message: t.budget.categoryNameRequired, type: 'alert' })
      return
    }
    try {
      await api.postCategory(newCat.trim(), mode)
      setNewCat('')
      void loadData()
      showModal({ title: t.login.savedTitle, message: t.budget.categoryAdded, type: 'alert' })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t.budget.modalError
      if (errorMessage.includes('already exists')) {
        showModal({ title: t.login.modalOops, message: t.budget.categoryExists, type: 'alert' })
      } else {
        showModal({ title: t.login.modalErrorTitle, message: errorMessage, type: 'alert' })
      }
    }
  }

  const handleAddExpense = async (): Promise<void> => {
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showModal({ title: t.login.modalOops, message: t.budget.invalidAmount, type: 'alert' })
      return
    }
    if (!catId) {
      showModal({ title: t.login.modalOops, message: t.budget.categoryRequired, type: 'alert' })
      return
    }
    if (!desc.trim()) {
      showModal({ title: t.login.modalOops, message: t.budget.descriptionRequired, type: 'alert' })
      return
    }

    try {
      await api.postExpense({
        amount: parsedAmount,
        description: desc.trim(),
        category_id: parseInt(catId),
        date: new Date().toISOString().split('T')[0],
        type: mode
      })
      showModal({ title: t.login.savedTitle, message: t.budget.modalSaved, type: 'alert' })
      setAmount('')
      setDescription('')
      setCatId('')
      void loadData()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t.budget.modalError
      showModal({ title: t.login.modalErrorTitle, message: errorMessage, type: 'alert' })
    }
  }

  const currentPeriodExpenses = useMemo(() => {
    const now = new Date()
    const start = new Date()
    start.setHours(0, 0, 0, 0)

    if (filter === 'month') {
      start.setDate(1)
    } else if (filter === '3months') {
      start.setMonth(now.getMonth() - 3)
    } else if (filter === '6months') {
      start.setMonth(now.getMonth() - 6)
    } else if (filter === 'year') {
      start.setFullYear(now.getFullYear(), 0, 1)
    }

    return allExpenses.filter((e) => {
      const dateStr =
        typeof e.date === 'string'
          ? e.date.split('T')[0]
          : new Date(e.date).toISOString().split('T')[0]
      return new Date(dateStr + 'T00:00:00') >= start
    })
  }, [allExpenses, filter])

  const filteredExpenses = useMemo(() => {
    return currentPeriodExpenses.filter((e) => e.type === mode)
  }, [currentPeriodExpenses, mode])

  const totalIncomePeriod = useMemo(() => {
    return currentPeriodExpenses
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + Number(e.amount), 0)
  }, [currentPeriodExpenses])

  const totalExpensePeriod = useMemo(() => {
    return currentPeriodExpenses
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + Number(e.amount), 0)
  }, [currentPeriodExpenses])

  const pieChartColors = [
    '#FF6B6B',
    '#4ECDC4',
    '#4F8A8B',
    '#C70039',
    '#FFC300',
    '#DAF7A6',
    '#FF5733',
    '#900C3F',
    '#581845',
    '#336B87'
  ]

  const pieChartColorClasses = [
    'text-[#FF6B6B]',
    'text-[#4ECDC4]',
    'text-[#4F8A8B]',
    'text-[#C70039]',
    'text-[#FFC300]',
    'text-[#DAF7A6]',
    'text-[#FF5733]',
    'text-[#900C3F]',
    'text-[#581845]',
    'text-[#336B87]'
  ]

  const getCategoryColorClass = (id: number | null): string => {
    if (id === null) return 'text-profond'
    const index = categories.findIndex((c) => c.id === id)
    if (index === -1) return 'text-profond'
    return pieChartColorClasses[index % pieChartColorClasses.length]
  }

  const currentCategories = useMemo(
    () => categories.filter((c) => c.type === mode),
    [categories, mode]
  )

  const getCategoryColor = (id: number | null): string => {
    if (id === null) return 'var(--color-profond)'
    const index = categories.findIndex((c) => c.id === id)
    if (index === -1) return 'var(--color-profond)'
    return pieChartColors[index % pieChartColors.length]
  }

  const totalPerCat = useMemo(() => {
    return currentCategories
      .map((c) => ({
        id: c.id,
        name: c.name,
        total: filteredExpenses
          .filter((e) => Number(e.category_id) === Number(c.id))
          .reduce((sum, e) => sum + Number(e.amount), 0)
      }))
      .filter((c) => c.total > 0)
  }, [currentCategories, filteredExpenses])

  const grandTotal = totalPerCat.reduce((sum, c) => sum + c.total, 0)

  const pieChartData = useMemo(() => {
    return totalPerCat.map((c, index, array) => {
      const percentage = grandTotal > 0 ? (c.total / grandTotal) * 100 : 0
      const previousSum = array.slice(0, index).reduce((sum, item) => sum + item.total, 0)
      const offsetPercentage = grandTotal > 0 ? (previousSum / grandTotal) * 100 : 0

      return {
        ...c,
        strokeDasharray: `${percentage} 100`,
        strokeDashoffset: -offsetPercentage
      }
    })
  }, [totalPerCat, grandTotal])

  return (
    <div className="grid grid-cols-[2fr_1fr] grid-rows-[1fr] gap-[2.5vw] w-[95%] h-full min-h-full pb-[2vh] box-border max-[1350px]:flex max-[1350px]:flex-col max-[1350px]:items-stretch max-[1350px]:grid-cols-1 max-[1350px]:grid-rows-[auto] max-[1350px]:h-auto max-[1350px]:min-h-0 max-[1350px]:w-[95%] max-[1350px]:shrink-0">
      <div className="bg-card rounded-card shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-(--card-border) transition-all duration-300 flex min-h-0 max-h-full min-w-0 flex-col p-[3vh_3vw] max-[1350px]:max-h-none">
        <div className="mb-[2vh] flex shrink-0 items-center justify-between max-[1350px]:flex-col max-[1350px]:items-start max-[1350px]:gap-3.75">
          <h2 className="m-0 shrink-0">{t.budget.title}</h2>
          <div className="flex gap-2.5">
            <button
              className={`border-0 rounded-xl px-4.5 py-2.5 font-semibold text-lilas-doux cursor-pointer bg-card shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 ${
                mode === 'expense'
                  ? 'bg-lilas text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-96 hover:brightness-115 hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                  : 'hover:bg-rose hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
              }`}
              onClick={() => {
                setMode('expense')
                setCatId('')
              }}
            >
              {t.budget.outcome}
            </button>
            <button
              className={`border-0 rounded-xl px-4.5 py-2.5 font-semibold text-lilas-doux cursor-pointer bg-card shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 ${
                mode === 'income'
                  ? 'bg-lilas text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-96 hover:brightness-115 hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                  : 'hover:bg-rose hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
              }`}
              onClick={() => {
                setMode('income')
                setCatId('')
              }}
            >
              {t.budget.income}
            </button>
          </div>
        </div>

        <div className="flex shrink-0 gap-[2vw] max-[1350px]:flex-col max-[1350px]:gap-6.25">
          <div className="flex flex-1 flex-col gap-2.5">
            <small className="mb-1.25 font-semibold text-profond">
              {mode === 'expense' ? t.budget.addExpense : t.budget.addIncome}
            </small>
            <input
              className="w-full bg-(--field-bg) border-0 px-3.75 py-3 rounded-xl text-profond shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-hidden box-border appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              type="number"
              placeholder={t.budget.amount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              className="w-full bg-(--field-bg) border-0 px-3.75 py-3 rounded-xl text-profond shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-hidden box-border"
              placeholder={t.budget.description}
              value={desc}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Dropdown
              options={[
                { value: '', label: `-- ${t.budget.category} --` },
                ...currentCategories.map((c) => ({ value: c.id.toString(), label: c.name }))
              ]}
              value={catId}
              onChange={setCatId}
            />

            <button
              className="bg-lilas text-white border-0 px-6.25 py-3 rounded-[15px] font-bold cursor-pointer transition-all duration-200 enabled:hover:brightness-115 enabled:hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAddExpense}
            >
              {t.budget.save}
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-2.5">
            <small className="mb-1.25 font-semibold text-profond">
              {mode === 'expense' ? t.budget.addCategory : t.budget.addIncomeCategory}
            </small>
            <div className="flex gap-2.5">
              <input
                className="w-full bg-(--field-bg) border-0 px-3.75 py-3 rounded-xl text-profond shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-hidden box-border flex-1"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder={t.budget.newCategoryPlaceholder}
              />
              <button
                className="border-0 rounded-xl px-4.5 py-2.5 font-semibold cursor-pointer bg-lilas text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-96 hover:brightness-115 hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]"
                onClick={handleAddCategory}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="mt-[3vh] flex min-h-0 flex-1 flex-col border-t border-shadow-d pt-[2vh] max-[1350px]:flex-initial max-[1350px]:max-h-none">
          <div className="mb-3.75 flex shrink-0 flex-col gap-3.75">
            <h3 className="m-0">{t.budget.historyTitle || t.budget.latestExpensesTitle}</h3>
            <div className="flex flex-wrap gap-2.5">
              {(['month', '3months', '6months', 'year'] as const).map((f) => (
                <button
                  key={f}
                  className={`border-0 rounded-xl px-4.5 py-2.5 font-semibold text-lilas-doux cursor-pointer bg-card shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 ${
                    filter === f
                      ? 'bg-lilas text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-96 hover:brightness-115 hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                      : 'hover:bg-rose hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
                  }`}
                  onClick={() => setFilter(f)}
                >
                  {(() => {
                    const isFR = userRole === 'artFR'
                    if (f === 'month') return isFR ? 'Ce mois' : 'This month'
                    else if (f === 'year') return isFR ? 'Année' : 'Year'
                    else if (f === '3months') return isFR ? '3 mois' : '3 months'
                    else if (f === '6months') return isFR ? '6 mois' : '6 months'
                    return f
                  })()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5 max-[1350px]:flex-none max-[1350px]:h-75 max-[1350px]:overflow-y-auto max-[1350px]:min-h-0">
            {filteredExpenses.length === 0 ? (
              <p className="mt-5 text-center italic text-profond opacity-50 max-[1350px]:m-auto">
                {t.budget.noRecentExpenses}
              </p>
            ) : (
              filteredExpenses.map((exp, index) => (
                <div
                  key={exp.id || index}
                  className={`flex shrink-0 items-center justify-between rounded-xl bg-card p-[10px_15px] text-[0.9rem] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] ${getCategoryColorClass(exp.category_id)}`}
                >
                  <span>
                    {exp.description} (
                    {categories.find((c) => c.id === exp.category_id)?.name || 'N/A'})
                  </span>
                  <b>{Number(exp.amount).toFixed(2)} €</b>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col justify-between">
        <div className="bg-card rounded-card shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-(--card-border) transition-all duration-300 flex h-full flex-col items-center p-[3vh_2vw] max-[1350px]:grid max-[1350px]:grid-cols-[1fr_2fr] max-[1350px]:items-stretch max-[1350px]:grid-rows-[auto_1fr_auto] max-[1350px]:gap-5 max-[1350px]:p-6.25 overflow-hidden max-[1350px]:h-auto">
          <h3 className="max-[1350px]:col-span-2 max-[1350px]:mb-0 max-[1350px]:text-center">
            {t.budget.chart}
          </h3>

          {grandTotal > 0 ? (
            <div className="mx-auto size-40 shrink-0 rounded-full bg-card shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] max-[1350px]:col-start-1 max-[1350px]:mx-auto max-[1350px]:row-start-2 max-[1350px]:aspect-square max-[1350px]:h-auto max-[1350px]:max-w-40 max-[1350px]:w-full">
              <svg
                viewBox="0 0 100 100"
                width="100%"
                height="100%"
                className="-rotate-90 rounded-full"
              >
                {/* Cercle de fond pour combler les artefacts au centre et aux jonctions */}
                <circle cx="50" cy="50" r="50" fill={getCategoryColor(pieChartData[0].id)} />
                {pieChartData.map((c) => (
                  <circle
                    key={c.id}
                    cx="50"
                    cy="50"
                    r="25"
                    fill="transparent"
                    stroke={getCategoryColor(c.id)}
                    strokeWidth="50"
                    strokeDasharray={c.strokeDasharray}
                    strokeDashoffset={c.strokeDashoffset}
                    pathLength="100"
                  />
                ))}
              </svg>
            </div>
          ) : (
            <p className="mt-5 text-center italic text-profond opacity-50 max-[1350px]:m-auto">Ø</p>
          )}

          <div className="my-3.75 flex w-full flex-col gap-2.5 rounded-2xl bg-bg p-3.75 shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] max-[1350px]:col-start-1 max-[1350px]:m-0 max-[1350px]:max-w-[90%] max-[1350px]:row-start-3">
            <div className="flex justify-between text-[0.9rem] font-medium text-profond">
              <span>{t.budget.outcome} :</span>
              <b className="text-[#e74c3c]">-{totalExpensePeriod.toFixed(2)}€</b>
            </div>
            <div className="flex justify-between text-[0.9rem] font-medium text-profond">
              <span>{t.budget.income} :</span>
              <b className="text-[#2ecc71]">+{totalIncomePeriod.toFixed(2)}€</b>
            </div>

            <div className="mt-1.25 flex justify-between border-t border-dashed border-lilas-doux pt-2.5 text-[0.9rem] font-bold text-profond">
              <span>{t.budget.balance || 'Balance'} :</span>
              <b
                className={
                  totalIncomePeriod - totalExpensePeriod >= 0 ? 'text-[#2ecc71]' : 'text-[#e74c3c]'
                }
              >
                {(totalIncomePeriod - totalExpensePeriod).toFixed(2)}€
              </b>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto max-[1350px]:col-start-2 max-[1350px]:row-span-2 max-[1350px]:row-start-2 max-[1350px]:max-h-none max-[1350px]:min-h-0">
            {pieChartData.map((c) => (
              <div
                key={c.id}
                className="flex justify-between rounded-lg bg-card px-3 py-2 text-[0.85rem] text-profond shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]"
              >
                <span>
                  <span className={getCategoryColorClass(c.id)}>●</span> {c.name}
                </span>
                <b>{c.total.toFixed(2)}€</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
