import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DeviceType } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  validateCiscoCommandSuite,
  CISCO_DEVICE_PLATFORMS,
} from '../utils/ciscoSyntaxValidator';
import {
  TerminalWindow,
  ArrowLeft,
  CaretRight,
  Trash,
  CheckCircle,
  Warning,
  ShieldCheck,
  Star,
} from '@phosphor-icons/react';

export const CommandSetDetailPage: React.FC = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { commandSets, updateCommandSet, deleteCommandSet } = useAppStore();

  const commandSet = commandSets.find((s) => s.setId === setId);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    deviceType: DeviceType;
    commandsText: string;
    isDefault: boolean;
  }>({
    name: '',
    description: '',
    deviceType: 'cisco_xe',
    commandsText: '',
    isDefault: false,
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (commandSet) {
      setFormData({
        name: commandSet.name,
        description: commandSet.description,
        deviceType: commandSet.deviceType,
        commandsText: (commandSet.commands || []).join('\n'),
        isDefault: commandSet.isDefault,
      });
    }
  }, [commandSet]);

  const syntaxValidation = useMemo(() => {
    return validateCiscoCommandSuite(formData.commandsText, formData.deviceType);
  }, [formData.commandsText, formData.deviceType]);

  if (!commandSet) {
    return (
      <div className="space-y-6 font-sans max-w-4xl mx-auto">
        <div className="p-8 text-center border border-zinc-800 rounded-2xl bg-zinc-900/40">
          <TerminalWindow className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-zinc-200">Command Set Not Found</h2>
          <p className="text-xs text-zinc-400 mt-1">The requested command set profile does not exist or was deleted.</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={() => navigate('/setup?tab=commands')}
            className="mt-4"
          >
            Back to Command Sets
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || syntaxValidation.validCommands.length === 0 || syntaxValidation.hasErrors) {
      return;
    }

    updateCommandSet(commandSet.setId, {
      name: formData.name.trim(),
      description: formData.description.trim(),
      deviceType: formData.deviceType,
      commands: syntaxValidation.validCommands,
      isDefault: formData.isDefault,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleToggleDefault = () => {
    const nextDefault = !formData.isDefault;
    setFormData((prev) => ({ ...prev, isDefault: nextDefault }));
    updateCommandSet(commandSet.setId, { isDefault: nextDefault });
  };

  const handleConfirmDelete = () => {
    deleteCommandSet(commandSet.setId);
    navigate('/setup?tab=commands');
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link
          to="/setup?tab=commands"
          className="hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          <TerminalWindow className="w-3.5 h-3.5" />
          <span>Command Sets</span>
        </Link>
        <CaretRight className="w-3 h-3 text-zinc-600" />
        <span className="text-zinc-100 font-bold">{commandSet.name}</span>
      </div>

      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{commandSet.name}</h1>
            {commandSet.isDefault && (
              <Badge variant="verified" size="sm">
                DEFAULT PROFILE
              </Badge>
            )}
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              {commandSet.deviceType}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            {commandSet.description || 'Pre-configured non-mutating show command profile for drift inspection.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Star className={`w-4 h-4 ${formData.isDefault ? 'text-[#c8ff00]' : 'text-zinc-400'}`} weight={formData.isDefault ? 'fill' : 'regular'} />}
            onClick={handleToggleDefault}
          >
            {formData.isDefault ? 'Default Profile' : 'Set as Default'}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            leftIcon={<Trash className="w-4 h-4" />}
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Single Unified Configuration Form */}
      <Card className="p-6 border-zinc-800 bg-zinc-900/60 shadow-xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <TerminalWindow className="w-4 h-4 text-[#c8ff00]" />
                <span>Command Profile Configuration</span>
              </h3>
              {isSaved && (
                <span className="text-xs text-[#c8ff00] font-semibold flex items-center gap-1.5 animate-pulse">
                  <CheckCircle className="w-4 h-4" weight="fill" />
                  <span>Profile updated</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Profile Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BGP & WAN Health Check"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Device Driver Architecture
                </label>
                <select
                  value={formData.deviceType}
                  onChange={(e) =>
                    setFormData({ ...formData, deviceType: e.target.value as DeviceType })
                  }
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 font-medium"
                >
                  {CISCO_DEVICE_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Description
              </label>
              <input
                type="text"
                placeholder="Operational verification scope and topology purpose..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* CLI Commands Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Cisco Show Commands (One command per line)
                </label>
                <span className="text-[11px] font-mono text-zinc-400">
                  {syntaxValidation.validCommands.length} command{syntaxValidation.validCommands.length === 1 ? '' : 's'}
                </span>
              </div>
              <textarea
                rows={7}
                required
                value={formData.commandsText}
                onChange={(e) => setFormData({ ...formData, commandsText: e.target.value })}
                placeholder="show version&#10;show ip interface brief&#10;show ip route summary"
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 leading-relaxed"
              />
            </div>

            {/* Syntax Validation Feedback */}
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                !syntaxValidation.hasErrors
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                  : 'bg-rose-950/30 border-rose-800/70 text-rose-200'
              }`}
            >
              {!syntaxValidation.hasErrors ? (
                <ShieldCheck className="w-4 h-4 text-[#c8ff00] shrink-0 mt-0.5" />
              ) : (
                <Warning className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <span className={!syntaxValidation.hasErrors ? 'text-zinc-200' : 'text-rose-400'}>
                    {!syntaxValidation.hasErrors ? 'Read-Only Safety Verified' : 'Mutation Hazard Detected'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {!syntaxValidation.hasErrors
                    ? `All ${syntaxValidation.validCommands.length} commands verified read-only safe for Cisco CLI.`
                    : syntaxValidation.errorMessage || 'Invalid command syntax detected.'}
                </p>
                {syntaxValidation.hasErrors && (
                  <ul className="list-disc list-inside text-rose-300 text-[11px] space-y-0.5 pt-1">
                    {syntaxValidation.results
                      .filter((r) => r.status === 'error')
                      .map((r, i) => (
                        <li key={i}>{r.command}: {r.message}</li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => navigate('/setup?tab=commands')}
            >
              Back to Command Sets
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={syntaxValidation.hasErrors || syntaxValidation.validCommands.length === 0}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${commandSet.name}`}
          message={`Delete command set profile "${commandSet.name}"? This command profile will no longer be available for automated snapshots.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  );
};
