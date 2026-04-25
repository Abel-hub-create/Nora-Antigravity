import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Layers, Brain, Calendar, Trash2, Loader2, AlertCircle, ChevronLeft, ChevronRight, Printer, Share2, PenLine, Check, X } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as syntheseService from '../services/syntheseService';
import useActiveTimer from '../hooks/useActiveTimer';
import { useAuth } from '../features/auth/hooks/useAuth';
import { formatMath } from '../utils/formatMath';
import { PremiumGate, usePremiumGate } from '../components/UI/PremiumGate';
import ShareModal from '../components/Synthese/ShareModal';

const SECTION_EMOJIS = {
    définitions: '📖', definitions: '📖', vocabulaire: '📖', lexique: '📖',
    tableaux: '📊', tableau: '📊', données: '📊', statistiques: '📊', chiffres: '📊',
    méthodes: '🔧', methodes: '🔧', méthode: '🔧', technique: '🔧', procédé: '🔧',
    exemples: '💡', exemple: '💡', application: '💡', exercice: '💡',
    formules: '🧮', calculs: '🧮', calcul: '🧮', équation: '🧮', algorithme: '🧮',
    conclusion: '🎯', bilan: '🎯', synthèse: '🎯',
    introduction: '🚀', contexte: '🚀', présentation: '🚀',
    histoire: '🏛️', historique: '🏛️', chronologie: '🏛️', période: '🏛️', siècle: '🏛️',
    biologie: '🧬', cellule: '🧬', organisme: '🧬', gène: '🧬', ADN: '🧬',
    chimie: '🧪', réaction: '🧪', molécule: '🧪', atome: '🧪', composé: '🧪',
    physique: '⚡', énergie: '⚡', force: '⚡', lumière: '⚡', électricité: '⚡',
    géographie: '🌍', continent: '🌍', territoire: '🌍', carte: '🌍', région: '🌍',
    économie: '💰', marché: '💰', budget: '💰', prix: '💰', monnaie: '💰',
    guerre: '⚔️', conflit: '⚔️', bataille: '⚔️', armée: '⚔️',
    politique: '🏛️', gouvernement: '🏛️', état: '🏛️', loi: '🏛️',
    science: '🔬', recherche: '🔬', expérience: '🔬', observation: '🔬',
    math: '📐', algèbre: '📐', géométrie: '📐', fonction: '📐', vecteur: '📐',
    littérature: '📜', texte: '📜', auteur: '📜', roman: '📜', poème: '📜',
    philosophie: '🤔', pensée: '🤔', concept: '🤔', théorie: '🤔',
    propriété: '✅', caractéristique: '✅', avantage: '✅', inconvénient: '❌',
    attention: '⚠️', important: '⚠️', remarque: '⚠️', note: '📝',
    résumé: '✏️', rappel: '✏️',
};

const getSectionEmoji = (title) => {
    const lower = title.toLowerCase();
    for (const [key, emoji] of Object.entries(SECTION_EMOJIS)) {
        if (lower.includes(key)) return emoji;
    }
    return '🔹';
};

// Convertit le markdown en éléments React pour l'affichage
const renderMarkdown = (text) => {
    if (!text) return null;
    text = formatMath(text);
    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    const parseBold = (str) => {
        const parts = str.split(/\*\*(.+?)\*\*/g);
        return parts.map((part, idx) =>
            idx % 2 === 1
                ? <strong key={idx} className="text-text-main font-semibold">{part}</strong>
                : part
        );
    };

    while (i < lines.length) {
        const line = lines[i];

        // H2
        if (line.startsWith('## ')) {
            const title = line.slice(3).trim();
            const emoji = getSectionEmoji(title);
            elements.push(
                <div key={i} className={`${i > 0 ? 'mt-5' : ''} mb-2`}>
                    <h2 className="text-base font-bold text-text-main border-b border-white/10 pb-1">
                        {emoji} {title}
                    </h2>
                </div>
            );
        }
        // H3
        else if (line.startsWith('### ')) {
            const title = line.slice(4).trim();
            elements.push(
                <div key={i} className="mt-3 mb-1">
                    <h3 className="text-sm font-semibold text-primary/90">{title}</h3>
                </div>
            );
        }
        // Table row
        else if (line.startsWith('|') && line.endsWith('|')) {
            // Collect all table rows
            const tableRows = [];
            let j = i;
            while (j < lines.length && lines[j].startsWith('|')) {
                tableRows.push(lines[j]);
                j++;
            }
            const headers = tableRows[0].split('|').filter(c => c.trim() !== '').map(c => c.trim());
            const dataRows = tableRows.slice(2).map(r => r.split('|').filter(c => c.trim() !== '').map(c => c.trim()));
            elements.push(
                <div key={i} className="my-3 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr>
                                {headers.map((h, hi) => (
                                    <th key={hi} className="text-left px-2 py-1.5 bg-primary/10 text-primary font-semibold border border-white/10">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dataRows.map((row, ri) => (
                                <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-white/3'}>
                                    {row.map((cell, ci) => (
                                        <td key={ci} className="px-2 py-1.5 text-text-muted border border-white/10">{parseBold(cell)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            i = j;
            continue;
        }
        // Bullet
        else if (line.match(/^[-*] /)) {
            const content = line.slice(2).trim();
            elements.push(
                <div key={i} className="flex gap-2 text-sm text-text-muted leading-relaxed ml-1">
                    <span className="shrink-0 text-primary/60 mt-0.5">•</span>
                    <span>{parseBold(content)}</span>
                </div>
            );
        }
        // Empty line
        else if (line.trim() === '') {
            elements.push(<div key={i} className="h-2" />);
        }
        // Normal paragraph
        else {
            elements.push(
                <p key={i} className="text-sm text-text-muted leading-relaxed">
                    {parseBold(line)}
                </p>
            );
        }
        i++;
    }
    return elements;
};

// Convertit le markdown en HTML avec les classes de la template d'impression
const markdownToPrintHtml = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    let inBlock = false;
    let tableLines = [];
    let inTable = false;

    const fmt = s => s
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<em>$1</em>');

    const flushTable = () => {
        if (!tableLines.length) return;
        const [header, , ...rows] = tableLines;
        const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
        const trs = rows.filter(r => r.trim() && !r.match(/^[|\s-]+$/)).map(r => {
            const tds = r.split('|').filter(c => c.trim()).map(c => `<td>${fmt(c.trim())}</td>`).join('');
            return `<tr>${tds}</tr>`;
        }).join('');
        html += `<div class="md-table-wrapper"><table class="md-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
        tableLines = []; inTable = false;
    };

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('|')) {
            if (inList) { html += '</ul>'; inList = false; }
            inTable = true; tableLines.push(trimmed); continue;
        }
        if (inTable) flushTable();

        if (trimmed === '') {
            if (inList) { html += '</ul>'; inList = false; }
            if (inBlock) { html += '</div>'; inBlock = false; }
            continue;
        }
        if (trimmed.startsWith('## ')) {
            if (inList) { html += '</ul>'; inList = false; }
            if (inBlock) { html += '</div>'; inBlock = false; }
            html += `<div class="cours-block"><div class="cours-block-title">${fmt(trimmed.slice(3).trim())}</div>`;
            inBlock = true; continue;
        }
        if (trimmed.startsWith('### ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<div class="cours-block-title" style="font-size:13px;border-left-color:#6366f1;margin-top:10px;">${fmt(trimmed.slice(4).trim())}</div>`;
            continue;
        }
        if (trimmed.match(/^[-*] /)) {
            const isIndented = line.startsWith('  ') || line.startsWith('\t');
            if (!inList) { html += '<ul class="cours-list">'; inList = true; }
            html += `<li${isIndented ? ' class="sub"' : ''}>${fmt(trimmed.slice(2).trim())}</li>`;
            continue;
        }
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p class="md-paragraph" style="margin-bottom:6px;">${fmt(trimmed)}</p>`;
    }

    if (inTable) flushTable();
    if (inList) html += '</ul>';
    if (inBlock) html += '</div>';
    return html;
};

// Mapping des matières avec leurs icônes
const SUBJECT_ICONS = {
    mathematics: '📐',
    french: '📚',
    physics: '⚡',
    chemistry: '🧪',
    biology: '🧬',
    history: '🏛️',
    geography: '🌍',
    english: '📖',
    dutch: '🌷'
};

// Nombre de caractères par page pour la pagination
const CHARS_PER_PAGE = 2000;

const StudyDetail = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { gateProps, showGate } = usePremiumGate();
    // Track time spent reading the summary
    useActiveTimer('summary');
    const { id } = useParams();
    const navigate = useNavigate();
    const [synthese, setSynthese] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    // Mode édition contenu synthèse (premium/school)
    const canEdit = user?.plan_type === 'premium' || user?.plan_type === 'school';
    const [isEditingContent, setIsEditingContent] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [isSavingContent, setIsSavingContent] = useState(false);
    const contentEditRef = useRef(null);

    useEffect(() => {
        if (isEditingContent && contentEditRef.current) {
            contentEditRef.current.innerText = editedContent;
            contentEditRef.current.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(contentEditRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }, [isEditingContent]);

    // Diviser la synthèse en pages
    const summaryPages = useMemo(() => {
        if (!synthese?.summary_content) return [];
        const content = synthese.summary_content;
        if (content.length <= CHARS_PER_PAGE) return [content];

        const pages = [];
        let start = 0;
        while (start < content.length) {
            let end = start + CHARS_PER_PAGE;
            // Chercher la fin de paragraphe ou de phrase la plus proche
            if (end < content.length) {
                const paragraphEnd = content.lastIndexOf('\n\n', end);
                const sentenceEnd = content.lastIndexOf('. ', end);
                if (paragraphEnd > start + CHARS_PER_PAGE * 0.7) {
                    end = paragraphEnd + 2;
                } else if (sentenceEnd > start + CHARS_PER_PAGE * 0.7) {
                    end = sentenceEnd + 2;
                }
            }
            pages.push(content.slice(start, end).trim());
            start = end;
        }
        return pages;
    }, [synthese?.summary_content]);

    const totalPages = summaryPages.length;
    const hasMultiplePages = totalPages > 1;

    useEffect(() => {
        const loadSynthese = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await syntheseService.getSynthese(id);
                setSynthese(data);
            } catch (err) {
                setError(t('studyDetail.loadError'));
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadSynthese();
    }, [id, t]);

    const handleDelete = async () => {
        try {
            await syntheseService.deleteSynthese(id);
            navigate('/study');
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    const handleEditContent = () => {
        setEditedContent(synthese.summary_content || '');
        setIsEditingContent(true);
        setCurrentPage(0);
    };

    const handleSaveContent = async () => {
        if (!editedContent.trim()) return;
        setIsSavingContent(true);
        try {
            await syntheseService.updateContent(id, editedContent.trim());
            setSynthese(prev => ({ ...prev, summary_content: editedContent.trim() }));
            setIsEditingContent(false);
        } catch (err) {
            console.error('Error saving content:', err);
        } finally {
            setIsSavingContent(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const localeMap = {
            fr: 'fr-FR',
            en: 'en-US'
        };
        const locale = localeMap[i18n.language] || 'en-US';
        return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const subjectLabel = synthese.subject ? t(`subjects.${synthese.subject}`) : '';
        const dateStr = formatDate(synthese.created_at);
        const level = user?.level ?? '—';
        const contentHtml = markdownToPrintHtml(synthese.summary_content);

        printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${synthese.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--sky:#38bdf8;--sky-light:#e0f5ff;--sky-dark:#0284c7;--indigo:#6366f1;--indigo-light:#eef2ff;--ink:#0c1828;--body:#2d3f55;--muted:#64748b;--subtle:#94a3b8;--rule:#e2e8f0;--surface:#f8fafc;}
body{background:#020408;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:40px 24px 60px;font-family:'DM Sans',sans-serif;}
.page{width:794px;background:#fff;box-shadow:0 32px 96px rgba(0,0,0,0.7),0 0 0 1px rgba(56,189,248,0.08);position:relative;overflow:hidden;}
.page::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#38bdf8 0%,#6366f1 55%,transparent 100%);}
.page::after{content:'N';position:absolute;bottom:-30px;right:-15px;font-family:'Fraunces',serif;font-size:280px;font-weight:700;color:rgba(56,189,248,0.035);line-height:1;pointer-events:none;user-select:none;}
.page-inner{padding:40px 48px 48px;position:relative;z-index:1;}
.header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:24px;border-bottom:1px solid var(--rule);margin-bottom:32px;}
.header-left{display:flex;flex-direction:column;gap:10px;flex:1;}
.nora-mark{display:flex;align-items:center;gap:7px;}
.nora-mark-icon{width:22px;height:22px;background:linear-gradient(135deg,#38bdf8,#6366f1);border-radius:6px;display:flex;align-items:center;justify-content:center;}
.nora-mark-icon span{font-family:'Fraunces',serif;font-size:12px;font-weight:700;color:white;line-height:1;}
.nora-mark-text{font-size:11px;font-weight:600;color:var(--subtle);letter-spacing:0.14em;text-transform:uppercase;}
.doc-subject{display:inline-flex;align-items:center;background:var(--sky-light);color:var(--sky-dark);font-size:10.5px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:4px 10px;border-radius:4px;width:fit-content;}
.doc-title{font-family:'Fraunces',serif;font-size:28px;font-weight:700;color:var(--ink);line-height:1.2;max-width:440px;margin-top:4px;}
.doc-subtitle{font-size:13px;color:var(--muted);font-weight:400;margin-top:2px;}
.header-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;padding-top:4px;min-width:140px;}
.meta-item{display:flex;flex-direction:column;align-items:flex-end;gap:1px;}
.meta-label{font-size:9.5px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--subtle);}
.meta-value{font-size:12px;font-weight:500;color:var(--body);}
.meta-divider{width:1px;height:16px;background:var(--rule);}
.section{margin-bottom:30px;}
.section-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.section-icon{width:26px;height:26px;border-radius:7px;background:var(--sky-light);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.section-icon svg{width:13px;height:13px;color:var(--sky-dark);}
.section-title{font-family:'Fraunces',serif;font-size:13px;font-weight:700;color:var(--ink);letter-spacing:0.01em;text-transform:uppercase;}
.section-line{flex:1;height:1px;background:var(--rule);}
.cours-block{margin-bottom:18px;}
.cours-block-title{font-family:'Fraunces',serif;font-size:15px;font-weight:500;font-style:italic;color:var(--ink);margin-bottom:8px;padding-left:13px;border-left:2.5px solid var(--sky);}
.cours-list{list-style:none;display:flex;flex-direction:column;gap:5px;}
.cours-list li{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:var(--body);line-height:1.65;}
.cours-list li::before{content:'';width:5px;height:5px;background:var(--sky);border-radius:50%;margin-top:7px;flex-shrink:0;}
.cours-list li.sub{padding-left:18px;color:var(--muted);font-size:12.5px;}
.cours-list li.sub::before{background:var(--rule);width:4px;height:4px;}
.cours-list li strong{font-weight:600;color:var(--ink);}
.md-paragraph{font-size:13px;color:var(--body);line-height:1.75;}
.md-table-wrapper{border:1px solid var(--rule);border-radius:9px;overflow:hidden;margin-bottom:8px;}
.md-table{width:100%;border-collapse:collapse;font-size:12.5px;}
.md-table thead tr{background:var(--ink);}
.md-table thead th{padding:9px 14px;color:rgba(255,255,255,0.85);font-weight:600;font-size:11.5px;letter-spacing:0.04em;text-align:left;border-right:1px solid rgba(255,255,255,0.08);}
.md-table thead th:first-child{color:var(--sky);}
.md-table thead th:last-child{border-right:none;}
.md-table tbody tr{border-bottom:1px solid var(--rule);}
.md-table tbody tr:last-child{border-bottom:none;}
.md-table tbody tr:nth-child(even){background:var(--surface);}
.md-table tbody td{padding:8px 14px;color:var(--body);border-right:1px solid var(--rule);line-height:1.5;}
.md-table tbody td:first-child{font-weight:500;color:var(--ink);}
.md-table tbody td:last-child{border-right:none;}
.notes-lines{display:flex;flex-direction:column;}
.notes-line{height:30px;border-bottom:1px solid var(--rule);}
.page-footer{margin-top:36px;padding-top:16px;border-top:1px solid var(--rule);display:flex;align-items:center;justify-content:space-between;}
.footer-left{font-size:10px;color:var(--subtle);display:flex;align-items:center;gap:6px;}
.footer-brand{display:flex;align-items:center;gap:4px;}
.footer-brand-dot{width:6px;height:6px;background:linear-gradient(135deg,#38bdf8,#6366f1);border-radius:2px;}
.footer-brand-name{font-size:10px;font-weight:600;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;}
.footer-right{font-size:10px;color:var(--subtle);}
.toolbar{width:794px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.toolbar-label{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#38bdf8;letter-spacing:0.12em;text-transform:uppercase;}
.print-btn{display:flex;align-items:center;gap:8px;background:transparent;border:1px solid rgba(56,189,248,0.35);color:#38bdf8;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;padding:8px 18px;border-radius:8px;cursor:pointer;transition:all 0.2s;}
.print-btn:hover{background:rgba(56,189,248,0.08);border-color:rgba(56,189,248,0.6);}
.print-btn svg{width:15px;height:15px;}
@media print{
  @page{size:A4;margin:12mm 14mm;}
  body{background:white;padding:0;display:block;}
  .toolbar{display:none;}
  .page{width:100%;box-shadow:none;}
  .page::before,.md-table thead,.doc-subject{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
  .page::after{display:none;}
  .section{page-break-inside:avoid;}
}
</style>
</head>
<body>
<div class="toolbar">
  <span class="toolbar-label">Nora · Synthèse</span>
  <button class="print-btn" onclick="window.print()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>
    Imprimer
  </button>
</div>
<div class="page"><div class="page-inner">
  <div class="header">
    <div class="header-left">
      <div class="nora-mark">
        <div class="nora-mark-icon"><span>N</span></div>
        <span class="nora-mark-text">Nora · Synthèse</span>
      </div>
      ${subjectLabel ? `<div class="doc-subject">${subjectLabel}</div>` : ''}
      <h1 class="doc-title">${synthese.title}</h1>
    </div>
    <div class="header-right">
      <div class="meta-item">
        <span class="meta-label">Date</span>
        <span class="meta-value">${dateStr}</span>
      </div>
      <div class="meta-divider"></div>
      <div class="meta-item">
        <span class="meta-label">Niveau</span>
        <span class="meta-value">Lvl ${level}</span>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-header">
      <div class="section-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </div>
      <span class="section-title">Cours synthétisé</span>
      <div class="section-line"></div>
    </div>
    ${contentHtml}
  </div>
  <div class="section">
    <div class="section-header">
      <div class="section-icon" style="background:#f1f5f9;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      </div>
      <span class="section-title">Notes personnelles</span>
      <div class="section-line"></div>
    </div>
    <div class="notes-lines">
      <div class="notes-line"></div><div class="notes-line"></div>
      <div class="notes-line"></div><div class="notes-line"></div>
      <div class="notes-line"></div><div class="notes-line"></div>
    </div>
  </div>
  <div class="page-footer">
    <div class="footer-left">
      <div class="footer-brand">
        <div class="footer-brand-dot"></div>
        <span class="footer-brand-name">Nora</span>
      </div>
      <span style="color:#e2e8f0;">·</span>
      <span>Synthèse générée par IA — à vérifier avec ton cours</span>
    </div>
    <div class="footer-right">${dateStr}</div>
  </div>
</div></div>
</body></html>`);
        printWindow.document.close();
        printWindow.print();
    };

    if (isLoading) {
        return (
            <div className="min-h-full bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin text-primary mx-auto mb-3" size={32} />
                    <p className="text-text-muted">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    if (error || !synthese) {
        return (
            <div className="min-h-full bg-background p-6">
                <Link to="/study" className="inline-flex items-center gap-2 text-text-muted hover:text-text-main mb-6">
                    <ArrowLeft size={20} />
                    {t('common.back')}
                </Link>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="text-error mb-3" size={40} />
                    <p className="text-text-muted">{error || t('study.notFound')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-background p-4 pb-24">
            {/* Header */}
            <header className="flex items-center gap-3 mb-6">
                <Link
                    to="/study"
                    className="p-2 -ml-2 text-text-muted hover:text-text-main hover:bg-surface rounded-xl transition-colors"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-text-main truncate">
                        {synthese.title}
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        {synthese.subject && (
                            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded-lg">
                                <span className="text-sm">{SUBJECT_ICONS[synthese.subject] || '📝'}</span>
                                <span className="text-xs font-medium">{t(`subjects.${synthese.subject}`)}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-text-muted" />
                            <span className="text-xs text-text-muted">
                                {formatDate(synthese.created_at)}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Action Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3 mb-6"
            >
                {user?.plan_limits?.has_flashcards !== 0 ? (
                    <Link
                        to={`/study/${id}/flashcards`}
                        className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                    >
                        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                            <Layers className="text-primary" size={24} />
                        </div>
                        <span className="font-medium text-text-main">{t('study.flashcardsButton')}</span>
                        <span className="text-xs text-text-muted">
                            {synthese.flashcards?.length || 0} {t('common.cards')}
                        </span>
                    </Link>
                ) : (
                    <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 opacity-50 cursor-pointer" onClick={() => showGate(t('premiumGate.features.flashcards'), t('premiumGate.features.flashcardsDesc'))}>
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                            <Layers className="text-text-muted" size={24} />
                        </div>
                        <span className="font-medium text-text-muted">{t('study.flashcardsButton')}</span>
                        <span className="text-xs text-text-muted">{t('studyDetail.premiumLabel')}</span>
                    </div>
                )}

                {user?.plan_limits?.has_quiz !== 0 ? (
                    <Link
                        to={`/study/${id}/quiz`}
                        className="bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
                    >
                        <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                            <Brain className="text-secondary" size={24} />
                        </div>
                        <span className="font-medium text-text-main">{t('study.quizButton')}</span>
                        <span className="text-xs text-text-muted">
                            {synthese.quizQuestions?.length || 0} {t('common.questions')}
                        </span>
                    </Link>
                ) : (
                    <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 opacity-50 cursor-pointer" onClick={() => showGate(t('premiumGate.features.quiz'), t('premiumGate.features.quizDesc'))}>
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                            <Brain className="text-text-muted" size={24} />
                        </div>
                        <span className="font-medium text-text-muted">{t('study.quizButton')}</span>
                        <span className="text-xs text-text-muted">{t('studyDetail.premiumLabel')}</span>
                    </div>
                )}
            </motion.div>

            {/* Summary Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface rounded-2xl border border-white/5 p-5 mb-6 relative overflow-visible"
            >
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-text-main">{t('studyDetail.summary')}</h2>
                    <div className="flex items-center gap-2">
                        {!isEditingContent && hasMultiplePages && (
                            <span className="text-xs text-text-muted">
                                {currentPage + 1} / {totalPages}
                            </span>
                        )}
                        {canEdit && !isEditingContent && (
                            <button
                                onClick={handleEditContent}
                                className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title={t('studyDetail.editContent')}
                            >
                                <PenLine size={16} />
                            </button>
                        )}
                        {isEditingContent && (
                            <>
                                <button
                                    onClick={() => setIsEditingContent(false)}
                                    className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                                >
                                    <X size={16} />
                                </button>
                                <button
                                    onClick={handleSaveContent}
                                    disabled={isSavingContent}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50"
                                >
                                    {isSavingContent ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                    {t('common.save')}
                                </button>
                            </>
                        )}
                        {!isEditingContent && user?.plan_limits?.has_share ? (
                            <button
                                onClick={() => setShowShare(true)}
                                className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Partager la synthèse"
                            >
                                <Share2 size={18} />
                            </button>
                        ) : null}
                        {!isEditingContent && (
                            <button
                                onClick={handlePrint}
                                className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title={t('studyDetail.print')}
                            >
                                <Printer size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative overflow-visible">
                    {/* Mode édition inline (contenteditable) */}
                    {isEditingContent ? (
                        <div
                            ref={contentEditRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={e => setEditedContent(e.currentTarget.innerText)}
                            spellCheck={false}
                            className="w-full min-h-[320px] p-3 text-sm text-text-main font-mono focus:outline-none whitespace-pre-wrap rounded-xl border border-primary/40 focus:border-primary"
                            style={{ wordBreak: 'break-word', cursor: 'text', outline: 'none' }}
                        />
                    ) : (
                    <>
                    {/* Contenu de la synthèse */}
                    <div className="flex flex-col gap-0.5">
                        {renderMarkdown(summaryPages[currentPage] || synthese.summary_content)}
                    </div>

                    {/* Boutons de navigation */}
                    {hasMultiplePages && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                    currentPage === 0
                                        ? 'text-text-muted/30 cursor-not-allowed'
                                        : 'text-primary bg-primary/10 hover:bg-primary/20'
                                }`}
                            >
                                <ChevronLeft size={18} />
                                <span className="text-sm">{t('common.previous')}</span>
                            </button>

                            {/* Indicateurs de page */}
                            <div className="flex gap-1.5">
                                {summaryPages.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentPage(idx)}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                            idx === currentPage ? 'bg-primary' : 'bg-white/20 hover:bg-white/40'
                                        }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage === totalPages - 1}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                                    currentPage === totalPages - 1
                                        ? 'text-text-muted/30 cursor-not-allowed'
                                        : 'text-primary bg-primary/10 hover:bg-primary/20'
                                }`}
                            >
                                <span className="text-sm">{t('common.next')}</span>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                    </>
                    )}
                </div>
            </motion.div>

            {/* Delete Button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {showDeleteConfirm ? (
                    <div className="bg-error/10 border border-error/20 rounded-2xl p-4">
                        <p className="text-sm text-text-main mb-3">
                            {t('studyDetail.deleteConfirm')}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-2 bg-error text-white rounded-xl font-medium hover:bg-error/90 transition-colors"
                            >
                                {t('common.delete')}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2 bg-surface text-text-muted rounded-xl font-medium hover:bg-surface/80 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                ) : canEdit && (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-3 text-error/70 hover:text-error flex items-center justify-center gap-2 transition-colors"
                    >
                        <Trash2 size={18} />
                        <span className="text-sm">{t('studyDetail.deleteSynthesis')}</span>
                    </button>
                )}
            </motion.div>
            <PremiumGate {...gateProps} />
            {showShare && (
                <ShareModal
                    syntheseId={id}
                    syntheseTitle={synthese.title}
                    onClose={() => setShowShare(false)}
                />
            )}
        </div>
    );
};

export default StudyDetail;
