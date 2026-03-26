import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, Pill, FileText, Plus, Trash2, Download, RotateCcw } from 'lucide-react';
import jsPDF from 'jspdf';

import { DoctorHeader } from './components/DoctorHeader';
import { PatientForm } from './components/PatientForm';
import { SignatureCanvas } from './components/SignatureCanvas';
import { DoctorInfo, PatientInfo, InvoiceItem, Medication } from './types';

type ActiveTab = 'invoice' | 'prescription' | 'bulletin';

const DEFAULT_DOCTOR: DoctorInfo = {
  name: 'Dr. ROKHAYA DIOP',
  specialty: 'Médecin généraliste',
  phone: '+221 774474590',
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const PAGE_MARGIN = 15;
const CONTENT_LIMIT_Y = 228;
const PDF_COLORS = {
  blue: [0, 66, 130] as const,
  green: [0, 166, 81] as const,
  black: [26, 26, 26] as const,
  lightBlue: [245, 252, 253] as const,
  rowAlt: [240, 250, 252] as const,
  lightBorder: [212, 228, 242] as const,
};

const createInitialPatient = (): PatientInfo => ({
  lastName: '',
  firstName: '',
  date: new Date().toISOString().split('T')[0],
  weight: '',
});

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('invoice');
  const [invoicePatientInfo, setInvoicePatientInfo] = useState<PatientInfo>(createInitialPatient);
  const [prescriptionPatientInfo, setPrescriptionPatientInfo] = useState<PatientInfo>(createInitialPatient);
  const [bulletinPatientInfo, setBulletinPatientInfo] = useState<PatientInfo>(createInitialPatient);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [bulletinItems, setBulletinItems] = useState<string[]>([]);
  const [bulletinDiagnosis, setBulletinDiagnosis] = useState('');
  const [invoiceSignature, setInvoiceSignature] = useState<string | null>(null);
  const [prescriptionSignature, setPrescriptionSignature] = useState<string | null>(null);
  const [bulletinSignature, setBulletinSignature] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const doctorInfo = DEFAULT_DOCTOR;

  const createId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return Math.random().toString(36).slice(2, 11);
  };

  const formatPatientDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return value;
    }

    return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
  };

  const getPosologyLabel = (key: string) => {
    if (key === 'morning') return 'le matin';
    if (key === 'noon') return 'le midi';
    if (key === 'evening') return 'le soir';
    return 'la nuit';
  };

  const getDocumentTypeLabel = () => {
    if (activeTab === 'invoice') return 'facture';
    if (activeTab === 'prescription') return 'ordonnance';
    return 'bulletin';
  };

  const getDocumentTitle = () => {
    if (activeTab === 'invoice') return 'Facture';
    if (activeTab === 'prescription') return 'Ordonnance';
    return 'Bulletin Médical';
  };

  const currentPatientInfo =
    activeTab === 'invoice'
      ? invoicePatientInfo
      : activeTab === 'prescription'
        ? prescriptionPatientInfo
        : bulletinPatientInfo;

  const currentSignature =
    activeTab === 'invoice'
      ? invoiceSignature
      : activeTab === 'prescription'
        ? prescriptionSignature
        : bulletinSignature;

  const updateActivePatientInfo = (info: PatientInfo) => {
    if (activeTab === 'invoice') {
      setInvoicePatientInfo(info);
      return;
    }

    if (activeTab === 'prescription') {
      setPrescriptionPatientInfo(info);
      return;
    }

    setBulletinPatientInfo(info);
  };

  const saveActiveSignature = (dataUrl: string) => {
    if (activeTab === 'invoice') {
      setInvoiceSignature(dataUrl);
      return;
    }

    if (activeTab === 'prescription') {
      setPrescriptionSignature(dataUrl);
      return;
    }

    setBulletinSignature(dataUrl);
  };

  const clearActiveSignature = () => {
    if (activeTab === 'invoice') {
      setInvoiceSignature(null);
      return;
    }

    if (activeTab === 'prescription') {
      setPrescriptionSignature(null);
      return;
    }

    setBulletinSignature(null);
  };

  const sanitizeFileSegment = (value: string, fallback: string) => {
    const cleaned = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
      .trim()
      .replace(/\s+/g, '_');

    return cleaned || fallback;
  };

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: createId(),
      description: '',
      quantity: 1,
      price: 0,
    };
    setInvoiceItems((items) => [...items, newItem]);
  };

  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setInvoiceItems((items) => items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeInvoiceItem = (id: string) => {
    setInvoiceItems((items) => items.filter((item) => item.id !== id));
  };

  const addMedication = () => {
    const newMed: Medication = {
      id: createId(),
      name: '',
      dosage: '',
      duration: '',
      posology: { morning: false, noon: false, evening: false, night: false },
    };
    setMedications((items) => [...items, newMed]);
  };

  const updateMedication = (id: string, field: string, value: string | boolean) => {
    setMedications((meds) => meds.map((med) => {
      if (med.id === id) {
        if (field.startsWith('posology.')) {
          const [, child] = field.split('.') as ['posology', keyof Medication['posology']];
          return { ...med, posology: { ...med.posology, [child]: Boolean(value) } };
        }
        return { ...med, [field]: value } as Medication;
      }
      return med;
    }));
  };

  const removeMedication = (id: string) => {
    setMedications((meds) => meds.filter((med) => med.id !== id));
  };

  const addBulletinItem = () => {
    setBulletinItems((items) => [...items, '']);
  };

  const updateBulletinItem = (index: number, value: string) => {
    const newItems = [...bulletinItems];
    newItems[index] = value;
    setBulletinItems(newItems);
  };

  const removeBulletinItem = (index: number) => {
    setBulletinItems(bulletinItems.filter((_, i) => i !== index));
  };

  const resetAll = () => {
    if (activeTab === 'invoice') {
      setInvoicePatientInfo(createInitialPatient());
      setInvoiceItems([]);
      setInvoiceSignature(null);
      return;
    }

    if (activeTab === 'prescription') {
      setPrescriptionPatientInfo(createInitialPatient());
      setMedications([]);
      setPrescriptionSignature(null);
      return;
    }

    setBulletinPatientInfo(createInitialPatient());
    setBulletinItems([]);
    setBulletinDiagnosis('');
    setBulletinSignature(null);
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
  };

  const buildFileName = () => {
    return [
      getDocumentTypeLabel(),
      sanitizeFileSegment(currentPatientInfo.lastName, 'nom'),
      sanitizeFileSegment(currentPatientInfo.firstName, 'prenom'),
      sanitizeFileSegment(currentPatientInfo.date || createInitialPatient().date, 'date'),
    ].join('_');
  };

  const buildPdf = () => {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const title = getDocumentTitle();

    const ensureSpace = (currentY: number, neededHeight: number, redraw?: () => number) => {
      if (currentY + neededHeight <= CONTENT_LIMIT_Y) {
        return currentY;
      }

      pdf.addPage();
      return redraw ? redraw() : currentY;
    };

    const addHeader = () => {
      pdf.setTextColor(...PDF_COLORS.blue);
      pdf.setDrawColor(...PDF_COLORS.blue);
      pdf.setLineWidth(0.5);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text(doctorInfo.name, PAGE_MARGIN, 20);

      pdf.setTextColor(...PDF_COLORS.green);
      pdf.setFontSize(14);
      pdf.text(doctorInfo.specialty, PAGE_MARGIN, 29);

      pdf.setTextColor(...PDF_COLORS.blue);
      pdf.setFontSize(15);
      pdf.text(doctorInfo.phone, PAGE_MARGIN, 38);

      pdf.line(100, 14, 100, 44);

      const labelX = 108;
      const valueX = 132;
      const lineEndX = 194;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('DATE :', labelX, 20);
      pdf.text('NOM :', labelX, 31);
      pdf.text('PRENOM :', PAGE_MARGIN, 49);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...PDF_COLORS.black);
      pdf.setFontSize(15);
      pdf.text(formatPatientDate(currentPatientInfo.date), valueX, 20);
      pdf.text(currentPatientInfo.lastName || ' ', valueX, 31);
      pdf.text(currentPatientInfo.firstName || ' ', 45, 49);

      pdf.setDrawColor(120, 120, 120);
      pdf.setLineDashPattern([1.2, 1.2], 0);
      pdf.line(valueX, 22, lineEndX, 22);
      pdf.line(valueX, 33, lineEndX, 33);
      pdf.line(45, 51, lineEndX, 51);
      pdf.setLineDashPattern([], 0);

      pdf.setTextColor(...PDF_COLORS.green);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text(title, PAGE_WIDTH / 2, 65, { align: 'center' });

      return 76;
    };

    const addFooter = () => {
      const footerTop = 241;

      pdf.setDrawColor(170, 226, 198);
      pdf.setFillColor(255, 255, 255);
      pdf.setLineWidth(0.8);
      pdf.circle(32, footerTop + 20, 17, 'S');
      pdf.setFillColor(...PDF_COLORS.blue);
      pdf.circle(32, footerTop + 20, 10, 'F');
      pdf.setTextColor(...PDF_COLORS.green);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text('+', 32, footerTop + 23, { align: 'center' });

      pdf.setDrawColor(...PDF_COLORS.blue);
      pdf.roundedRect(116, footerTop, 70, 18, 2, 2);
      pdf.setTextColor(...PDF_COLORS.blue);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(doctorInfo.name, 151, footerTop + 7, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(doctorInfo.specialty, 151, footerTop + 13, { align: 'center' });

      if (currentSignature) {
        try {
          pdf.addImage(currentSignature, 'PNG', 127, 259, 42, 22);
        } catch (error) {
          console.error('Signature rendering failed:', error);
        }
      }

      pdf.setDrawColor(...PDF_COLORS.black);
      pdf.line(124, 281, 178, 281);
      pdf.setTextColor(...PDF_COLORS.black);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('SIGNATURE', 151, 287, { align: 'center' });
    };

    const addInvoiceTableHeader = (startY: number) => {
      const x = PAGE_MARGIN;
      const widths = [92, 18, 28, 42];

      pdf.setFillColor(...PDF_COLORS.blue);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);

      pdf.rect(x, startY, widths[0], 10, 'F');
      pdf.rect(x + widths[0], startY, widths[1], 10, 'F');
      pdf.rect(x + widths[0] + widths[1], startY, widths[2], 10, 'F');
      pdf.rect(x + widths[0] + widths[1] + widths[2], startY, widths[3], 10, 'F');

      pdf.text('Désignation', x + 3, startY + 6.5);
      pdf.text('Qté', x + widths[0] + widths[1] / 2, startY + 6.5, { align: 'center' });
      pdf.text('Prix', x + widths[0] + widths[1] + widths[2] / 2, startY + 6.5, { align: 'center' });
      pdf.text('Montant', x + widths[0] + widths[1] + widths[2] + widths[3] - 3, startY + 6.5, { align: 'right' });

      return startY + 10;
    };

    const addInvoiceDocument = () => {
      const x = PAGE_MARGIN;
      const widths = [92, 18, 28, 42];
      let y = addHeader();
      y = addInvoiceTableHeader(y);

      const rows = invoiceItems.length > 0 ? invoiceItems : [{ id: 'empty', description: '', quantity: 0, price: 0 }];
      const visibleRows = rows.length < 6 ? [...rows, ...Array.from({ length: 6 - rows.length }, (_, index) => ({
        id: `pad-${index}`,
        description: '',
        quantity: 0,
        price: 0,
      }))] : rows;

      visibleRows.forEach((item, index) => {
        const descriptionLines = pdf.splitTextToSize(item.description || ' ', 84) as string[];
        const rowHeight = Math.max(10, descriptionLines.length * 5 + 4);

        y = ensureSpace(y, rowHeight + 16, () => addInvoiceTableHeader(addHeader()));

        if (index % 2 === 1) {
          pdf.setFillColor(...PDF_COLORS.rowAlt);
          pdf.rect(x, y, widths[0] + widths[1] + widths[2] + widths[3], rowHeight, 'F');
        }

        pdf.setDrawColor(...PDF_COLORS.lightBorder);
        pdf.rect(x, y, widths[0], rowHeight);
        pdf.rect(x + widths[0], y, widths[1], rowHeight);
        pdf.rect(x + widths[0] + widths[1], y, widths[2], rowHeight);
        pdf.rect(x + widths[0] + widths[1] + widths[2], y, widths[3], rowHeight);

        pdf.setTextColor(...PDF_COLORS.black);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.text(descriptionLines, x + 3, y + 6);
        pdf.text(item.description ? String(item.quantity) : '', x + widths[0] + widths[1] / 2, y + 6, { align: 'center' });
        pdf.text(item.description ? item.price.toLocaleString('fr-FR') : '', x + widths[0] + widths[1] + widths[2] / 2, y + 6, { align: 'center' });
        pdf.text(item.description ? (item.quantity * item.price).toLocaleString('fr-FR') : '', x + widths[0] + widths[1] + widths[2] + widths[3] - 3, y + 6, { align: 'right' });

        y += rowHeight;
      });

      y = ensureSpace(y, 20, addHeader);
      pdf.setDrawColor(...PDF_COLORS.blue);
      pdf.rect(118, y + 4, 28, 12);
      pdf.setFillColor(...PDF_COLORS.blue);
      pdf.rect(118, y + 4, 28, 12, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Total', 132, y + 12, { align: 'center' });

      pdf.setTextColor(...PDF_COLORS.black);
      pdf.setFontSize(14);
      pdf.text(`${calculateTotal().toLocaleString('fr-FR')} FCFA`, 190, y + 12, { align: 'right' });

      addFooter();
    };

    const addPrescriptionDocument = () => {
      let y = addHeader();

      if (currentPatientInfo.weight) {
        pdf.setTextColor(...PDF_COLORS.blue);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Poids :', 160, y, { align: 'right' });
        pdf.setTextColor(...PDF_COLORS.black);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(14);
        pdf.text(`${currentPatientInfo.weight} kg`, 190, y, { align: 'right' });
        y += 10;
      }

      medications.forEach((med) => {
        const medicineLabel = `${med.name} ${med.dosage}`.trim() || ' ';
        const posologyLabel = Object.entries(med.posology)
          .filter(([_, value]) => value)
          .map(([key]) => getPosologyLabel(key))
          .join(', ');

        y = ensureSpace(y, 18, addHeader);

        pdf.setTextColor(...PDF_COLORS.black);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text(medicineLabel, PAGE_WIDTH / 2, y, { align: 'center' });

        if (med.duration) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(12);
          pdf.text(med.duration, PAGE_WIDTH / 2, y + 7, { align: 'center' });
        }

        if (posologyLabel) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(12);
          pdf.text(posologyLabel, PAGE_WIDTH / 2, y + 14, { align: 'center' });
          y += 22;
        } else {
          y += 16;
        }
      });

      addFooter();
    };

    const addBulletinDocument = () => {
      let y = addHeader();

      bulletinItems.forEach((item) => {
        const lines = pdf.splitTextToSize(item || ' ', 155) as string[];
        const blockHeight = lines.length * 6 + 4;
        y = ensureSpace(y, blockHeight, addHeader);

        pdf.setTextColor(...PDF_COLORS.black);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(15);
        pdf.text(lines, PAGE_WIDTH / 2, y, { align: 'center' });
        y += blockHeight;
      });

      if (bulletinDiagnosis) {
        const diagnosisLines = pdf.splitTextToSize(bulletinDiagnosis, 145) as string[];
        const blockHeight = diagnosisLines.length * 6 + 12;
        y = ensureSpace(y, blockHeight, addHeader);

        pdf.setDrawColor(200, 220, 235);
        pdf.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);
        y += 8;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(...PDF_COLORS.blue);
        pdf.text('Diagnostic :', PAGE_MARGIN, y);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.setTextColor(...PDF_COLORS.black);
        pdf.text(diagnosisLines, PAGE_MARGIN + 28, y);
      }

      addFooter();
    };

    if (activeTab === 'invoice') {
      addInvoiceDocument();
    } else if (activeTab === 'prescription') {
      addPrescriptionDocument();
    } else {
      addBulletinDocument();
    }

    return pdf;
  };

  const savePdf = async (pdf: jsPDF, filename: string) => {
    const blob = pdf.output('blob');
    const file = new File([blob], `${filename}.pdf`, { type: 'application/pdf' });
    const canShareFiles =
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] });

    if (canShareFiles) {
      await navigator.share({
        files: [file],
        title: `${filename}.pdf`,
      });
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      const previewLink = document.createElement('a');
      previewLink.href = objectUrl;
      previewLink.target = '_blank';
      previewLink.rel = 'noopener noreferrer';
      document.body.appendChild(previewLink);
      previewLink.click();
      previewLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      return;
    }

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const generatePDF = async () => {
    if (isGeneratingPdf) return;

    try {
      setIsGeneratingPdf(true);
      const pdf = buildPdf();
      await savePdf(pdf, buildFileName());
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      console.error('PDF generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      window.alert(`Le telechargement du PDF a echoue: ${errorMessage}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto relative overflow-x-hidden">
      <div className="p-4 pt-8">
        <DoctorHeader info={doctorInfo} date={currentPatientInfo.date} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <PatientForm
              info={currentPatientInfo}
              onChange={updateActivePatientInfo}
              showWeight={activeTab === 'prescription'}
            />

            {activeTab === 'invoice' ? (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-medical-blue/10 overflow-hidden">
                  <div className="p-3 bg-medical-blue text-white flex justify-between items-center">
                    <h3 className="text-xs uppercase tracking-widest font-bold">Facture</h3>
                    <button type="button" onClick={addInvoiceItem} className="flex items-center gap-1 text-[10px] font-bold uppercase bg-white/20 px-2 py-1 rounded">
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>
                  <div className="divide-y divide-medical-blue/5">
                    {invoiceItems.map((item) => (
                      <div key={item.id} className="p-3 space-y-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                          placeholder="Désignation"
                          className="w-full text-sm font-hand text-lg outline-none bg-transparent border-b border-dotted border-medical-slate/20"
                        />
                        <div className="flex gap-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value, 10) || 0)}
                            className="w-16 text-sm outline-none bg-transparent border-b border-dotted border-medical-slate/20"
                            placeholder="Qté"
                          />
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateInvoiceItem(item.id, 'price', parseInt(e.target.value, 10) || 0)}
                            className="flex-1 text-sm outline-none bg-transparent border-b border-dotted border-medical-slate/20"
                            placeholder="Prix"
                          />
                          <button type="button" onClick={() => removeInvoiceItem(item.id)} className="text-red-300"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-medical-cyan/10 flex justify-between items-center">
                    <span className="text-xs uppercase font-bold text-medical-blue">Total</span>
                    <span className="text-lg font-bold text-medical-blue">{calculateTotal().toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>
            ) : activeTab === 'prescription' ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-medical-blue">Ordonnance</h3>
                  <button type="button" onClick={addMedication} className="flex items-center gap-1 text-[10px] font-bold uppercase text-medical-green">
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
                {medications.map((med) => (
                  <div key={med.id} className="bg-white p-4 rounded-xl shadow-sm border border-medical-blue/10 space-y-3">
                    <div className="flex justify-between gap-2">
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => updateMedication(med.id, 'name', e.target.value)}
                        placeholder="Médicament"
                        className="flex-1 font-hand text-lg outline-none border-b border-dotted border-medical-slate/20"
                      />
                      <button type="button" onClick={() => removeMedication(med.id)} className="text-red-300"><Trash2 size={16} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                        placeholder="Dosage"
                        className="text-sm outline-none border-b border-dotted border-medical-slate/20"
                      />
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => updateMedication(med.id, 'duration', e.target.value)}
                        placeholder="Durée"
                        className="text-sm outline-none border-b border-dotted border-medical-slate/20"
                      />
                    </div>
                    <div className="flex gap-1 pt-1">
                      {Object.entries(med.posology).map(([key, value]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateMedication(med.id, `posology.${key}`, !value)}
                          className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all ${
                            value ? 'bg-medical-green text-white' : 'bg-medical-slate/5 text-medical-slate/40'
                          }`}
                        >
                          {key === 'morning' ? 'Matin' : key === 'noon' ? 'Midi' : key === 'evening' ? 'Soir' : 'Nuit'}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-medical-blue">Bulletin Médical</h3>
                  <button type="button" onClick={addBulletinItem} className="flex items-center gap-1 text-[10px] font-bold uppercase text-medical-green">
                    <Plus size={14} /> Ajouter Examen
                  </button>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-medical-blue/10 space-y-3">
                  {bulletinItems.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateBulletinItem(index, e.target.value)}
                        placeholder="Examen..."
                        className="flex-1 font-hand text-lg outline-none border-b border-dotted border-medical-slate/20"
                      />
                      <button type="button" onClick={() => removeBulletinItem(index)} className="text-red-300"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <div className="pt-4">
                    <label className="text-[10px] uppercase font-bold text-medical-blue block mb-1">Diagnostic</label>
                    <textarea
                      value={bulletinDiagnosis}
                      onChange={(e) => setBulletinDiagnosis(e.target.value)}
                      className="w-full text-sm font-hand text-lg bg-medical-bg/50 rounded-lg p-2 outline-none focus:ring-1 focus:ring-medical-blue/20 min-h-[80px]"
                      placeholder="Visite médicale annuelle..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <SignatureCanvas onSave={saveActiveSignature} onClear={clearActiveSignature} />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-6">
              <button
                type="button"
                onClick={generatePDF}
                disabled={isGeneratingPdf}
                className="flex items-center justify-center gap-2 bg-medical-blue text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-medical-blue/20 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <Download size={18} /> {isGeneratingPdf ? 'Generation...' : 'PDF'}
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="flex items-center justify-center gap-2 bg-white text-medical-slate border border-medical-slate/10 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
              >
                <RotateCcw size={18} /> Reset
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-medical-blue/5 px-4 py-3 flex justify-around items-center z-50 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('invoice')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'invoice' ? 'text-medical-blue' : 'text-medical-slate/30'}`}
        >
          <Receipt size={20} />
          <span className="text-[9px] font-bold uppercase">Facture</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('prescription')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'prescription' ? 'text-medical-blue' : 'text-medical-slate/30'}`}
        >
          <Pill size={20} />
          <span className="text-[9px] font-bold uppercase">Ordonnance</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bulletin')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'bulletin' ? 'text-medical-blue' : 'text-medical-slate/30'}`}
        >
          <FileText size={20} />
          <span className="text-[9px] font-bold uppercase">Bulletin</span>
        </button>
      </nav>
    </div>
  );
}
