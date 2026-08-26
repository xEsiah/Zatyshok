/* eslint-disable prettier/prettier */
import { useState, useEffect, JSX, useMemo, useCallback } from 'react'
import { api, BudgetCategory, Expense } from '../services'
import { useUser } from './UserContext'
import { useModal } from './ModalContext'
import '../assets/Budgetizer.css'

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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
    <div className="budget-grid">
      <div className="soft-ui budget-main-card">
        <div className="budget-header-tabs">
          <h2 className="budget-header">{t.budget.title}</h2>
          <div className="budget-mode-switch">
            <button
              className={`soft-btn ${mode === 'expense' ? 'active' : ''}`}
              onClick={() => {
                setMode('expense')
                setCatId('')
              }}
            >
              {t.budget.outcome}
            </button>
            <button
              className={`soft-btn ${mode === 'income' ? 'active' : ''}`}
              onClick={() => {
                setMode('income')
                setCatId('')
              }}
            >
              {t.budget.income}
            </button>
          </div>
        </div>

        <div className="budget-forms-area">
          <div className="budget-form-col">
            <small>{mode === 'expense' ? t.budget.addExpense : t.budget.addIncome}</small>
            <input
              className="soft-input"
              type="number"
              placeholder={t.budget.amount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              className="soft-input"
              placeholder={t.budget.description}
              value={desc}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="budget-custom-select">
              <div
                className="soft-input budget-select-btn"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {catId
                  ? currentCategories.find((c) => c.id.toString() === catId)?.name
                  : `-- ${t.budget.category} --`}
              </div>
              {isDropdownOpen && (
                <div className="budget-select-menu soft-ui">
                  <div
                    className="budget-select-option"
                    onClick={() => {
                      setCatId('')
                      setIsDropdownOpen(false)
                    }}
                  >
                    -- {t.budget.category} --
                  </div>
                  {currentCategories.map((c) => (
                    <div
                      key={c.id}
                      className="budget-select-option"
                      onClick={() => {
                        setCatId(c.id.toString())
                        setIsDropdownOpen(false)
                      }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="soft-btn-primary" onClick={handleAddExpense}>
              {t.budget.save}
            </button>
          </div>

          <div className="budget-form-col">
            <small>{mode === 'expense' ? t.budget.addCategory : t.budget.addIncomeCategory}</small>
            <div className="budget-category-add-row">
              <input
                className="soft-input"
                style={{ flex: 1 }}
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder={t.budget.newCategoryPlaceholder}
              />
              <button className="soft-btn active" onClick={handleAddCategory}>
                +
              </button>
            </div>
          </div>
        </div>

        <div className="budget-history-area">
          <div className="budget-history-header">
            <h3>{t.budget.historyTitle || t.budget.latestExpensesTitle}</h3>
            <div className="budget-filters">
              {(['month', '3months', '6months', 'year'] as const).map((f) => (
                <button
                  key={f}
                  className={`soft-btn ${filter === f ? 'active' : ''}`}
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

          <div className="budget-list">
            {filteredExpenses.length === 0 ? (
              <p className="budget-empty-msg">{t.budget.noRecentExpenses}</p>
            ) : (
              filteredExpenses.map((exp, index) => (
                <div
                  key={exp.id || index}
                  className="budget-list-item"
                  style={{ color: getCategoryColor(exp.category_id) }}
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

      <div className="budget-sidebar">
        <div className="soft-ui budget-widget-card">
          <h3>{t.budget.chart}</h3>

          {grandTotal > 0 ? (
            <div className="budget-chart-container">
              <svg viewBox="0 0 100 100" width="100%" height="100%" className="budget-pie-svg">
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
            <p className="budget-empty-msg">Ø</p>
          )}

          <div className="budget-sidebar-totals">
            <div className="sidebar-total-row">
              <span>{t.budget.outcome} :</span>
              <b className="total-out">-{totalExpensePeriod.toFixed(2)}€</b>
            </div>
            <div className="sidebar-total-row">
              <span>{t.budget.income} :</span>
              <b className="total-in">+{totalIncomePeriod.toFixed(2)}€</b>
            </div>

            <div className="sidebar-total-row balance">
              <span>{t.budget.balance || 'Balance'} :</span>
              <b className={totalIncomePeriod - totalExpensePeriod >= 0 ? 'pos' : 'neg'}>
                {(totalIncomePeriod - totalExpensePeriod).toFixed(2)}€
              </b>
            </div>
          </div>

          <div className="budget-legend-area">
            {pieChartData.map((c) => (
              <div key={c.id} className="budget-legend-item">
                <span>
                  <span style={{ color: getCategoryColor(c.id) }}>●</span> {c.name}
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
