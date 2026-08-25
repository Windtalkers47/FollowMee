import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ApiError } from '../components/customers/CustomerForm';
import type { Customer } from '../types/customer.types';

interface CustomerPageControllerInput {
  customers: Customer[];
  filterSearch?: string;
  onFilterChange: (patch: { search?: string; missingImage?: boolean }) => void;
}

export const useCustomerPageController = ({
  customers,
  filterSearch,
  onFilterChange,
}: CustomerPageControllerInput) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusMissingImage = searchParams.get('focus') === 'missing-image';
  const appliedFocusRef = useRef<boolean | null>(null);
  const [searchInput, setSearchInput] = useState(filterSearch || '');
  const [tabValue, setTabValue] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedMember, setSelectedMember] = useState<Customer | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formApiError, setFormApiError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!searchInput.trim() || searchInput === filterSearch) return;
    const timer = window.setTimeout(() => onFilterChange({ search: searchInput.trim() }), 300);
    return () => window.clearTimeout(timer);
  }, [filterSearch, onFilterChange, searchInput]);

  useEffect(() => {
    if (appliedFocusRef.current === focusMissingImage) return;
    appliedFocusRef.current = focusMissingImage;
    onFilterChange({ missingImage: focusMissingImage });
  }, [focusMissingImage, onFilterChange]);

  const clearFocus = () => setSearchParams(current => {
    const next = new URLSearchParams(current);
    next.delete('focus');
    return next;
  }, { replace: true });

  const toggleSelected = (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!customers.find(item => item.customerId === id)?.capabilities.canEdit) return;
    setSelected(current => current.includes(id)
      ? current.filter(selectedId => selectedId !== id)
      : [...current, id]);
  };

  const openActionMenu = (event: React.MouseEvent<HTMLElement>, customer: Customer) => {
    event.stopPropagation();
    setActionMenuAnchorEl(event.currentTarget);
    setSelectedMember(customer);
  };
  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setSelectedMember(null);
  };
  const openForm = (customer: Customer | null = null) => {
    setFormApiError(null);
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    setFormApiError(null);
  };

  return {
    focusMissingImage, clearFocus,
    searchInput, setSearchInput, tabValue, setTabValue,
    selected, setSelected, toggleSelected,
    actionMenuAnchorEl, setActionMenuAnchorEl, openActionMenu, closeActionMenu,
    selectedMember,
    filterAnchorEl, setFilterAnchorEl,
    isFormOpen, setIsFormOpen,
    editingCustomer, setEditingCustomer,
    formApiError, setFormApiError,
    openForm, closeForm,
  };
};
