import React from 'react';
import { CreditCard } from 'lucide-react';

const StudentStatusBadge = ({ isPaid }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${
    isPaid
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }`}>
    <CreditCard className="w-3 h-3" />
    {isPaid ? 'Paid' : 'Unpaid'}
  </span>
);

export default StudentStatusBadge;