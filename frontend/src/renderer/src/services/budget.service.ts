/* eslint-disable prettier/prettier */
import { API_URL, getHeaders, checkAuthError } from './apiClient'
import { BudgetCategory, Expense } from './types'

export const getCategories = async (type?: 'expense' | 'income'): Promise<BudgetCategory[]> => {
  const headers = await getHeaders()
  const url = type ? `${API_URL}/budget/categories?type=${type}` : `${API_URL}/budget/categories`
  const res = await fetch(url, { headers })
  checkAuthError(res)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch categories')
  }
  return res.json()
}

export const postCategory = async (
  name: string,
  type: 'expense' | 'income' = 'expense'
): Promise<void> => {
  const headers = await getHeaders(true)
  const res = await fetch(`${API_URL}/budget/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, type })
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to add category')
  }
}

export const getAllExpenses = async (): Promise<Expense[]> => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/budget/expenses`, { headers })
  checkAuthError(res)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch expenses')
  }
  return res.json()
}

export const getLatestExpenses = async (limit: number = 5): Promise<Expense[]> => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/budget/expenses?limit=${limit}`, { headers })
  checkAuthError(res)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to fetch latest expenses')
  }
  return res.json()
}

export const postExpense = async (expense: Expense): Promise<void> => {
  const headers = await getHeaders(true)
  const res = await fetch(`${API_URL}/budget/expenses`, {
    method: 'POST',
    headers,
    body: JSON.stringify(expense)
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to add expense')
  }
}
