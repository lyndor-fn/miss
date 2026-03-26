import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, Pill, FileText, Plus, Trash2, Download, RotateCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { DoctorHeader } from './components/DoctorHeader';
import { PatientForm } from './components/PatientForm';
import { SignatureCanvas } from './components/SignatureCanvas';
import { DoctorInfo, PatientInfo, InvoiceItem, Medication } from './types';

const DEFAULT_DOCTOR: DoctorInfo = {
  name: 'Dr. ROKHAYA DIOP',
  specialty: 'Médecin généraliste',
  phone: '+221 774474590',
};

const createInitialPatient = (): PatientInfo => ({
  lastName: '',
  firstName: '',
  date: new Date().toISOString().split('T')[0],
  weight: '',
});

export default function App() {
  const [activeTab, setActiveTab] = useState<'invoice' | 'prescription' | 'bulletin'>('invoice');
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
  const pdfContentRef = useRef<HTMLDivElement>(null);
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

  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: any) => {
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

  const updateMedication = (id: string, field: string, value: any) => {
    setMedications((meds) => meds.map((med) => {
      if (med.id === id) {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          return { ...med, [parent]: { ...(med as any)[parent], [child]: value } };
        }
        return { ...med, [field]: value };
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
    return invoiceItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  };

  const generatePDF = async () => {
    const element = pdfContentRef.current;
    if (!element || isGeneratingPdf) return;

    let captureRoot: HTMLDivElement | null = null;

    try {
      setIsGeneratingPdf(true);

      if ('fonts' in document) {
        await document.fonts.ready;
      }

      captureRoot = document.createElement('div');
      captureRoot.style.position = 'fixed';
      captureRoot.style.top = '0';
      captureRoot.style.left = '-10000px';
      captureRoot.style.pointerEvents = 'none';
      captureRoot.style.background = '#FFFFFF';
      captureRoot.style.zIndex = '-1';
      captureRoot.style.opacity = '0';
      captureRoot.style.overflow = 'hidden';
      captureRoot.style.inset = '0';

      const clonedElement = element.cloneNode(true) as HTMLDivElement;
      clonedElement.style.position = 'relative';
      clonedElement.style.left = '0';
      clonedElement.style.top = '0';
      clonedElement.style.margin = '0 auto';
      captureRoot.appendChild(clonedElement);
      document.body.appendChild(captureRoot);

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        scrollX: 0,
        scrollY: 0,
        width: clonedElement.scrollWidth,
        height: clonedElement.scrollHeight,
        windowWidth: clonedElement.scrollWidth,
        windowHeight: clonedElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let remainingHeight = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        position = remainingHeight - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        remainingHeight -= pageHeight;
      }

      const fileName = [
        getDocumentTypeLabel(),
        sanitizeFileSegment(currentPatientInfo.lastName, 'nom'),
        sanitizeFileSegment(currentPatientInfo.firstName, 'prenom'),
        sanitizeFileSegment(currentPatientInfo.date || createInitialPatient().date, 'date'),
      ].join('_');

      const pdfBlob = pdf.output('blob');
      const objectUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error('PDF generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      window.alert(`Le telechargement du PDF a echoue: ${errorMessage}`);
    } finally {
      captureRoot?.remove();
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto relative overflow-x-hidden">
      {/* Hidden container for PDF generation */}
      <div className="absolute left-[-9999px] top-0">
        <div
          ref={pdfContentRef}
          id="pdf-content"
          style={{
            width: '794px',
            minHeight: '1123px',
            padding: '48px',
            backgroundColor: '#FFFFFF',
            color: '#1A1A1A',
            fontFamily: '"DM Sans", sans-serif',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '32px', marginBottom: '36px' }}>
            <div style={{ flex: 1, borderRight: '2px solid #004282', paddingRight: '24px' }}>
              <h1 style={{ margin: 0, color: '#004282', fontSize: '28px', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.1 }}>
                {doctorInfo.name}
              </h1>
              <p style={{ margin: '8px 0 16px', color: '#00A651', fontSize: '20px', fontWeight: 700 }}>
                {doctorInfo.specialty}
              </p>
              <p style={{ margin: 0, color: '#004282', fontSize: '24px', fontWeight: 700 }}>
                {doctorInfo.phone}
              </p>
            </div>
            <div style={{ flex: 1, paddingLeft: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <span style={{ color: '#004282', fontSize: '18px', fontWeight: 700 }}>DATE :</span>
                <span style={{ flex: 1, borderBottom: '2px dotted rgba(26,26,26,0.4)', paddingBottom: '4px', fontFamily: '"Caveat", cursive', fontSize: '30px' }}>
                  {formatPatientDate(currentPatientInfo.date)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#004282', fontSize: '18px', fontWeight: 700 }}>NOM :</span>
                <span style={{ flex: 1, borderBottom: '2px dotted rgba(26,26,26,0.4)', paddingBottom: '4px', fontFamily: '"Caveat", cursive', fontSize: '30px' }}>
                  {currentPatientInfo.lastName}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
            <span style={{ color: '#004282', fontSize: '18px', fontWeight: 700 }}>PRENOM :</span>
            <span style={{ flex: 1, borderBottom: '2px dotted rgba(26,26,26,0.4)', paddingBottom: '4px', fontFamily: '"Caveat", cursive', fontSize: '30px' }}>
              {currentPatientInfo.firstName}
            </span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <h2 style={{ display: 'inline-block', margin: 0, color: '#00A651', fontSize: '34px', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline' }}>
              {activeTab === 'invoice' ? 'Facture' : activeTab === 'prescription' ? 'Ordonnance' : 'Bulletin Médical'}
            </h2>
          </div>

          <div style={{ minHeight: '620px' }}>
            {activeTab === 'invoice' ? (
              <div style={{ border: '2px solid #004282', borderRadius: '18px', overflow: 'hidden', backgroundColor: '#F5FCFD' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#004282', color: '#FFFFFF' }}>
                      <th style={{ padding: '18px', borderRight: '1px solid rgba(255,255,255,0.2)', fontSize: '18px', textAlign: 'left' }}>Désignation</th>
                      <th style={{ padding: '18px', borderRight: '1px solid rgba(255,255,255,0.2)', fontSize: '18px', textAlign: 'center', width: '90px' }}>Qté</th>
                      <th style={{ padding: '18px', borderRight: '1px solid rgba(255,255,255,0.2)', fontSize: '18px', textAlign: 'center', width: '130px' }}>Prix</th>
                      <th style={{ padding: '18px', fontSize: '18px', textAlign: 'right', width: '160px' }}>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item, idx) => (
                      <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F0FAFC' }}>
                        <td style={{ padding: '18px', borderRight: '1px solid rgba(0,66,130,0.2)', fontFamily: '"Caveat", cursive', fontSize: '28px' }}>{item.description}</td>
                        <td style={{ padding: '18px', borderRight: '1px solid rgba(0,66,130,0.2)', fontFamily: '"Caveat", cursive', fontSize: '28px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '18px', borderRight: '1px solid rgba(0,66,130,0.2)', fontFamily: '"Caveat", cursive', fontSize: '28px', textAlign: 'center' }}>{item.price.toLocaleString()}</td>
                        <td style={{ padding: '18px', fontFamily: '"Caveat", cursive', fontSize: '28px', textAlign: 'right' }}>{(item.quantity * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 6 - invoiceItems.length) }).map((_, i) => (
                      <tr key={i} style={{ backgroundColor: (invoiceItems.length + i) % 2 === 0 ? '#FFFFFF' : '#F0FAFC' }}>
                        <td style={{ padding: '22px', borderRight: '1px solid rgba(0,66,130,0.2)' }} />
                        <td style={{ padding: '22px', borderRight: '1px solid rgba(0,66,130,0.2)' }} />
                        <td style={{ padding: '22px', borderRight: '1px solid rgba(0,66,130,0.2)' }} />
                        <td style={{ padding: '22px' }} />
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', padding: '20px', backgroundColor: '#FFFFFF', borderTop: '2px solid #004282' }}>
                  <div style={{ backgroundColor: '#004282', color: '#FFFFFF', padding: '10px 24px', borderRadius: '999px', fontSize: '22px', fontWeight: 700 }}>
                    Total
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 700 }}>{calculateTotal().toLocaleString()} FCFA</div>
                </div>
              </div>
            ) : activeTab === 'prescription' ? (
              <div>
                {currentPatientInfo.weight && (
                  <div style={{ textAlign: 'right', marginBottom: '28px' }}>
                    <span style={{ color: '#004282', fontSize: '22px', fontWeight: 700 }}>Poids :</span>{' '}
                    <span style={{ fontFamily: '"Caveat", cursive', fontSize: '30px' }}>{currentPatientInfo.weight} kg</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {medications.map((med) => (
                    <div key={med.id} style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', alignItems: 'baseline', marginBottom: '6px' }}>
                        <h4 style={{ margin: 0, fontFamily: '"Caveat", cursive', fontSize: '36px', fontWeight: 400 }}>
                          {med.name} {med.dosage}
                        </h4>
                        <span style={{ fontFamily: '"Caveat", cursive', fontSize: '32px' }}>{med.duration}</span>
                      </div>
                      <div style={{ fontFamily: '"Caveat", cursive', fontSize: '28px', color: 'rgba(26,26,26,0.85)' }}>
                        {Object.entries(med.posology)
                          .filter(([_, val]) => val)
                          .map(([key]) => getPosologyLabel(key))
                          .join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  {bulletinItems.map((item, idx) => (
                    <p key={idx} style={{ margin: 0, fontFamily: '"Caveat", cursive', fontSize: '36px' }}>{item}</p>
                  ))}
                </div>
                {bulletinDiagnosis && (
                  <div style={{ marginTop: '42px', paddingTop: '24px', borderTop: '2px solid rgba(0,66,130,0.12)' }}>
                    <p style={{ margin: 0, fontFamily: '"Caveat", cursive', fontSize: '32px' }}>
                      <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '22px', fontWeight: 700, textTransform: 'uppercase' }}>Diagnostic:</span>{' '}
                      {bulletinDiagnosis}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '999px', border: '3px solid rgba(0,166,81,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '999px', backgroundColor: '#004282', color: '#00A651', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', fontWeight: 700 }}>
                +
              </div>
            </div>

            <div style={{ width: '280px', textAlign: 'center' }}>
              <div style={{ border: '3px solid #004282', borderRadius: '8px', padding: '16px', marginBottom: '28px' }}>
                <p style={{ margin: 0, color: '#004282', fontSize: '20px', fontWeight: 700 }}>{doctorInfo.name}</p>
                <p style={{ margin: '6px 0 0', color: '#004282', fontSize: '18px', fontWeight: 700 }}>{doctorInfo.specialty}</p>
              </div>

              <div style={{ position: 'relative', paddingTop: '44px' }}>
                <div style={{ borderTop: '3px solid #1A1A1A', width: '220px', margin: '0 auto' }} />
                <p style={{ margin: '8px 0 0', fontSize: '20px', fontWeight: 700, letterSpacing: '0.08em' }}>SIGNATURE</p>
                {currentSignature && (
                  <img
                    src={currentSignature}
                    alt="Signature"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      height: '110px',
                      objectFit: 'contain',
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main UI */}
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
                    {invoiceItems.map(item => (
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
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-16 text-sm outline-none bg-transparent border-b border-dotted border-medical-slate/20"
                            placeholder="Qté"
                          />
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateInvoiceItem(item.id, 'price', parseInt(e.target.value) || 0)}
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
                {medications.map(med => (
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
                      {Object.entries(med.posology).map(([key, val]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateMedication(med.id, `posology.${key}`, !val)}
                          className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition-all ${
                            val ? 'bg-medical-green text-white' : 'bg-medical-slate/5 text-medical-slate/40'
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
                  {bulletinItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateBulletinItem(idx, e.target.value)}
                        placeholder="Examen..."
                        className="flex-1 font-hand text-lg outline-none border-b border-dotted border-medical-slate/20"
                      />
                      <button type="button" onClick={() => removeBulletinItem(idx)} className="text-red-300"><Trash2 size={16} /></button>
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

      {/* Bottom Navigation */}
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
