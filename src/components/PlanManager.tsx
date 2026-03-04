import { useState } from 'react';
import type { Plan } from '../types';
import { ChevronDown, Plus, Trash2, Copy, GitCompare, Download, Edit2, Check, X } from 'lucide-react';

interface PlanManagerProps {
  plans: Plan[];
  activePlanId: string;
  onSelectPlan: (planId: string) => void;
  onCreatePlan: (name: string) => void;
  onDeletePlan: (planId: string) => void;
  onDuplicatePlan: (planId: string) => void;
  onCompare: () => void;
  onRenamePlan?: (planId: string, newName: string) => void;
  onExportPlan?: (plan: Plan) => void;
}

export function PlanManager({
  plans,
  activePlanId,
  onSelectPlan,
  onCreatePlan,
  onDeletePlan,
  onDuplicatePlan,
  onCompare,
  onRenamePlan,
  onExportPlan,
}: PlanManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [showNewPlanInput, setShowNewPlanInput] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const activePlan = plans.find((p) => p.id === activePlanId);

  const handleCreatePlan = () => {
    if (newPlanName.trim()) {
      onCreatePlan(newPlanName.trim());
      setNewPlanName('');
      setShowNewPlanInput(false);
      setIsOpen(false);
    }
  };

  const handleRename = (planId: string) => {
    if (editName.trim()) {
      onRenamePlan?.(planId, editName.trim());
      setEditingPlanId(null);
      setEditName('');
    }
  };

  const startEdit = (plan: Plan, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlanId(plan.id);
    setEditName(plan.name);
  };

  const cancelEdit = () => {
    setEditingPlanId(null);
    setEditName('');
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {plans.length > 1 && (
          <button
            onClick={onCompare}
            className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            Compare
          </button>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          <span className="max-w-[120px] truncate">{activePlan?.name || 'Select Plan'}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                Your Plans
              </p>
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    plan.id === activePlanId
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {editingPlanId === plan.id ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(plan.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(plan.id);
                        }}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="flex-1 truncate text-sm font-medium"
                        onClick={() => {
                          onSelectPlan(plan.id);
                          setIsOpen(false);
                        }}
                      >
                        {plan.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => startEdit(plan, e)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Rename plan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {onExportPlan && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onExportPlan(plan);
                            }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Export plan"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicatePlan(plan.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Duplicate plan"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {plans.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePlan(plan.id);
                              if (plan.id === activePlanId) {
                                setIsOpen(false);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete plan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

              <div className="border-t border-gray-200 mt-2 pt-2">
                {!showNewPlanInput ? (
                  <button
                    onClick={() => setShowNewPlanInput(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Plan
                  </button>
                ) : (
                  <div className="px-3 py-2 space-y-2">
                    <input
                      type="text"
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      placeholder="Plan name"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreatePlan();
                        if (e.key === 'Escape') setShowNewPlanInput(false);
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreatePlan}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowNewPlanInput(false);
                          setNewPlanName('');
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
