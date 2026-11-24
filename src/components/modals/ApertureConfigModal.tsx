import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { LaborRegionOption, ModelRateOption } from '../../App';

export interface CustomRawTraceInput {
  id: string;
  domain: string;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  retryCount: number;
  hasFailure: boolean;
  failureTaxonomy?: string;
  reworkMinutes?: number;
  reworkDiscoveryHours?: number;
  dollarStakes?: number;
}

interface ApertureConfigModalProps {
  open: boolean;
  models: ModelRateOption[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  laborRegions: LaborRegionOption[];
  selectedLaborRegionId: string;
  onSelectLaborRegion: (id: string) => void;
  monthlyTaskVolume: number;
  onChangeMonthlyVolume: (vol: number) => void;
  onIngestCustomTraces: (raw: CustomRawTraceInput[]) => void;
  onClose: () => void;
}

export const ApertureConfigModal: React.FC<ApertureConfigModalProps> = ({
  open,
  models,
  selectedModelId,
  onSelectModel,
  laborRegions,
  selectedLaborRegionId,
  onSelectLaborRegion,
  monthlyTaskVolume,
  onChangeMonthlyVolume,
  onIngestCustomTraces,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!open) return null;

  const parseUploadedFile = async (file: File) => {
    try {
      const text = await file.text();
      let parsed: CustomRawTraceInput[] = [];

      if (file.name.toLowerCase().endsWith('.json')) {
        const json = JSON.parse(text);
        const arr = Array.isArray(json) ? json : json.traces ?? [];
        parsed = arr.map((item: Record<string, unknown>, idx: number) => ({
          id: String(item.id ?? item.trace_id ?? `CUST-${1000 + idx}`),
          domain: String(item.domain ?? 'custom-ops'),
          inputTokens: Number(item.inputTokens ?? item.input_tokens ?? 12400),
          outputTokens: Number(item.outputTokens ?? item.output_tokens ?? 1450),
          toolCalls: Number(item.toolCalls ?? item.tool_calls ?? 3),
          retryCount: Number(item.retryCount ?? item.retry_count ?? 1),
          hasFailure: Boolean(item.hasFailure ?? item.has_failure ?? false),
          failureTaxonomy: item.failureTaxonomy ? String(item.failureTaxonomy) : undefined,
          reworkMinutes: item.reworkMinutes ? Number(item.reworkMinutes) : undefined,
          reworkDiscoveryHours: item.reworkDiscoveryHours
            ? Number(item.reworkDiscoveryHours)
            : undefined,
          dollarStakes: item.dollarStakes ? Number(item.dollarStakes) : undefined,
        }));
      } else {
        // Parse CSV trace export
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const get = (k: string) => {
            const idx = headers.indexOf(k);
            return idx >= 0 ? cols[idx] : undefined;
          };
          parsed.push({
            id: get('id') ?? get('trace_id') ?? `CSV-${1000 + i}`,
            domain: get('domain') ?? 'custom-csv',
            inputTokens: Number(get('input_tokens') ?? 14000),
            outputTokens: Number(get('output_tokens') ?? 1800),
            toolCalls: Number(get('tool_calls') ?? 4),
            retryCount: Number(get('retry_count') ?? 1),
            hasFailure: get('has_failure') === 'true' || Number(get('rework_minutes') ?? 0) > 0,
            failureTaxonomy: get('failure_taxonomy'),
            reworkMinutes: get('rework_minutes') ? Number(get('rework_minutes')) : undefined,
            reworkDiscoveryHours: get('discovery_hours')
              ? Number(get('discovery_hours'))
              : undefined,
            dollarStakes: get('dollar_stakes') ? Number(get('dollar_stakes')) : undefined,
          });
        }
      }

      if (parsed.length === 0) {
        setStatusMessage('No valid traces detected in file.');
        return;
      }

      onIngestCustomTraces(parsed);
      setStatusMessage(`Ingested ${parsed.length} custom traces into active clearing field.`);
    } catch {
      setStatusMessage('Unable to parse file. Provide valid JSON array or CSV with headers.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-sumi/24 backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[780px] max-h-[86vh] optical-glass rounded-[28px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-6 pb-5 hairline-b flex items-start justify-between">
          <div>
            <div className="plate-caption flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              OPTICAL APERTURE · TELEMETRY INGEST &amp; ECONOMIC CALIBRATION
            </div>
            <h2 className="font-serif text-[38px] leading-none text-sumi mt-1.5">
              Rate Cards, BLS Matrix &amp; Trace Ingest
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-sumi/[0.06] text-sumi/60 hover:text-sumi transition-colors"
            aria-label="Close aperture settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto optical-scroll px-8 py-6 space-y-7">
          {/* LLM Rate Card Selection */}
          <div className="pb-6 hairline-b">
            <div className="plate-caption mb-3">
              01 · LLM INFERENCE RATE CARD ($ / 1M TOKENS)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {models.map((m) => {
                const active = m.id === selectedModelId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectModel(m.id)}
                    className={`text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between ${
                      active
                        ? 'bg-sumi text-alabaster'
                        : 'bg-sumi/[0.04] hover:bg-sumi/[0.08] text-sumi'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-[12px] font-semibold">
                        {m.label}
                      </div>
                      <div
                        className={`font-mono text-[10.5px] mt-0.5 tabular-nums-strict ${
                          active ? 'text-alabaster/65' : 'text-sumi/55'
                        }`}
                      >
                        In ${m.inputPer1M.toFixed(2)} · Out ${m.outputPer1M.toFixed(2)} · Cache {(m.cacheDiscount * 100).toFixed(0)}% off
                      </div>
                    </div>
                    {active && <CheckCircle2 className="w-4 h-4 text-viridian-soft shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BLS Labor Matrix Calibration */}
          <div className="pb-6 hairline-b">
            <div className="plate-caption mb-3">
              02 · BLS FULLY-BURDENED HUMAN REWORK WAGE MATRIX
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {laborRegions.map((reg) => {
                const active = reg.id === selectedLaborRegionId;
                return (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() => onSelectLaborRegion(reg.id)}
                    className={`text-left px-4 py-3 rounded-2xl transition-all ${
                      active
                        ? 'bg-cobalt text-alabaster'
                        : 'bg-sumi/[0.04] hover:bg-sumi/[0.08] text-sumi'
                    }`}
                  >
                    <div className="text-[12px] font-semibold">{reg.label}</div>
                    <div
                      className={`font-mono text-[12px] mt-1 tabular-nums-strict ${
                        active ? 'text-alabaster/85' : 'text-sumi/65'
                      }`}
                    >
                      ${reg.fullyLoadedHourly.toFixed(2)} / hr
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Monthly Task Volume Slider */}
            <div className="mt-5">
              <div className="flex items-center justify-between font-mono text-[11px] tabular-nums-strict mb-1.5">
                <span className="plate-caption">PORTFOLIO MONTHLY TASK VOLUME</span>
                <span className="font-semibold text-sumi">
                  {monthlyTaskVolume.toLocaleString()} tasks / month
                </span>
              </div>
              <input
                type="range"
                min={5000}
                max={120000}
                step={2500}
                value={monthlyTaskVolume}
                onChange={(e) => onChangeMonthlyVolume(Number(e.target.value))}
                className="optical-slider w-full"
              />
            </div>
          </div>

          {/* Custom Trace Ingestion Dropzone */}
          <div>
            <div className="plate-caption mb-3">
              03 · CUSTOM PRODUCTION TRACE INGESTION (JSON / CSV)
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) parseUploadedFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border border-dashed p-6 text-center transition-colors ${
                dragActive
                  ? 'border-cobalt bg-cobalt/[0.06]'
                  : 'border-sumi/25 hover:border-sumi/50 bg-sumi/[0.025]'
              }`}
            >
              <Upload className="w-5 h-5 text-sumi/55 mx-auto mb-2" />
              <div className="text-[13px] font-medium text-sumi">
                Drop OpenTelemetry JSON or CSV trace settlement batch
              </div>
              <div className="font-mono text-[10.5px] text-sumi/50 mt-1">
                Fields: id, domain, input_tokens, output_tokens, tool_calls, retry_count, rework_minutes, has_failure
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) parseUploadedFile(file);
                }}
              />
            </div>

            {statusMessage && (
              <div className="mt-2.5 font-mono text-[11.5px] text-viridian">
                {statusMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
