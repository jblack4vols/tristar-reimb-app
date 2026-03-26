import React, { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '../../utils/supabase';
import { decryptPHI } from '../../utils/crypto';
import * as ds from '../../utils/adminDataStore';

const TABLES = [
  { key: 'rates', table: 'rates', order: 'code' },
  { key: 'payers', table: 'payers', order: 'sort_order' },
  { key: 'contract_payers', table: 'contract_payers', order: 'name' },
  { key: 'providers', table: 'providers', order: 'name' },
  { key: 'billing_rules', table: 'billing_rules', order: 'payer' },
  { key: 'code_labels', table: 'code_labels', order: 'code' },
  { key: 'code_groups', table: 'code_groups', order: 'sort_order' },
  { key: 'app_users', table: 'app_users', order: 'name', excludeCols: ['password'] },
  { key: 'combos', table: 'combos', order: 'saved_at' },
  { key: 'activity_log', table: 'activity_log', order: 'ts' },
  { key: 'billing_entries', table: 'billing_entries', order: 'visit_date', decryptFields: ['patient_name', 'notes'] },
  { key: 'patients', table: 'patients', order: 'created_at', decryptFields: ['name', 'notes'] },
  { key: 'authorizations', table: 'authorizations', order: 'created_at' },
  { key: 'treatment_templates', table: 'treatment_templates', order: 'name' },
];

function rowToCSVLine(row) {
  return Object.values(row).map(v => {
    if (v === null || v === undefined) return '';
    const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }).join(',');
}

function arrayToCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(','), ...rows.map(rowToCSVLine)];
  return lines.join('\n');
}

export default function DataBackup({ user }) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tableCounts, setTableCounts] = useState(null);
  const [error, setError] = useState(null);
  const [ratesExporting, setRatesExporting] = useState(false);

  /* ───── Full backup ───── */
  const handleFullBackup = async () => {
    setExporting(true);
    setProgress(0);
    setError(null);
    setTableCounts(null);

    try {
      const zip = new JSZip();
      const counts = {};
      const total = TABLES.length;

      for (let i = 0; i < TABLES.length; i++) {
        const t = TABLES[i];
        setProgress(Math.round(((i) / total) * 100));

        const { data, error: fetchErr } = await supabase
          .from(t.table)
          .select('*')
          .order(t.order || 'id');

        if (fetchErr) {
          console.warn(`Failed to fetch ${t.key}:`, fetchErr.message);
          counts[t.key] = 0;
          continue;
        }

        let rows = data || [];

        // Exclude sensitive columns (e.g. passwords)
        if (t.excludeCols && rows.length > 0) {
          rows = rows.map(row => {
            const clean = { ...row };
            t.excludeCols.forEach(col => delete clean[col]);
            return clean;
          });
        }

        // Decrypt PHI fields
        if (t.decryptFields && rows.length > 0) {
          rows = rows.map(row => {
            const dec = { ...row };
            t.decryptFields.forEach(field => {
              if (dec[field]) dec[field] = decryptPHI(dec[field]);
            });
            return dec;
          });
        }

        counts[t.key] = rows.length;

        if (rows.length > 0) {
          zip.file(`${t.key}.csv`, arrayToCSV(rows));
        } else {
          zip.file(`${t.key}.csv`, '');
        }
      }

      // Add manifest
      const manifest = {
        export_date: new Date().toISOString(),
        exported_by: user?.username || user?.name || 'unknown',
        tables: counts,
        total_tables: Object.keys(counts).length,
        total_rows: Object.values(counts).reduce((s, n) => s + n, 0),
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      setProgress(100);

      const blob = await zip.generateAsync({ type: 'blob' });
      const today = new Date().toISOString().slice(0, 10);
      saveAs(blob, `tristar-backup-${today}.zip`);

      setTableCounts(counts);
    } catch (err) {
      setError(`Backup failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  /* ───── Rates-only export ───── */
  const handleRatesExport = () => {
    setRatesExporting(true);
    setError(null);
    try {
      const csv = ds.exportRatesCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const today = new Date().toISOString().slice(0, 10);
      saveAs(blob, `tristar-rates-${today}.csv`);
    } catch (err) {
      setError(`Rates export failed: ${err.message}`);
    } finally {
      setRatesExporting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 800 }}>
      <h2 className="section-head">Data Backup</h2>

      {error && (
        <div className="alert-danger" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* HIPAA Warning */}
      <div className="alert-warning" style={{ marginBottom: 20 }}>
        <strong>HIPAA Notice:</strong> This backup contains PHI (Protected Health Information).
        Store securely per HIPAA guidelines. Do not share via unencrypted email or unsecured storage.
      </div>

      {/* ── Full Backup ── */}
      <div className="card-surface" style={{ marginBottom: 20, padding: 16 }}>
        <h3 style={{ margin: '0 0 8px', color: '#FF8200' }}>Full Data Backup</h3>
        <p style={{ margin: '0 0 4px', fontSize: 14, opacity: 0.8 }}>
          Export all tables as a ZIP archive containing CSV files and a manifest.
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.6 }}>
          Includes: rates, payers, providers, billing entries, patients, authorizations,
          templates, activity log, combos, billing rules, code labels, code groups, and users (passwords excluded).
        </p>

        {/* Progress bar */}
        {exporting && (
          <div style={{
            marginBottom: 12,
            background: '#e5e7eb',
            borderRadius: 6,
            overflow: 'hidden',
            height: 22,
            position: 'relative',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: '#FF8200',
              borderRadius: 6,
              transition: 'width 0.3s ease',
            }} />
            <span style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 12,
              fontWeight: 700,
              color: progress > 50 ? '#fff' : '#374151',
            }}>
              {progress}%
            </span>
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleFullBackup}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Download Full Backup'}
        </button>

        {/* Table counts after export */}
        {tableCounts && (
          <div style={{ marginTop: 16 }}>
            <span className="field-label" style={{ marginBottom: 8, display: 'block' }}>
              Export Summary
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(tableCounts).map(([table, count]) => (
                <span className="badge" key={table} style={{ fontSize: 12 }}>
                  {table}: {count}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
              Total rows exported: {Object.values(tableCounts).reduce((s, n) => s + n, 0)}
            </div>
          </div>
        )}
      </div>

      {/* ── Rates Only ── */}
      <div className="card-surface" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 8px', color: '#FF8200' }}>Export Rates Only</h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.8 }}>
          Download payer rates as a single CSV file. No PHI included.
        </p>
        <button
          className="btn btn-muted btn-sm"
          onClick={handleRatesExport}
          disabled={ratesExporting}
        >
          {ratesExporting ? 'Exporting...' : 'Export Rates CSV'}
        </button>
      </div>
    </div>
  );
}
