import React from 'react';
import { Ticket, TicketStatus } from '../types';
import { Check, Lock } from 'lucide-react';

interface TicketGridProps {
  tickets: Ticket[];
  selectedIds: number[];
  onToggle: (ticketNumber: number) => void;
}

export const TicketGrid: React.FC<TicketGridProps> = ({ tickets, selectedIds, onToggle }) => {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 md:gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
      {tickets.map((ticket) => {
        const isSelected = selectedIds.includes(ticket.number);
        const isSold = ticket.status === TicketStatus.SOLD;
        const isReserved = ticket.status === TicketStatus.RESERVED;
        const isUnavailable = isSold || isReserved;

        let baseClasses = "relative h-12 w-full rounded-lg flex items-center justify-center font-bold text-sm transition-all duration-200 select-none cursor-pointer";
        let statusClasses = "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200";

        if (isSelected) {
          statusClasses = "bg-brand-500 text-white shadow-md ring-2 ring-brand-200 transform scale-105 border-brand-600";
        } else if (isUnavailable) {
          statusClasses = "bg-red-50 text-red-300 cursor-not-allowed border-transparent";
        }

        return (
          <div
            key={ticket.number}
            onClick={() => !isUnavailable && onToggle(ticket.number)}
            className={`${baseClasses} ${statusClasses}`}
          >
            {isUnavailable ? (
              <Lock size={14} />
            ) : isSelected ? (
              <Check size={16} strokeWidth={3} />
            ) : (
              ticket.number
            )}
          </div>
        );
      })}
    </div>
  );
};