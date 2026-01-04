'use client';

import { CheckCircle2, XCircle, Brain, Pencil } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Transaction } from '@/types/wizard';

interface TransactionRowProps {
  transaction: Transaction;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (status: 'business' | 'personal') => void;
  onEdit?: () => void;
}

export function TransactionRow({
  transaction,
  isSelected,
  onSelect,
  onStatusChange,
  onEdit,
}: TransactionRowProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isPersonal = transaction.status === 'personal';

  return (
    <tr
      className={cn(
        'hover:bg-gray-50 transition-colors',
        transaction.status === 'needs_review' && 'bg-amber-50/50',
        isPersonal && 'opacity-50 bg-gray-50'
      )}
    >
      {/* Checkbox */}
      <td className="p-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300"
        />
      </td>

      {/* Date */}
      <td className={cn('p-3 text-sm', isPersonal ? 'text-gray-400' : 'text-gray-600')}>
        {formatDate(transaction.date)}
      </td>

      {/* Description */}
      <td className="p-3">
        <p className={cn(
          'text-sm font-medium truncate max-w-xs',
          isPersonal ? 'text-gray-500' : 'text-gray-900'
        )}>
          {transaction.description}
        </p>
        {transaction.status === 'needs_review' &&
          transaction.suggested_category && (
            <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
              <Brain className="h-3 w-3" />
              AI suggests: {transaction.suggested_category}
            </p>
          )}
      </td>

      {/* Category */}
      <td className="p-3">
        <span className={cn('text-sm', isPersonal ? 'text-gray-400' : 'text-gray-600')}>
          {transaction.category || transaction.suggested_category || '-'}
        </span>
      </td>

      {/* Amount */}
      <td className="p-3 text-right">
        <span
          className={cn(
            'text-sm font-medium',
            isPersonal
              ? 'text-gray-400'
              : transaction.type === 'income'
                ? 'text-[#00c4d4]'
                : 'text-gray-900'
          )}
        >
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </span>
      </td>

      {/* Status Buttons */}
      <td className="p-3">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onStatusChange('business')}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              transaction.status === 'business'
                ? 'bg-[#ccf5f7] text-[#00c4d4]'
                : 'hover:bg-gray-100 text-gray-400 hover:text-[#00c4d4]'
            )}
            title="Mark as Business"
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => onStatusChange('personal')}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              transaction.status === 'personal'
                ? 'bg-red-100 text-red-600'
                : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'
            )}
            title="Mark as Personal"
          >
            <XCircle className="h-5 w-5" />
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Edit Category"
            >
              <Pencil className="h-5 w-5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
