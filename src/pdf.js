// Gera o relatório em PDF no próprio celular e abre a lista de apps para enviar (WhatsApp).
// Se o aparelho não deixar compartilhar arquivo, baixa o PDF.
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { dataCurta, hojeISO } from './datas.js';
import { ordenar } from './relatorio.js';

const pct = (n) => (n == null ? '-' : `${Math.round(n * 100)}%`);
const SITUACAO = { vermelho: 'Chegou ao limite', amarelo: 'Com faltas', '': 'Sem faltas' };
// Cores da linha: verde sem faltas, amarelo de 1 a 3, vermelho quando chega ao limite.
// Quem ainda não tem nenhuma marcação fica sem cor.
const FUNDO = { vermelho: [255, 214, 214], amarelo: [255, 241, 184], verde: [220, 245, 228] };
const FAIXA = { vermelho: [198, 40, 40], amarelo: [224, 177, 0], verde: [21, 128, 61], nada: [200, 204, 212] };
const TEXTO = { vermelho: [176, 24, 24], amarelo: [140, 98, 0], verde: [21, 110, 52] };
const corPDF = (l) => l.cor || (l.presente + l.justificada > 0 ? 'verde' : 'nada');
const situacao = (l) => (corPDF(l) === 'nada' ? 'Sem marcação' : SITUACAO[l.cor]);

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
    body: linhas.map((l) => [l.nome, l.presente, l.falta, l.justificada, pct(l.freq), situacao(l)]),
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: { top: 2, bottom: 2, left: 2, right: 2 }, lineColor: [225, 228, 234], lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: [20, 33, 61], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellPadding: { top: 2, bottom: 2, left: 4, right: 2 } },
      1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' },
    },
    didParseCell: (c) => {
      if (c.section !== 'body') return;
      const cor = corPDF(linhas[c.row.index]);
      if (FUNDO[cor]) c.cell.styles.fillColor = FUNDO[cor];
      // Faltas e situação em destaque, na cor da linha
      if (TEXTO[cor] && (c.column.index === 2 || c.column.index === 5)) {
        c.cell.styles.textColor = TEXTO[cor];
        c.cell.styles.fontStyle = 'bold';
      }
    },
    // Faixa colorida na esquerda de cada linha, igual no site
    didDrawCell: (c) => {
      if (c.section !== 'body' || c.column.index !== 0) return;
      doc.setFillColor(...FAIXA[corPDF(linhas[c.row.index])]);
      doc.rect(c.cell.x, c.cell.y, 1.6, c.cell.height, 'F');
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
