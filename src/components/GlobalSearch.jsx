import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { decryptPHI } from '../utils/crypto';
import { useAdminData } from '../utils/useAdminData';

const MAX_PER_CATEGORY = 5;
const DEBOUNCE_MS = 300;

export default function GlobalSearch({ isOpen, onClose, onNavigate }) {
  const { codeLabels, payers, loading: adminLoading } = useAdminData();
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ patients: [], codes: [], templates: [], payers: [] });
  const [searching, setSearching] = useState(false);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ patients: [], codes: [], templates: [], payers: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K listener (handled externally too, but this is a safety net)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search logic
  const performSearch = useCallback(async (q) => {
    const term = q.trim().toLowerCase();
    if (!term) {
      setResults({ patients: [], codes: [], templates: [], payers: [] });
      setSearching(false);
      return;
    }

    setSearching(true);

    // Search codes (local, from adminData)
    const matchedCodes = [];
    if (codeLabels && typeof codeLabels === 'object') {
      for (const [code, label] of Object.entries(codeLabels)) {
        if (
          code.toLowerCase().includes(term) ||
          (typeof label === 'string' && label.toLowerCase().includes(term))
        ) {
          matchedCodes.push({ code, label: typeof label === 'string' ? label : code });
          if (matchedCodes.length >= MAX_PER_CATEGORY) break;
        }
      }
    }

    // Search payers (local, from adminData)
    const matchedPayers = [];
    if (Array.isArray(payers)) {
      for (const p of payers) {
        const name = typeof p === 'string' ? p : p.name || p.payer || '';
        if (name.toLowerCase().includes(term)) {
          matchedPayers.push({ name });
          if (matchedPayers.length >= MAX_PER_CATEGORY) break;
        }
      }
    }

    // Search patients (from supabase, decrypt names)
    let matchedPatients = [];
    try {
      const { data } = await supabase
        .from('patients')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) {
        for (const p of data) {
          const decrypted = decryptPHI(p.name);
          if (decrypted.toLowerCase().includes(term)) {
            matchedPatients.push({ id: p.id, name: decrypted });
            if (matchedPatients.length >= MAX_PER_CATEGORY) break;
          }
        }
      }
    } catch (err) {
      console.error('GlobalSearch patient error:', err);
    }

    // Search templates (from supabase)
    let matchedTemplates = [];
    try {
      const { data } = await supabase
        .from('treatment_templates')
        .select('id, name, diagnosis')
        .order('name');

      if (data) {
        for (const t of data) {
          if (
            (t.name || '').toLowerCase().includes(term) ||
            (t.diagnosis || '').toLowerCase().includes(term)
          ) {
            matchedTemplates.push({ id: t.id, name: t.name, diagnosis: t.diagnosis });
            if (matchedTemplates.length >= MAX_PER_CATEGORY) break;
          }
        }
      }
    } catch (err) {
      console.error('GlobalSearch template error:', err);
    }

    setResults({
      patients: matchedPatients,
      codes: matchedCodes,
      templates: matchedTemplates,
      payers: matchedPayers,
    });
    setSearching(false);
  }, [codeLabels, payers]);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults({ patients: [], codes: [], templates: [], payers: [] });
      return;
    }
    timerRef.current = setTimeout(() => performSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [query, performSearch]);

  if (!isOpen) return null;

  const hasResults =
    results.patients.length > 0 ||
    results.codes.length > 0 ||
    results.templates.length > 0 ||
    results.payers.length > 0;

  const handleSelect = (tabKey, context) => {
    onClose();
    onNavigate(tabKey, context);
  };

  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div className="global-search-container" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          className="global-search-input"
          placeholder="Search patients, codes, templates, payers…  (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* Results */}
        <div className="global-search-results">
          {searching && (
            <div className="global-search-empty">Searching…</div>
          )}

          {!searching && query.trim() && !hasResults && (
            <div className="global-search-empty">No results</div>
          )}

          {!searching && hasResults && (
            <>
              {results.patients.length > 0 && (
                <div className="global-search-group">
                  <div className="global-search-header">Patients</div>
                  {results.patients.map((p) => (
                    <div
                      key={`patient-${p.id}`}
                      className="global-search-item"
                      onClick={() => handleSelect('patients', { patientName: p.name })}
                    >
                      <span className="global-search-icon">👤</span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.codes.length > 0 && (
                <div className="global-search-group">
                  <div className="global-search-header">Codes</div>
                  {results.codes.map((c) => (
                    <div
                      key={`code-${c.code}`}
                      className="global-search-item"
                      onClick={() => handleSelect('calc', { code: c.code })}
                    >
                      <span className="global-search-icon">📋</span>
                      <span><strong>{c.code}</strong> — {c.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.templates.length > 0 && (
                <div className="global-search-group">
                  <div className="global-search-header">Templates</div>
                  {results.templates.map((t) => (
                    <div
                      key={`template-${t.id}`}
                      className="global-search-item"
                      onClick={() => handleSelect('templates', { templateName: t.name })}
                    >
                      <span className="global-search-icon">📄</span>
                      <span>{t.name}{t.diagnosis ? ` — ${t.diagnosis}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {results.payers.length > 0 && (
                <div className="global-search-group">
                  <div className="global-search-header">Payers</div>
                  {results.payers.map((p, i) => (
                    <div
                      key={`payer-${i}`}
                      className="global-search-item"
                      onClick={() => handleSelect('calc', { payer: p.name })}
                    >
                      <span className="global-search-icon">🏥</span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .global-search-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
        }

        .global-search-container {
          max-width: 600px;
          width: 90%;
          max-height: 70vh;
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .global-search-input {
          font-size: 18px;
          border: none;
          border-bottom: 1.5px solid #e5e7eb;
          padding: 20px;
          width: 100%;
          outline: none;
          background: #fff;
          color: #1a1a1a;
          box-sizing: border-box;
        }

        .global-search-input::placeholder {
          color: #9ca3af;
        }

        .global-search-results {
          overflow-y: auto;
          padding: 8px;
          flex: 1;
        }

        .global-search-group {
          margin-bottom: 4px;
        }

        .global-search-header {
          padding: 12px 16px 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
        }

        .global-search-item {
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #1a1a1a;
          transition: background 0.1s;
        }

        .global-search-item:hover {
          background: #f3f4f6;
        }

        .global-search-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .global-search-empty {
          padding: 24px 16px;
          text-align: center;
          color: #9ca3af;
          font-size: 14px;
        }

        /* Dark mode */
        [data-theme="dark"] .global-search-container {
          background: #2a2a2a;
        }

        [data-theme="dark"] .global-search-input {
          background: #2a2a2a;
          color: #e5e7eb;
          border-bottom-color: #444;
        }

        [data-theme="dark"] .global-search-input::placeholder {
          color: #6b7280;
        }

        [data-theme="dark"] .global-search-header {
          color: #9ca3af;
        }

        [data-theme="dark"] .global-search-item {
          color: #e5e7eb;
        }

        [data-theme="dark"] .global-search-item:hover {
          background: #333;
        }

        [data-theme="dark"] .global-search-empty {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
