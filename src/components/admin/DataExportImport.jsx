import React, { useState, useRef } from 'react';
import { useAdminData } from '../../utils/useAdminData';
import * as ds from '../../utils/adminDataStore';

export default function DataExportImport({ user }) {
  const { loading, refresh } = useAdminData();

  const [importFile, setImportFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  /* ───── Export ───── */
  const handleExport = () => {
    try {
      const csv = ds.exportRatesCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tristar-rates-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    }
  };

  /* ───── Import: file select + preview ───── */
  const handleFileChange = (e) => {
    setImportResult(null);
    setError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setImportFile(null);
      setPreview(null);
      setCsvText('');
      return;
    }
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setCsvText(text);
      buildPreview(text);
    };
    reader.onerror = () => {
      setError('Could not read the selected file.');
    };
    reader.readAsText(file);
  };

  const buildPreview = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length === 0) {
      setPreview(null);
      return;
    }
    const headers = lines[0].split(',');
    const rows = lines.slice(1, 11).map((line) => line.split(','));
    const totalRows = lines.length - 1;
    setPreview({ headers, rows, totalRows });
  };

  /* ───── Import: apply ───── */
  const handleApply = async () => {
    if (!csvText) return;
    setImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const result = await ds.importRatesCSV(csvText, user);
      if (result.success) {
        setImportResult(result);
        await refresh();
      } else {
        setError(result.error || 'Import failed with an unknown error.');
        if (result.unknownPayers?.length) {
          setImportResult(result);
        }
      }
    } catch (err) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  /* ───── Refresh from DB ───── */
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await ds.loadAllData();
      await refresh();
    } catch (err) {
      setError(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  /* ───── Reset file input ───── */
  const handleClearFile = () => {
    setImportFile(null);
    setPreview(null);
    setCsvText('');
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="card" style={{ maxWidth: 800 }}>
      <h2 className="section-head">Data Export / Import</h2>

      {error && (
        <div className="alert-danger" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Export ── */}
      <div className="card-surface" style={{ marginBottom: 20, padding: 16 }}>
        <h3 style={{ margin: '0 0 8px', color: '#FF8200' }}>Export Rates</h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.8 }}>
          Download all current payer rates as a CSV file.
        </p>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={loading}
        >
          Download CSV
        </button>
      </div>

      {/* ── Import ── */}
      <div className="card-surface" style={{ marginBottom: 20, padding: 16 }}>
        <h3 style={{ margin: '0 0 8px', color: '#FF8200' }}>Import Rates</h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.8 }}>
          Upload a CSV file to update payer rates in bulk.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label className="field-label" htmlFor="csv-upload">
            Select CSV file
          </label>
          <input
            id="csv-upload"
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'block', marginTop: 4 }}
          />
        </div>

        {preview && (
          <div style={{ marginBottom: 12 }}>
            <div className="alert-info" style={{ marginBottom: 8 }}>
              Preview: showing {preview.rows.length} of {preview.totalRows} data
              row{preview.totalRows !== 1 ? 's' : ''}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    {preview.headers.map((h, i) => (
                      <th
                        key={i}
                        style={{
                          textAlign: 'left',
                          padding: '4px 8px',
                          borderBottom: '2px solid #FF8200',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          style={{
                            padding: '3px 8px',
                            borderBottom: '1px solid #ddd',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleApply}
            disabled={!csvText || importing}
          >
            {importing ? 'Applying...' : 'Apply'}
          </button>
          {importFile && (
            <button
              className="btn btn-muted btn-sm"
              onClick={handleClearFile}
              disabled={importing}
            >
              Clear
            </button>
          )}
        </div>

        {importResult && importResult.success && (
          <div className="alert-info" style={{ marginTop: 12 }}>
            Import complete: <strong>{importResult.updated}</strong> rate
            {importResult.updated !== 1 ? 's' : ''} updated.
            {importResult.unknownPayers?.length > 0 && (
              <div className="alert-warning" style={{ marginTop: 8 }}>
                Unknown payers skipped:{' '}
                <strong>{importResult.unknownPayers.join(', ')}</strong>
              </div>
            )}
          </div>
        )}

        {importResult && !importResult.success && importResult.unknownPayers?.length > 0 && (
          <div className="alert-warning" style={{ marginTop: 12 }}>
            Unknown payers encountered:{' '}
            <strong>{importResult.unknownPayers.join(', ')}</strong>
          </div>
        )}
      </div>

      {/* ── Refresh ── */}
      <div className="card-surface" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 8px', color: '#FF8200' }}>
          Refresh from Database
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.8 }}>
          Force reload all rate data from Supabase.
        </p>
        <button
          className="btn btn-ghost"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
}
