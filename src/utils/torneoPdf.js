/**
 * torneoPdf.js — genera un PDF descargable del torneo (posiciones, calendario,
 * goleadores). Carga jsPDF de forma diferida (dynamic import) para no inflar el
 * bundle principal.
 */
import { FASE_LABEL } from './torneos';

const ROJO = [229, 9, 20];
const GRIS = [120, 120, 120];

export async function generarPdfTorneo({ torneo, partidos, goleadores, posiciones, equiposById, esLlave, canchasById = {}, campeon }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const nombreEq = (id) => (id ? (equiposById[id]?.nombre || 'Equipo') : 'Por definir');

  // ── Encabezado ──
  doc.setFillColor(...ROJO);
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(torneo.nombre || 'Torneo', 14, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const sub = [torneo.tipo, torneo.categoria, torneo.fecha_inicio ? `Inicio: ${torneo.fecha_inicio}` : null].filter(Boolean).join('  ·  ');
  doc.text(sub, 14, 20);

  let y = 34;
  doc.setTextColor(30, 30, 30);
  if (torneo.premio) { doc.setFontSize(11); doc.text(`Premio: ${torneo.premio}`, 14, y); y += 7; }
  if (campeon) {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...ROJO);
    doc.setFontSize(13); doc.text(`Campeon: ${campeon.nombre}`, 14, y);
    doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); y += 8;
  }

  // ── Tabla de posiciones (liga/grupos) ──
  if (!esLlave && posiciones && posiciones.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Tabla de posiciones', 14, y); y += 2;
    autoTable(doc, {
      startY: y + 2,
      head: [['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts']],
      body: posiciones.map((r, i) => [i + 1, r.equipo.nombre, r.pj, r.pg, r.pe, r.pp, r.gf, r.gc, r.dg, r.pts]),
      theme: 'striped',
      headStyles: { fillColor: ROJO, halign: 'center' },
      columnStyles: { 0: { halign: 'center' }, 1: { cellWidth: 'auto' }, 9: { fontStyle: 'bold' } },
      bodyStyles: { halign: 'center' },
      styles: { fontSize: 9 },
      didParseCell: (d) => { if (d.column.index === 1) d.cell.styles.halign = 'left'; },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Calendario / Resultados ──
  if (partidos && partidos.length) {
    const filas = partidos.map((p) => [
      esLlave ? (FASE_LABEL[p.fase] || `R${p.ronda}`) : `J${p.ronda}`,
      nombreEq(p.equipo_local_id),
      p.estado === 'jugado' ? `${p.goles_local ?? '-'} - ${p.goles_visitante ?? '-'}` : 'vs',
      nombreEq(p.equipo_visitante_id),
      p.fecha ? p.fecha + (p.hora ? ' ' + p.hora.slice(0, 5) : '') : '',
      p.cancha_id ? (canchasById[p.cancha_id] || '') : '',
    ]);
    if (y > 250) { doc.addPage(); y = 16; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Calendario y resultados', 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [['Fase', 'Local', 'Result.', 'Visitante', 'Fecha', 'Cancha']],
      body: filas,
      theme: 'grid',
      headStyles: { fillColor: ROJO },
      styles: { fontSize: 8.5 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center', fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Goleadores ──
  if (goleadores && goleadores.length) {
    if (y > 250) { doc.addPage(); y = 16; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Goleadores', 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [['#', 'Jugador', 'Equipo', 'Goles']],
      body: goleadores.map((g, i) => [i + 1, g.nombre, g.equipo?.nombre || '', g.goles]),
      theme: 'striped',
      headStyles: { fillColor: ROJO },
      styles: { fontSize: 9 },
      columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 3: { halign: 'center', fontStyle: 'bold' } },
    });
  }

  // ── Pie ──
  const pags = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pags; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(`PoliSport EPN  ·  Generado ${new Date().toLocaleDateString('es-EC')}`, 14, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Pag. ${i}/${pags}`, W - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }

  const slug = (torneo.nombre || 'torneo').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  doc.save(`${slug}.pdf`);
}
