// Gera o relatório em PDF no próprio celular e abre a lista de apps para enviar (WhatsApp).
// Se o aparelho não deixar compartilhar arquivo, baixa o PDF.
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { dataCurta, hojeISO } from './datas.js';
import { ordenar } from './relatorio.js';

const pct = (n) => (n == null ? '-' : `${Math.round(n * 100)}%`);
const SITUACAO = { vermelho: 'Chegou ao limite', amarelo: 'Com faltas', '': 'Sem faltas' };
const FUNDO = { vermelho: [255, 222, 222], amarelo: [255, 246, 204] };

export function montarPDF(rel, titulo) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const linhas = ordenar(rel.linhas, 'nome');
  const { resumo } = rel;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Projeto MCC Jiu-jitsu', 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Relatório de frequência - ${titulo}`, 14, 23);
  doc.text(`${dataCurta(rel.inicio)} a ${dataCurta(rel.fim)} · limite de ${rel.limite} faltas`, 14, 29);
  doc.text(`${resumo.aulas} aulas dadas · ${resumo.ativos} alunos · frequência média ${pct(resumo.freqGeral)}`, 14, 36);
  doc.text(`${resumo.vermelhos} no limite · ${resumo.amarelos} com faltas · ${resumo.semFaltas} sem faltas`, 14, 42);

  autoTable(doc, {
    startY: 48,
    head: [['Aluno', 'Presenças', 'Faltas', 'Justif.', 'Frequência', 'Situação']],
    body: linhas.map((l) => [l.nome, l.presente, l.falta, l.justificada, pct(l.freq), SITUACAO[l.cor]]),
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [20, 33, 61] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
    didParseCell: (c) => {
      if (c.section === 'body' && FUNDO[linhas[c.row.index].cor]) c.cell.styles.fillColor = FUNDO[linhas[c.row.index].cor];
    },
  });

  // Faltas justificadas com o motivo
  const justificadas = linhas.flatMap((l) => l.historico
    .filter((h) => h.status === 'justificada')
    .map((h) => [l.nome, dataCurta(h.data), h.motivo || '-']));
  if (justificadas.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Falta justificada', 'Data', 'Motivo']],
      body: justificadas,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
    });
  }

  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Gerado em ${dataCurta(hojeISO())}. Falta justificada não conta no limite.`, 14, 290);
  return doc;
}

// Devolve 'enviado', 'cancelado' ou 'baixado'
export async function enviarRelatorioPDF(rel, titulo) {
  const doc = montarPDF(rel, titulo);
  const nome = `relatorio-${rel.inicio}-a-${rel.fim}.pdf`;
  const blob = doc.output('blob');
  const arquivo = new File([blob], nome, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: `Relatório ${titulo}` });
      return 'enviado';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelado';
      console.error(e);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'baixado';
}
